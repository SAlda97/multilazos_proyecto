import { useEffect, useMemo, useState } from "react";
import { SecurityStore, Rol, Permiso } from "./_securityStore";

export default function Roles(){
  const [q, setQ] = useState("");
  const [db, setDb] = useState(SecurityStore.getAll());
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Rol | null>(null);

  const [openPerms, setOpenPerms] = useState<null | number>(null); // id_rol
  const [permsSel, setPermsSel] = useState<number[]>([]);

  useEffect(()=>{ setDb(SecurityStore.getAll()); }, [open, openPerms]);

  const rows = db.roles.filter(r => [r.nombre_rol, r.descripcion ?? ""].join(" ").toLowerCase().includes(q.toLowerCase()));
  const totales = useMemo(()=>({registros: rows.length}),[rows]);

  function onNew(){ setEdit({id_rol:0, nombre_rol:"", descripcion:""}); setOpen(true); }
  function onEdit(r: Rol){ setEdit({...r}); setOpen(true); }
  function onDelete(id: number){ if(confirm("¿Eliminar rol? (UI)")) { SecurityStore.deleteRol(id); setDb(SecurityStore.getAll()); } }
  function onSave(e: React.FormEvent){ 
    e.preventDefault();
    if(!edit) return;
    if(edit.id_rol===0) SecurityStore.createRol({nombre_rol:edit.nombre_rol, descripcion:edit.descripcion});
    else SecurityStore.updateRol(edit);
    setOpen(false);
  }

  function openAsignarPermisos(r: Rol){
    const all = SecurityStore.getAll();
    const actuales = all.rol_permisos.filter(x=>x.id_rol===r.id_rol).map(x=>x.id_permiso);
    setPermsSel(actuales);
    setOpenPerms(r.id_rol);
  }
  function togglePerm(id_permiso:number){
    setPermsSel(p => p.includes(id_permiso)? p.filter(x=>x!==id_permiso) : [...p, id_permiso]);
  }
  function savePerms(){
    if(openPerms==null) return;
    SecurityStore.setPermisosDeRol(openPerms, permsSel);
    setOpenPerms(null);
  }

  return (
    <div style={{display:"grid",gap:"1rem"}}>
      <div className="card" style={{display:"grid",gridTemplateColumns:"1fr auto auto",gap:".6rem"}}>
        <input className="input" placeholder="Buscar rol…" value={q} onChange={e=>setQ(e.target.value)} />
        <button className="secondary" onClick={()=>setQ("")}>Limpiar</button>
        <button onClick={onNew}>+ Nuevo</button>
      </div>

      <div className="card" style={{display:"flex",gap:"1rem",alignItems:"center"}}>
        <b>Seguridad • Roles</b>
        <span style={{opacity:.7}}>Registros visibles: <b>{totales.registros}</b></span>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th style={{width:80}}>ID</th>
              <th>Rol</th>
              <th>Descripción</th>
              <th>Permisos</th>
              <th style={{width:260}}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r=>{
              const permisos = db.rol_permisos.filter(x=>x.id_rol===r.id_rol).map(x=>x.id_permiso);
              const codigos = db.permisos.filter(p=>permisos.includes(p.id_permiso)).map(p=>p.codigo).join(", ") || "—";
              return (
                <tr key={r.id_rol}>
                  <td>#{r.id_rol}</td>
                  <td>{r.nombre_rol}</td>
                  <td>{r.descripcion ?? "—"}</td>
                  <td>{codigos}</td>
                  <td style={{display:"flex",gap:".4rem"}}>
                    <button className="secondary" onClick={()=>openAsignarPermisos(r)}>Asignar permisos</button>
                    <button className="secondary" onClick={()=>onEdit(r)}>Editar</button>
                    <button className="warn" onClick={()=>onDelete(r.id_rol)}>Eliminar</button>
                  </td>
                </tr>
              );
            })}
            {rows.length===0 && <tr><td colSpan={5} style={{padding:"1rem"}}>Sin registros (UI).</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Modal CRUD */}
      {open && edit && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.25)",display:"grid",placeItems:"center",zIndex:50}}>
          <form className="card" onSubmit={onSave} style={{minWidth:380,width:"min(720px,95vw)"}}>
            <h3 style={{marginTop:0}}>{edit.id_rol===0?"Nuevo rol":"Editar rol"}</h3>
            <div style={{display:"grid",gap:".6rem"}}>
              <div>
                <label>Nombre del rol</label>
                <input className="input" value={edit.nombre_rol} onChange={e=>setEdit({...edit, nombre_rol:e.target.value})}/>
              </div>
              <div>
                <label>Descripción</label>
                <input className="input" value={edit.descripcion ?? ""} onChange={e=>setEdit({...edit, descripcion:e.target.value})}/>
              </div>
            </div>
            <div style={{display:"flex",gap:".6rem",justifyContent:"flex-end",marginTop:"1rem"}}>
              <button type="button" className="secondary" onClick={()=>setOpen(false)}>Cancelar</button>
              <button type="submit">Guardar</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal permisos */}
      {openPerms!=null && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.25)",display:"grid",placeItems:"center",zIndex:50}}>
          <div className="card" style={{minWidth:380,width:"min(720px,95vw)"}}>
            <h3 style={{marginTop:0}}>Asignar permisos</h3>
            <div style={{display:"grid",gap:".4rem"}}>
              {db.permisos.map((p: Permiso)=>(
                <label key={p.id_permiso} style={{display:"flex",gap:".5rem",alignItems:"center"}}>
                  <input type="checkbox" checked={permsSel.includes(p.id_permiso)} onChange={()=>togglePerm(p.id_permiso)}/>
                  <span><b>{p.codigo}</b> <span style={{opacity:.7}}>{p.descripcion}</span></span>
                </label>
              ))}
            </div>
            <div style={{display:"flex",gap:".6rem",justifyContent:"flex-end",marginTop:"1rem"}}>
              <button className="secondary" onClick={()=>setOpenPerms(null)}>Cancelar</button>
              <button onClick={savePerms}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
