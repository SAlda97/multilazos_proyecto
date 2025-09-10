import { useEffect, useMemo, useState } from "react";
import { SecurityStore, Usuario, Rol } from "./_securityStore";

export default function Usuarios() {
  const [q, setQ] = useState("");
  const [data, setData] = useState(SecurityStore.getAll());
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Usuario | null>(null);

  // Modal asignar roles
  const [openRoles, setOpenRoles] = useState<null | number>(null); // id_usuario
  const [rolesSel, setRolesSel] = useState<number[]>([]);

  useEffect(() => {
    setData(SecurityStore.getAll());
  }, [open, openRoles]);

  const usuarios = data.usuarios.filter(u =>
    [u.username, u.nombre_completo, u.activo ? "activo" : "inactivo"]
      .join(" ").toLowerCase().includes(q.toLowerCase())
  );

  const totales = useMemo(() => ({ registros: usuarios.length }), [usuarios]);

  function onNew() { setEdit({ id_usuario: 0, username: "", nombre_completo: "", activo: true }); setOpen(true); }
  function onEdit(u: Usuario) { setEdit({ ...u }); setOpen(true); }
  function onDelete(id: number) { if (confirm("¿Eliminar usuario? (UI)")) { SecurityStore.deleteUsuario(id); setData(SecurityStore.getAll()); } }
  function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!edit) return;
    if (edit.id_usuario === 0) {
      SecurityStore.createUsuario({ username: edit.username, nombre_completo: edit.nombre_completo, activo: edit.activo });
    } else {
      SecurityStore.updateUsuario(edit);
    }
    setOpen(false);
  }

  // Asignación de roles
  function openAsignarRoles(u: Usuario) {
    const db = SecurityStore.getAll();
    const actuales = db.usuario_roles.filter(x => x.id_usuario === u.id_usuario).map(x => x.id_rol);
    setRolesSel(actuales);
    setOpenRoles(u.id_usuario);
  }
  function toggleRole(id_rol: number) {
    setRolesSel(r => r.includes(id_rol) ? r.filter(x => x !== id_rol) : [...r, id_rol]);
  }
  function saveRoles() {
    if (openRoles == null) return;
    SecurityStore.setRolesDeUsuario(openRoles, rolesSel);
    setOpenRoles(null);
  }

  return (
    <div style={{display:"grid",gap:"1rem"}}>
      <div className="card" style={{display:"grid",gridTemplateColumns:"1fr auto auto",gap:".6rem"}}>
        <input className="input" placeholder="Buscar usuario…" value={q} onChange={e=>setQ(e.target.value)} />
        <button className="secondary" onClick={()=>setQ("")}>Limpiar</button>
        <button onClick={onNew}>+ Nuevo</button>
      </div>

      <div className="card" style={{display:"flex",gap:"1rem",alignItems:"center"}}>
        <b>Seguridad • Usuarios</b>
        <span style={{opacity:.7}}>Registros visibles: <b>{totales.registros}</b></span>
        <div style={{marginLeft:"auto",display:"flex",gap:".5rem"}}>
          <button className="secondary">Exportar CSV (UI)</button>
          <button className="secondary">Imprimir (UI)</button>
        </div>
      </div>

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
            {usuarios.map(u=>{
              const roles = data.usuario_roles.filter(x=>x.id_usuario===u.id_usuario).map(x=>x.id_rol);
              const nombres = data.roles.filter(r=>roles.includes(r.id_rol)).map(r=>r.nombre_rol).join(", ") || "—";
              return (
                <tr key={u.id_usuario}>
                  <td>#{u.id_usuario}</td>
                  <td>{u.username}</td>
                  <td>{u.nombre_completo}</td>
                  <td>
                    <span className={`badge ${u.activo ? "success" : "warn"}`}>
                      {u.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td>{nombres}</td>
                  <td style={{display:"flex",gap:".4rem"}}>
                    <button className="secondary" onClick={()=>openAsignarRoles(u)}>Asignar roles</button>
                    <button className="secondary" onClick={()=>onEdit(u)}>Editar</button>
                    <button className="warn" onClick={()=>onDelete(u.id_usuario)}>Eliminar</button>
                  </td>
                </tr>
              );
            })}
            {usuarios.length===0 && <tr><td colSpan={6} style={{padding:"1rem"}}>Sin registros (UI).</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Modal CRUD */}
      {open && edit && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.25)",display:"grid",placeItems:"center",zIndex:50}}>
          <form className="card" onSubmit={onSave} style={{minWidth:380,width:"min(720px,95vw)"}}>
            <h3 style={{marginTop:0}}>{edit.id_usuario===0?"Nuevo usuario":"Editar usuario"}</h3>
            <div style={{display:"grid",gap:".6rem"}}>
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
            </div>
            <div style={{display:"flex",gap:".6rem",justifyContent:"flex-end",marginTop:"1rem"}}>
              <button type="button" className="secondary" onClick={()=>setOpen(false)}>Cancelar</button>
              <button type="submit">Guardar</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Asignar roles */}
      {openRoles!=null && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.25)",display:"grid",placeItems:"center",zIndex:50}}>
          <div className="card" style={{minWidth:380,width:"min(720px,95vw)"}}>
            <h3 style={{marginTop:0}}>Asignar roles</h3>
            <div style={{display:"grid",gap:".4rem"}}>
              {data.roles.map((r: Rol)=>(
                <label key={r.id_rol} style={{display:"flex",gap:".5rem",alignItems:"center"}}>
                  <input type="checkbox" checked={rolesSel.includes(r.id_rol)} onChange={()=>toggleRole(r.id_rol)}/>
                  <span><b>{r.nombre_rol}</b> <span style={{opacity:.7}}>{r.descripcion}</span></span>
                </label>
              ))}
            </div>
            <div style={{display:"flex",gap:".6rem",justifyContent:"flex-end",marginTop:"1rem"}}>
              <button className="secondary" onClick={()=>setOpenRoles(null)}>Cancelar</button>
              <button onClick={saveRoles}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
