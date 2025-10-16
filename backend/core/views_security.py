# core/views_security.py
import json
from datetime import datetime
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse, HttpResponseNotAllowed, HttpResponseBadRequest, HttpResponseNotFound
from django.db import connection, IntegrityError
from django.utils import timezone
from django.contrib.auth.hashers import make_password, check_password

from .models_security import Usuario, Rol, Permiso, UsuarioRol, RolPermiso

def _json_body(request):
    try:
        return json.loads(request.body.decode('utf-8') or '{}')
    except Exception:
        return {}

# ---------- AUTH ----------
@csrf_exempt
def auth_login(request):
    if request.method != "POST":
        return HttpResponseNotAllowed(["POST"])
    body = _json_body(request)
    username = (body.get("username") or "").strip()
    password = (body.get("password") or "")

    if not username or not password:
        return HttpResponseBadRequest("usuario y contraseña son requeridos")

    try:
        u = Usuario.objects.get(username=username)
    except Usuario.DoesNotExist:
        # Unificamos el mensaje y el status para usuario inexistente
        return JsonResponse({"error": "Usuario inexistente"}, status=400)

    if not u.activo:
        # Unificamos el mensaje y el status para usuario inactivo
        return JsonResponse({"error": "Usuario inactivo"}, status=400)

    if not check_password(password, u.password_hash):
        return HttpResponseBadRequest("Credenciales inválidas")

    # roles y permisos del usuario
    with connection.cursor() as cur:
        cur.execute("""
            SELECT r.id_rol, r.nombre_rol
            FROM dbo.usuario_roles ur
            JOIN dbo.roles r ON r.id_rol = ur.id_rol
            WHERE ur.id_usuario = %s
        """, [u.id_usuario])
        roles = [{"id_rol": r[0], "nombre_rol": r[1]} for r in cur.fetchall()]

        cur.execute("""
            SELECT DISTINCT p.id_permiso, p.codigo
            FROM dbo.usuario_roles ur
            JOIN dbo.rol_permisos rp ON rp.id_rol = ur.id_rol
            JOIN dbo.permisos p ON p.id_permiso = rp.id_permiso
            WHERE ur.id_usuario = %s
        """, [u.id_usuario])
        permisos = [{"id_permiso": p[0], "codigo": p[1]} for p in cur.fetchall()]

    return JsonResponse({
        "id_usuario": u.id_usuario,
        "username": u.username,
        "nombre_completo": u.nombre_completo,
        "activo": u.activo,
        "roles": roles,
        "permisos": permisos,
    })

# ---------- USUARIOS ----------
@csrf_exempt
def usuarios_list_create(request):
    if request.method == "GET":
        q = (request.GET.get("q") or "").lower().strip()
        username = (request.GET.get("username") or "").lower().strip()
        nombre = (request.GET.get("nombre") or "").lower().strip()
        activo = request.GET.get("activo")  # '1' | '0' | None
        id_rol = request.GET.get("id_rol")

        # base query
        users = Usuario.objects.all()

        # filtros
        if username:
            users = [u for u in users if username in u.username.lower()]
        if nombre:
            users = [u for u in users if nombre in u.nombre_completo.lower()]
        if q:
            users = [u for u in users if q in f"{u.username} {u.nombre_completo} {'activo' if u.activo else 'inactivo'}".lower()]
        if activo in ("0", "1"):
            flag = activo == "1"
            users = [u for u in users if u.activo == flag]
        if id_rol:
            with connection.cursor() as cur:
                cur.execute("SELECT id_usuario FROM dbo.usuario_roles WHERE id_rol = %s", [int(id_rol)])
                ids_usuario = {r[0] for r in cur.fetchall()}
            users = [u for u in users if u.id_usuario in ids_usuario]

        # roles por usuario
        with connection.cursor() as cur:
            cur.execute("SELECT id_usuario, id_rol FROM dbo.usuario_roles")
            map_ur = {}
            for uid, rid in cur.fetchall():
                map_ur.setdefault(uid, []).append(rid)
            cur.execute("SELECT id_rol, nombre_rol FROM dbo.roles")
            map_rol = {r[0]: r[1] for r in cur.fetchall()}

        data = []
        for u in users:
            roles_ids = map_ur.get(u.id_usuario, [])
            roles_names = [map_rol.get(rid) for rid in roles_ids if rid in map_rol]
            data.append({
                "id_usuario": u.id_usuario,
                "username": u.username,
                "nombre_completo": u.nombre_completo,
                "activo": bool(u.activo),
                "roles": [{"id_rol": rid, "nombre_rol": map_rol.get(rid,"")} for rid in roles_ids],
                "roles_nombres": ", ".join([r for r in roles_names if r]) if roles_names else ""
            })
        return JsonResponse({"results": data})

    if request.method == "POST":
        body = _json_body(request)
        username = (body.get("username") or "").strip()
        nombre_completo = (body.get("nombre_completo") or "").strip()
        password = (body.get("password") or "").strip()  # opcional en update, requerido en create
        activo = bool(body.get("activo", True))
        if not username or not nombre_completo:
            return HttpResponseBadRequest("username y nombre_completo son requeridos")
        if not password:
            return HttpResponseBadRequest("password es requerido al crear")

        now = timezone.now()
        u = Usuario(
            username=username,
            password_hash=make_password(password),
            nombre_completo=nombre_completo,
            activo=activo,
            fecha_creacion=now,
            usuario_creacion="api",
            fecha_modificacion=None,
            usuario_modificacion=None,
        )
        # ORM sobre tabla managed=False no guarda automáticamente campos default; usamos raw SQL para insertar
        with connection.cursor() as cur:
            cur.execute("""
                INSERT INTO dbo.usuarios (username, password_hash, nombre_completo, activo, fecha_creacion, usuario_creacion)
                OUTPUT INSERTED.id_usuario
                VALUES (%s, %s, %s, %s, GETDATE(), SUSER_SNAME());
            """, [u.username, u.password_hash, u.nombre_completo, 1 if u.activo else 0])
            new_id = int(cur.fetchone()[0])
        return JsonResponse({"id_usuario": new_id}, status=201)

    return HttpResponseNotAllowed(["GET", "POST"])

@csrf_exempt
def usuarios_detail(request, id_usuario: int):
    if request.method not in ("GET", "PUT", "DELETE"):
        return HttpResponseNotAllowed(["GET", "PUT", "DELETE"])

    try:
        u = Usuario.objects.get(id_usuario=id_usuario)
    except Usuario.DoesNotExist:
        return HttpResponseNotFound("Usuario no encontrado")

    if request.method == "GET":
        return JsonResponse({
            "id_usuario": u.id_usuario,
            "username": u.username,
            "nombre_completo": u.nombre_completo,
            "activo": bool(u.activo),
        })

    if request.method == "PUT":
        body = _json_body(request)
        username = (body.get("username") or u.username).strip()
        nombre_completo = (body.get("nombre_completo") or u.nombre_completo).strip()
        activo = bool(body.get("activo", u.activo))
        password = body.get("password")  # opcional

        with connection.cursor() as cur:
            if password:
                cur.execute("""
                    UPDATE dbo.usuarios
                       SET username=%s,
                           nombre_completo=%s,
                           activo=%s,
                           password_hash=%s,
                           fecha_modificacion=GETDATE(),
                           usuario_modificacion=SUSER_SNAME()
                     WHERE id_usuario=%s
                """, [username, nombre_completo, 1 if activo else 0, make_password(password), id_usuario])
            else:
                cur.execute("""
                    UPDATE dbo.usuarios
                       SET username=%s,
                           nombre_completo=%s,
                           activo=%s,
                           fecha_modificacion=GETDATE(),
                           usuario_modificacion=SUSER_SNAME()
                     WHERE id_usuario=%s
                """, [username, nombre_completo, 1 if activo else 0, id_usuario])
        return JsonResponse({"ok": True})

    # DELETE
    with connection.cursor() as cur:
        cur.execute("DELETE FROM dbo.usuarios WHERE id_usuario=%s", [id_usuario])
    return JsonResponse({"ok": True})

@csrf_exempt
def usuarios_set_roles(request, id_usuario: int):
    if request.method != "POST":
        return HttpResponseNotAllowed(["POST"])
    body = _json_body(request)
    roles = body.get("roles") or []  # array de ids
    roles = [int(r) for r in roles if str(r).isdigit()]
    with connection.cursor() as cur:
        cur.execute("DELETE FROM dbo.usuario_roles WHERE id_usuario=%s", [id_usuario])
        for rid in roles:
            cur.execute("INSERT INTO dbo.usuario_roles (id_usuario, id_rol) VALUES (%s, %s)", [id_usuario, rid])
    return JsonResponse({"ok": True})

# ---------- ROLES ----------
@csrf_exempt
def roles_list_create(request):
    if request.method == "GET":
        q = (request.GET.get("q") or "").lower().strip()
        rows = Rol.objects.all()
        if q:
            rows = [r for r in rows if q in f"{r.nombre_rol} {r.descripcion or ''}".lower()]

        # Mapa de permisos por rol para enviar permisos_ids en el listado (evita flicker en el front)
        with connection.cursor() as cur:
            cur.execute("SELECT id_rol, id_permiso FROM dbo.rol_permisos")
            perm_map = {}
            for rid, pid in cur.fetchall():
                perm_map.setdefault(rid, []).append(pid)

        data = [{
            "id_rol": r.id_rol,
            "nombre_rol": r.nombre_rol,
            "descripcion": r.descripcion,
            "permisos_ids": perm_map.get(r.id_rol, [])
        } for r in rows]

        return JsonResponse({"results": data})

    if request.method == "POST":
        body = _json_body(request)
        nombre_rol = (body.get("nombre_rol") or "").strip()
        descripcion = (body.get("descripcion") or "").strip() or None
        if not nombre_rol:
            return HttpResponseBadRequest("nombre_rol requerido")
        with connection.cursor() as cur:
            cur.execute("""
                INSERT INTO dbo.roles (nombre_rol, descripcion)
                OUTPUT INSERTED.id_rol
                VALUES (%s, %s);
            """, [nombre_rol, descripcion])
            new_id = int(cur.fetchone()[0])
        return JsonResponse({"id_rol": new_id}, status=201)

    return HttpResponseNotAllowed(["GET", "POST"])

@csrf_exempt
def roles_detail(request, id_rol: int):
    if request.method not in ("GET", "PUT", "DELETE"):
        return HttpResponseNotAllowed(["GET", "PUT", "DELETE"])
    try:
        r = Rol.objects.get(id_rol=id_rol)
    except Rol.DoesNotExist:
        return HttpResponseNotFound("Rol no encontrado")

    if request.method == "GET":
        # Incluir permisos_ids también en el detalle (para fallback del front)
        with connection.cursor() as cur:
            cur.execute("SELECT id_permiso FROM dbo.rol_permisos WHERE id_rol=%s", [id_rol])
            permisos_ids = [row[0] for row in cur.fetchall()]
        return JsonResponse({
            "id_rol": r.id_rol,
            "nombre_rol": r.nombre_rol,
            "descripcion": r.descripcion,
            "permisos_ids": permisos_ids
        })

    if request.method == "PUT":
        body = _json_body(request)
        nombre_rol = (body.get("nombre_rol") or r.nombre_rol).strip()
        descripcion = (body.get("descripcion") or "").strip() or None
        with connection.cursor() as cur:
            cur.execute("UPDATE dbo.roles SET nombre_rol=%s, descripcion=%s WHERE id_rol=%s",
                        [nombre_rol, descripcion, id_rol])
        return JsonResponse({"ok": True})

    with connection.cursor() as cur:
        cur.execute("DELETE FROM dbo.roles WHERE id_rol=%s", [id_rol])
    return JsonResponse({"ok": True})

@csrf_exempt
def roles_set_permisos(request, id_rol: int):
    if request.method != "POST":
        return HttpResponseNotAllowed(["POST"])
    body = _json_body(request)
    permisos = body.get("permisos") or []
    permisos = [int(p) for p in permisos if str(p).isdigit()]
    with connection.cursor() as cur:
        cur.execute("DELETE FROM dbo.rol_permisos WHERE id_rol=%s", [id_rol])
        for pid in permisos:
            cur.execute("INSERT INTO dbo.rol_permisos (id_rol, id_permiso) VALUES (%s, %s)", [id_rol, pid])
    return JsonResponse({"ok": True})

# ---------- PERMISOS ----------
@csrf_exempt
def permisos_list_create(request):
    """
    GET  /seguridad/permisos/     -> lista permisos
    POST /seguridad/permisos/     -> crea permiso {codigo, descripcion?}
    """
    if request.method == "GET":
        # filtros opcionales
        q = (request.GET.get("q") or "").strip()
        codigo = (request.GET.get("codigo") or "").strip()
        descripcion = (request.GET.get("descripcion") or "").strip()

        where = []
        params = []

        if q:
            where.append("(p.codigo LIKE %s OR COALESCE(p.descripcion,'') LIKE %s)")
            like = f"%{q}%"
            params.extend([like, like])

        if codigo:
            where.append("p.codigo = %s")
            params.append(codigo)

        if descripcion:
            where.append("COALESCE(p.descripcion,'') LIKE %s")
            params.append(f"%{descripcion}%")

        sql = """
            SELECT p.id_permiso, p.codigo, p.descripcion
            FROM dbo.permisos p
        """
        if where:
            sql += " WHERE " + " AND ".join(where)
        sql += " ORDER BY p.id_permiso DESC"

        with connection.cursor() as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()

        data = [
            {"id_permiso": r[0], "codigo": r[1], "descripcion": r[2]}
            for r in rows
        ]
        return JsonResponse(data, safe=False)


    if request.method == "POST":
        try:
            body = json.loads(request.body or "{}")
        except json.JSONDecodeError:
            return JsonResponse({"error": "JSON inválido"}, status=400)

        codigo = (body.get("codigo") or "").strip()
        descripcion = (body.get("descripcion") or None)
        if not codigo:
            return JsonResponse({"error": "El campo 'codigo' es requerido."}, status=400)

        try:
            with connection.cursor() as cur:
                # Usar OUTPUT INSERTED para obtener el id en la misma sentencia y evitar SCOPE_IDENTITY()
                cur.execute("""
                    SET NOCOUNT ON;
                    INSERT INTO dbo.permisos (codigo, descripcion)
                    OUTPUT INSERTED.id_permiso
                    VALUES (%s, %s);
                """, [codigo, descripcion])
                new_row = cur.fetchone()
                new_id = int(new_row[0])

                # Traer el registro creado para responder
                cur.execute("""
                    SELECT id_permiso, codigo, descripcion
                    FROM dbo.permisos
                    WHERE id_permiso = %s
                """, [new_id])
                row = cur.fetchone()

            return JsonResponse(
                {"id_permiso": row[0], "codigo": row[1], "descripcion": row[2]},
                status=201
            )

        except IntegrityError:
            # Violación de UNIQUE (codigo duplicado)
            return JsonResponse({"error": "El código de permiso ya existe."}, status=409)

        except Exception as e:
            # Error no previsto: devolvemos detalle para diagnóstico
            return JsonResponse({"error": "Error al crear permiso.", "detail": str(e)}, status=500)

    return HttpResponseNotAllowed(["GET", "POST"])

@csrf_exempt
def permisos_detail(request, id_permiso: int):
    if request.method not in ("GET", "PUT", "DELETE"):
        return HttpResponseNotAllowed(["GET", "PUT", "DELETE"])
    try:
        p = Permiso.objects.get(id_permiso=id_permiso)
    except Permiso.DoesNotExist:
        return HttpResponseNotFound("Permiso no encontrado")

    if request.method == "GET":
        return JsonResponse({"id_permiso": p.id_permiso, "codigo": p.codigo, "descripcion": p.descripcion})

    if request.method == "PUT":
        body = _json_body(request)
        codigo = (body.get("codigo") or p.codigo).strip()
        descripcion = (body.get("descripcion") or "").strip() or None
        with connection.cursor() as cur:
            cur.execute("UPDATE dbo.permisos SET codigo=%s, descripcion=%s WHERE id_permiso=%s",
                        [codigo, descripcion, id_permiso])
        return JsonResponse({"ok": True})

    with connection.cursor() as cur:
        cur.execute("DELETE FROM dbo.permisos WHERE id_permiso=%s", [id_permiso])
    return JsonResponse({"ok": True})
