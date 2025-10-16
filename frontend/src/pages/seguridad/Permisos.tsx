// src/pages/seguridad/Permisos.tsx
import { useEffect, useMemo, useState } from "react";
import { listPermisos, createPermiso, updatePermiso, deletePermiso } from "../../services/permisos";
import type { PermisoDTO } from "../../types/security";
import { exportTableToPDF } from "../../utils/exportPdf";

type Filtros = { q: string; codigo: string; descripcion: string; };

export default function Permisos(){
  const [f, setF] = useState<Filtros>({ q:"", codigo:"", descripcion:"" });
  const [rows, setRows] = useState<PermisoDTO[]>([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<PermisoDTO | null>(null);
  const [loading, setLoading] = useState(false);

  async function load(){
    setLoading(true);
    try{
      const data = await listPermisos({
        q: f.q || undefined,
        codigo: f.codigo || undefined,
        descripcion: f.descripcion || undefined
      });
      // 👇 CAMBIO 1: siempre coaccionar a arreglo
      setRows(Array.isArray(data) ? data : []);
    } finally { setLoading(false); }
  }
  useEffect(()=>{ load(); }, [f.q, f.codigo, f.descripcion]);

  // 👇 CAMBIO 2: totales seguro aunque rows sea undefined (no debería, pero por si acaso)
  const totales = useMemo(()=>({registros: (rows?.length ?? 0)}),[rows]);

  function onNew(){ setEdit({id_permiso:0, codigo:"", descripcion:""}); setOpen(true); }
  function onEditRow(p: PermisoDTO){ setEdit({...p}); setOpen(true); }
  async function onDeleteRow(id:number){ if(!confirm("¿Eliminar permiso?")) return; await deletePermiso(id); await load(); }
  async function onSave(e: React.FormEvent){
    e.preventDefault();
    if (!edit) return;

    // ✅ CONFIRMACIÓN ANTES DE GUARDAR (nuevo / editar)
    const isNew = edit.id_permiso === 0;
    const ok = confirm(isNew ? "¿Guardar nuevo permiso?" : "¿Guardar cambios del permiso?");
    if (!ok) return;

    try {
      if (isNew) {
        // create
        await createPermiso({
          codigo: (edit.codigo || "").trim(),
          descripcion: (edit.descripcion ?? "").trim() || null,
        });
      } else {
        // update
        await updatePermiso(edit.id_permiso, {
          codigo: (edit.codigo || "").trim(),
          descripcion: (edit.descripcion ?? "").trim() || null,
        });
      }
      setOpen(false);
      await load();
    } catch (err: any) {
      // Nuestro http.ts lanza Error(message) como "Conflict" para 409.
      const status = err?.response?.status;
      const msg = err?.response?.data?.error || err?.message || "Error";
      if (status === 409 || /conflict/i.test(msg)) {
        alert("El código de permiso ya existe. Por favor ingresa uno diferente.");
      } else if (status === 400) {
        alert(msg || "Solicitud inválida. Revisa los datos.");
      } else {
        alert("No se pudo guardar el permiso. Inténtalo nuevamente.");
      }
    }
  }
  function limpiar(){ setF({ q:"", codigo:"", descripcion:"" }); }
  function exportPDF(){
    // ✅ CONFIRMACIÓN ANTES DE EXPORTAR PDF
    if (!confirm("¿Desea exportar los permisos visibles a PDF?")) return;

    const headers = ["ID","Código","Descripción"];
    const body = (rows ?? []).map(p=>[`#${p.id_permiso}`, p.codigo, p.descripcion ?? "—"]);
    exportTableToPDF({ title:"Seguridad • Permisos", headers, rows: body, footerNote:`Registros: ${rows?.length ?? 0}` });
  }

  return (
    <div style={{display:"grid",gap:"1rem"}}>
      {/* Filtros */}
      <div className="card" style={{display:"grid", gridTemplateColumns:"1fr 240px 1fr auto auto", gap:".6rem"}}>
        <input className="input" placeholder="Buscar (código/descripcion)…" value={f.q} onChange={e=>setF({...f, q:e.target.value})}/>
        <input className="input" placeholder="Código exacto" value={f.codigo} onChange={e=>setF({...f, codigo:e.target.value})}/>
        <input className="input" placeholder="Descripción contiene…" value={f.descripcion} onChange={e=>setF({...f, descripcion:e.target.value})}/>
        <button className="secondary" onClick={limpiar} disabled={loading}>Limpiar</button>
        <button onClick={onNew} disabled={loading}>+ Nuevo</button>
      </div>

      {/* Header */}
      <div className="card" style={{display:"flex",gap:"1rem",alignItems:"center"}}>
        <b>Seguridad • Permisos</b>
        <span style={{opacity:.7}}>Registros visibles: <b>{totales.registros}</b></span>
        <div style={{marginLeft:"auto"}}>
          <button className="secondary" onClick={exportPDF} disabled={loading}>Exportar PDF</button>
        </div>
      </div>

      {/* Tabla */}
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
            {/* 👇 CAMBIO 3: map y condición seguros */}
            {(rows ?? []).map(p=>(
              <tr key={p.id_permiso}>
                <td>#{p.id_permiso}</td>
                <td><code>{p.codigo}</code></td>
                <td>{p.descripcion ?? "—"}</td>
                <td style={{display:"flex",gap:".4rem"}}>
                  <button className="secondary" onClick={()=>onEditRow(p)}>Editar</button>
                  <button className="warn" onClick={()=>onDeleteRow(p.id_permiso)}>Eliminar</button>
                </td>
              </tr>
            ))}
            {(!rows || rows.length===0) && <tr><td colSpan={4} style={{padding:"1rem"}}>Sin registros.</td></tr>}
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
