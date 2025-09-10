import { useEffect, useMemo, useState } from "react";
import { SecurityStore, Permiso } from "./_securityStore";

export default function Permisos(){
  const [q, setQ] = useState("");
  const [db, setDb] = useState(SecurityStore.getAll());
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Permiso | null>(null);

  useEffect(()=>{ setDb(SecurityStore.getAll()); }, [open]);

  const rows = db.permisos.filter(p => [p.codigo, p.descripcion ?? ""].join(" ").toLowerCase().includes(q.toLowerCase()));
  const totales = useMemo(()=>({registros: rows.length}),[rows]);

  function onNew(){ setEdit({id_permiso:0, codigo:"", descripcion:""}); setOpen(true); }
  function onEdit(p: Permiso){ setEdit({...p}); setOpen(true); }
  function onDelete(id:number){ if(confirm("¿Eliminar permiso? (UI)")) { SecurityStore.deletePermiso(id); setDb(SecurityStore.getAll()); } }
  function onSave(e: React.FormEvent){
    e.preventDefault();
    if(!edit) return;
    if(edit.id_permiso===0) SecurityStore.createPermiso({codigo:edit.codigo, descripcion:edit.descripcion});
    else SecurityStore.updatePermiso(edit);
    setOpen(false);
  }

  return (
    <div style={{display:"grid",gap:"1rem"}}>
      <div className="card" style={{display:"grid",gridTemplateColumns:"1fr auto auto",gap:".6rem"}}>
        <input className="input" placeholder="Buscar permiso…" value={q} onChange={e=>setQ(e.target.value)} />
        <button className="secondary" onClick={()=>setQ("")}>Limpiar</button>
        <button onClick={onNew}>+ Nuevo</button>
      </div>

      <div className="card" style={{display:"flex",gap:"1rem",alignItems:"center"}}>
        <b>Seguridad • Permisos</b>
        <span style={{opacity:.7}}>Registros visibles: <b>{totales.registros}</b></span>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th style={{width:80}}>ID</th>
              <th>Código</th>
              <th>Descripción</th>
              <th style={{width:220}}></th>
            </tr>
          </thead>
        <tbody>
          {rows.map(p=>(
            <tr key={p.id_permiso}>
              <td>#{p.id_permiso}</td>
              <td><code>{p.codigo}</code></td>
              <td>{p.descripcion ?? "—"}</td>
              <td style={{display:"flex",gap:".4rem"}}>
                <button className="secondary" onClick={()=>onEdit(p)}>Editar</button>
                <button className="warn" onClick={()=>onDelete(p.id_permiso)}>Eliminar</button>
              </td>
            </tr>
          ))}
          {rows.length===0 && <tr><td colSpan={4} style={{padding:"1rem"}}>Sin registros (UI).</td></tr>}
        </tbody>
        </table>
      </div>

      {/* Modal CRUD */}
      {open && edit && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.25)",display:"grid",placeItems:"center",zIndex:50}}>
          <form className="card" onSubmit={onSave} style={{minWidth:380,width:"min(720px,95vw)"}}>
            <h3 style={{marginTop:0}}>{edit.id_permiso===0?"Nuevo permiso":"Editar permiso"}</h3>
            <div style={{display:"grid",gap:".6rem"}}>
              <div>
                <label>Código (ej: VENTAS_LEER)</label>
                <input className="input" value={edit.codigo} onChange={e=>setEdit({...edit, codigo:e.target.value})}/>
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
    </div>
  );
}
