// src/pages/seguridad/Usuarios.tsx
import { useEffect, useMemo, useState } from "react";
import { listUsuarios, createUsuario, updateUsuario, deleteUsuario, setRolesUsuario } from "../../services/usuarios";
import { listRoles } from "../../services/roles";
import type { UsuarioDTO, RolDTO } from "../../types/security";
import { exportTableToPDF } from "../../utils/exportPdf";

type Filtros = {
  q: string;
  username: string;
  nombre: string;
  activo: "" | "1" | "0";
  id_rol: string; // como texto en UI
};

export default function Usuarios() {
  const [f, setF] = useState<Filtros>({ q:"", username:"", nombre:"", activo:"", id_rol:"" });
  const [usuarios, setUsuarios] = useState<UsuarioDTO[]>([]);
  const [roles, setRoles] = useState<RolDTO[]>([]);
  const [loading, setLoading] = useState(false);

  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<null | { id_usuario: number; username: string; nombre_completo: string; activo: boolean; password?: string }> (null);

  const [openRoles, setOpenRoles] = useState<null | number>(null);
  const [rolesSel, setRolesSel] = useState<number[]>([]);

  async function load(){
    setLoading(true);
    try{
      const [us, ro] = await Promise.all([
        listUsuarios({
          q: f.q || undefined,
          username: f.username || undefined,
          nombre: f.nombre || undefined,
          activo: f.activo==="" ? undefined : (f.activo as any),
          id_rol: f.id_rol ? Number(f.id_rol) : undefined
        }),
        listRoles()
      ]);
      setUsuarios(us);
      setRoles(ro);
    } finally { setLoading(false); }
  }
  useEffect(()=>{ load(); }, []); // init
  useEffect(()=>{ load(); }, [f.q, f.username, f.nombre, f.activo, f.id_rol]); // vivo

  const totales = useMemo(()=>({registros: usuarios.length}), [usuarios]);

  function onNew(){
    setEdit({ id_usuario:0, username:"", nombre_completo:"", activo:true, password:"" });
    setOpen(true);
  }
  function onEditRow(u: UsuarioDTO){
    setEdit({ id_usuario:u.id_usuario, username:u.username, nombre_completo:u.nombre_completo, activo:u.activo });
    setOpen(true);
  }
  async function onDeleteRow(id:number){
    if(!confirm("¿Eliminar usuario?")) return;
    try{
      await deleteUsuario(id);
      await load();
    }catch{
      alert("No se pudo eliminar el usuario.");
    }
  }
  async function onSave(e:React.FormEvent){
    e.preventDefault();
    if(!edit) return;

    const isCreate = edit.id_usuario === 0;
    if (!confirm(isCreate ? "¿Crear usuario?" : "¿Guardar cambios del usuario?")) return;

    try{
      if(isCreate){
        if(!edit.password || !edit.password.trim()){
          alert("Debe ingresar contraseña al crear."); return;
        }
        await createUsuario({
          username: edit.username.trim(),
          nombre_completo: edit.nombre_completo.trim(),
          password: edit.password,
          activo: !!edit.activo
        });
      } else {
        const payload:any = {
          username: edit.username.trim(),
          nombre_completo: edit.nombre_completo.trim(),
          activo: !!edit.activo
        };
        if(edit.password && edit.password.trim()) payload.password = edit.password;
        await updateUsuario(edit.id_usuario, payload);
      }
      setOpen(false);
      await load();
    }catch{
      alert("No se pudo guardar el usuario. Inténtalo nuevamente.");
    }
  }

  // Asignación de roles
  function openAsignarRoles(u: UsuarioDTO){
    setOpenRoles(u.id_usuario);
    setRolesSel((u.roles||[]).map(r=>r.id_rol));
  }
  function toggleRole(id_rol:number){
    setRolesSel(prev => prev.includes(id_rol) ? prev.filter(x=>x!==id_rol) : [...prev, id_rol]);
  }
  async function saveRoles(){
    if(openRoles==null) return;
    if (!confirm("¿Guardar roles asignados a este usuario?")) return;

    try{
      await setRolesUsuario(openRoles, rolesSel);
      setOpenRoles(null);
      await load();
    }catch{
      alert("No se pudieron guardar los roles.");
    }
  }

  function limpiar(){ setF({ q:"", username:"", nombre:"", activo:"", id_rol:"" }); }

  function exportPDF(){
    if (!confirm("¿Exportar usuarios a PDF?")) return;

    const headers = ["ID","Usuario","Nombre completo","Estado","Roles"];
    const rows = usuarios.map(u=>[
      `#${u.id_usuario}`,
      u.username,
      u.nombre_completo,
      u.activo ? "Activo" : "Inactivo",
      u.roles_nombres || "—"
    ]);
    try{
      exportTableToPDF({
        title: "Seguridad • Usuarios",
        headers, rows,
        footerNote: `Registros: ${usuarios.length}`
      });
    }catch{
      alert("No se pudo exportar el PDF.");
    }
  }

  return (
    <div style={{display:"grid",gap:"1rem"}}>
      {/* Filtros */}
      <div className="card" style={{display:"grid", gap:".6rem"}}>
        <div style={{display:"grid", gridTemplateColumns:"1fr 220px 260px 140px 200px", gap:".6rem"}}>
          <input className="input" placeholder="Buscar (usuario/nombre/estado)…" value={f.q} onChange={e=>setF({...f, q:e.target.value})}/>
          <input className="input" placeholder="Usuario" value={f.username} onChange={e=>setF({...f, username:e.target.value})}/>
          <input className="input" placeholder="Nombre completo" value={f.nombre} onChange={e=>setF({...f, nombre:e.target.value})}/>
          <select className="select" value={f.activo} onChange={e=>setF({...f, activo:e.target.value as ""|"1"|"0"})}>
            <option value="">Estado</option>
            <option value="1">Activo</option>
            <option value="0">Inactivo</option>
          </select>
          <select className="select" value={f.id_rol} onChange={e=>setF({...f, id_rol:e.target.value})}>
            <option value="">Rol</option>
            {roles.map(r=><option key={r.id_rol} value={r.id_rol}>{r.nombre_rol}</option>)}
          </select>
        </div>
        <div style={{display:"flex", gap:".6rem", justifyContent:"flex-end"}}>
          <button className="secondary" onClick={limpiar} disabled={loading}>Limpiar</button>
          <button onClick={onNew} disabled={loading}>+ Nuevo</button>
          <button className="secondary" onClick={exportPDF} disabled={loading}>Exportar PDF</button>
        </div>
      </div>

      {/* Header / totales */}
      <div className="card" style={{display:"flex",gap:"1rem",alignItems:"center"}}>
        <b>Seguridad • Usuarios</b>
        <span style={{opacity:.7}}>Registros visibles: <b>{totales.registros}</b></span>
        <div style={{marginLeft:"auto"}}>{loading ? "Cargando…" : ""}</div>
      </div>

      {/* Tabla */}
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th style={{width:80}}>ID</th>
              <th>Usuario</th>
              <th>Nombre completo</th>
              <th>Estado</th>
              <th>Roles</th>
              <th style={{width:260}}></th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map(u=>(
              <tr key={u.id_usuario}>
                <td>#{u.id_usuario}</td>
                <td>{u.username}</td>
                <td>{u.nombre_completo}</td>
                <td>
                  <span className={`badge ${u.activo ? "success" : "warn"}`}>{u.activo ? "Activo" : "Inactivo"}</span>
                </td>
                <td>{u.roles_nombres || "—"}</td>
                <td style={{display:"flex", gap:".4rem"}}>
                  <button className="secondary" onClick={()=>openAsignarRoles(u)}>Asignar roles</button>
                  <button className="secondary" onClick={()=>onEditRow(u)}>Editar</button>
                  <button className="warn" onClick={()=>onDeleteRow(u.id_usuario)}>Eliminar</button>
                </td>
              </tr>
            ))}
            {usuarios.length===0 && <tr><td colSpan={6} style={{padding:"1rem"}}>Sin registros.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Modal CRUD */}
      {open && edit && (
        <div style={{position:"fixed", inset:0, background:"rgba(0,0,0,.25)", display:"grid", placeItems:"center", zIndex:50}}>
          <form className="card" onSubmit={onSave} style={{minWidth:380, width:"min(720px,95vw)"}}>
            <h3 style={{marginTop:0}}>{edit.id_usuario===0 ? "Nuevo usuario" : "Editar usuario"}</h3>
            <div style={{display:"grid", gap:".6rem"}}>
              <div>
                <label>Usuario</label>
                <input className="input" value={edit.username} onChange={e=>setEdit({...edit, username:e.target.value})}/>
              </div>
              <div>
                <label>Nombre completo</label>
                <input className="input" value={edit.nombre_completo} onChange={e=>setEdit({...edit, nombre_completo:e.target.value})}/>
              </div>
              <div>
                <label>Estado</label>
                <select className="select" value={edit.activo?1:0} onChange={e=>setEdit({...edit, activo:Number(e.target.value)===1})}>
                  <option value={1}>Activo</option>
                  <option value={0}>Inactivo</option>
                </select>
              </div>
              <div>
                <label>{edit.id_usuario===0 ? "Contraseña" : "Nueva contraseña (opcional)"}</label>
                <input className="input" type="password" value={edit.password ?? ""} onChange={e=>setEdit({...edit, password:e.target.value})}/>
              </div>
            </div>
            <div style={{display:"flex", gap:".6rem", justifyContent:"flex-end", marginTop:"1rem"}}>
              <button type="button" className="secondary" onClick={()=>setOpen(false)}>Cancelar</button>
              <button type="submit">Guardar</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Asignar roles */}
      {openRoles!=null && (
        <div style={{position:"fixed", inset:0, background:"rgba(0,0,0,.25)", display:"grid", placeItems:"center", zIndex:50}}>
          <div className="card" style={{minWidth:380, width:"min(720px,95vw)"}}>
            <h3 style={{marginTop:0}}>Asignar roles</h3>
            <div style={{display:"grid", gap:".4rem"}}>
              {roles.map(r=>(
                <label key={r.id_rol} style={{display:"flex", gap:".5rem", alignItems:"center"}}>
                  <input type="checkbox" checked={rolesSel.includes(r.id_rol)} onChange={()=>toggleRole(r.id_rol)}/>
                  <span><b>{r.nombre_rol}</b> <span style={{opacity:.7}}>{r.descripcion ?? ""}</span></span>
                </label>
              ))}
            </div>
            <div style={{display:"flex", gap:".6rem", justifyContent:"flex-end", marginTop:"1rem"}}>
              <button className="secondary" onClick={()=>setOpenRoles(null)}>Cancelar</button>
              <button onClick={saveRoles}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
