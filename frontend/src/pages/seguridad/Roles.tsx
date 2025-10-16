// src/pages/seguridad/Roles.tsx
import { useEffect, useMemo, useState } from "react";
import { listRoles, createRol, updateRol, deleteRol, setPermisosRol } from "../../services/roles";
import { listPermisos } from "../../services/permisos";
import type { RolDTO, PermisoDTO } from "../../types/security";
import { exportTableToPDF } from "../../utils/exportPdf";

export default function Roles(){
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<RolDTO[]>([]);
  const [permisos, setPermisos] = useState<PermisoDTO[]>([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<RolDTO | null>(null);

  const [openPerms, setOpenPerms] = useState<null | number>(null);
  const [permsSel, setPermsSel] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  async function load(){
    setLoading(true);
    try{
      const [rl, pm] = await Promise.all([listRoles({ q }), listPermisos()]);
      setRows(rl); setPermisos(pm);
    } finally { setLoading(false); }
  }
  useEffect(()=>{ load(); }, [q]);

  const totales = useMemo(()=>({registros: rows.length}),[rows]);

  function onNew(){ setEdit({id_rol:0, nombre_rol:"", descripcion:""}); setOpen(true); }
  function onEditRow(r: RolDTO){ setEdit({...r}); setOpen(true); }
  async function onDeleteRow(id:number){ if(!confirm("¿Eliminar rol?")) return; await deleteRol(id); await load(); }

  async function onSave(e: React.FormEvent){
    e.preventDefault();
    if(!edit) return;
    const isCreate = edit.id_rol === 0;
    if (!confirm(isCreate ? "¿Crear rol?" : "¿Guardar cambios del rol?")) return;

    if(isCreate) await createRol({ nombre_rol: edit.nombre_rol, descripcion: edit.descripcion ?? null });
    else await updateRol(edit.id_rol, { nombre_rol: edit.nombre_rol, descripcion: edit.descripcion ?? null });

    setOpen(false);
    await load();
  }

  async function openAsignarPermisos(r: RolDTO){
    setOpenPerms(r.id_rol);

    // 1) Intento con datos embebidos en el rol
    const pre1 = (r as any)?.permisos_ids as number[] | undefined;
    const pre2 = (r as any)?.permisos as { id_permiso: number }[] | undefined;
    if (Array.isArray(pre1) && pre1.length) {
      setPermsSel(pre1);
      return;
    } else if (Array.isArray(pre2) && pre2.length) {
      setPermsSel(pre2.map(x => x.id_permiso));
      return;
    }

    // 2) Si no hay nada embebido, consulto el detalle del rol esperando permisos_ids
    try{
      const base = (import.meta as any).env?.VITE_API_BASE_URL || "";
      const res = await fetch(`${base}/seguridad/roles/${r.id_rol}/`, { method: "GET" });
      if(res.ok){
        const json = await res.json();
        const ids = Array.isArray(json?.permisos_ids) ? json.permisos_ids as number[] : [];
        setPermsSel(ids);
      }else{
        setPermsSel([]); // fallback
      }
    }catch{
      setPermsSel([]); // fallback
    }
  }

  function togglePerm(id_permiso:number){
    setPermsSel(p => p.includes(id_permiso) ? p.filter(x=>x!==id_permiso) : [...p, id_permiso]);
  }

  async function savePerms(){
    if(openPerms==null) return;
    if (!confirm("¿Guardar permisos asignados a este rol?")) return;
    await setPermisosRol(openPerms, permsSel);
    setOpenPerms(null);
    await load();
  }

  function exportPDF(){
    if (!confirm("¿Exportar roles a PDF?")) return;
    const headers = ["ID","Rol","Descripción"];
    const body = rows.map(r=>[`#${r.id_rol}`, r.nombre_rol, r.descripcion ?? "—"]);
    exportTableToPDF({ title:"Seguridad • Roles", headers, rows: body, footerNote:`Registros: ${rows.length}` });
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
        <div style={{marginLeft:"auto"}}>
          <button className="secondary" onClick={exportPDF} disabled={loading}>Exportar PDF</button>
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th style={{width:80}}>ID</th>
              <th>Rol</th>
              <th>Descripción</th>
              <th style={{width:260}}></th>
            </tr>
          </thead>
        <tbody>
          {rows.map(r=>(
            <tr key={r.id_rol}>
              <td>#{r.id_rol}</td>
              <td>{r.nombre_rol}</td>
              <td>{r.descripcion ?? "—"}</td>
              <td style={{display:"flex",gap:".4rem"}}>
                <button className="secondary" onClick={()=>openAsignarPermisos(r)}>Asignar permisos</button>
                <button className="secondary" onClick={()=>onEditRow(r)}>Editar</button>
                <button className="warn" onClick={()=>onDeleteRow(r.id_rol)}>Eliminar</button>
              </td>
            </tr>
          ))}
          {rows.length===0 && <tr><td colSpan={4} style={{padding:"1rem"}}>Sin registros.</td></tr>}
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
              {permisos.map(p=>(
                <label key={p.id_permiso} style={{display:"flex",gap:".5rem",alignItems:"center"}}>
                  <input
                    type="checkbox"
                    checked={permsSel.includes(p.id_permiso)}
                    onChange={()=>togglePerm(p.id_permiso)}
                  />
                  <span><b>{p.codigo}</b> <span style={{opacity:.7}}>{p.descripcion ?? ""}</span></span>
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
