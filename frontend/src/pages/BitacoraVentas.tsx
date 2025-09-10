import { useEffect, useMemo, useState } from "react";
import { BitacoraStore, BitacoraVenta } from "./ventas/_bitacoraStore";

type Filtros = {
  q: string; // texto: #venta, usuario, operacion
  operacion: "Todas" | "INSERT" | "UPDATE" | "DELETE";
  desde?: string; // yyyy-mm-dd
  hasta?: string; // yyyy-mm-dd
  venta?: string; // id_venta como texto
};

export default function BitacoraVentas() {
  const [db, setDb] = useState(BitacoraStore.getAll());
  const [f, setF] = useState<Filtros>({ q: "", operacion: "Todas" });

  // modal detalle (pretty JSON)
  const [open, setOpen] = useState(false);
  const [seleccion, setSeleccion] = useState<BitacoraVenta | null>(null);

  useEffect(() => setDb(BitacoraStore.getAll()), []);

  const rows = useMemo(() => {
    return db.bitacora.filter(b => {
      const texto = [
        b.id_bitacora, b.id_venta, b.usuario_evento, b.operacion,
        b.fecha_evento_iso
      ].join(" ").toLowerCase();

      if (f.q && !texto.includes(f.q.toLowerCase())) return false;
      if (f.operacion !== "Todas" && b.operacion !== f.operacion) return false;

      if (f.venta && String(b.id_venta) !== String(f.venta)) return false;

      if (f.desde && b.fecha_evento_iso.slice(0,10) < f.desde) return false;
      if (f.hasta && b.fecha_evento_iso.slice(0,10) > f.hasta) return false;

      return true;
    });
  }, [db, f]);

  const totales = useMemo(() => {
    const t = { total: rows.length, insert: 0, update: 0, delete: 0 };
    rows.forEach(r => {
      if (r.operacion === "INSERT") t.insert++;
      if (r.operacion === "UPDATE") t.update++;
      if (r.operacion === "DELETE") t.delete++;
    });
    return t;
  }, [rows]);

  function limpiar() {
    setF({ q: "", operacion: "Todas" });
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      {/* Filtros */}
      <div className="card" style={{ display: "grid", gap: ".6rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 160px 140px 140px 140px", gap: ".6rem" }}>
          <input className="input" placeholder="Buscar (usuario, #venta, op, fecha)…"
                 value={f.q} onChange={e=>setF({...f, q:e.target.value})}/>
          <select className="select" value={f.operacion}
                  onChange={e=>setF({...f, operacion: e.target.value as Filtros["operacion"]})}>
            <option value="Todas">Todas</option>
            <option value="INSERT">INSERT</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
          </select>
          <input className="input" type="date" value={f.desde ?? ""} onChange={e=>setF({...f, desde: e.target.value || undefined})}/>
          <input className="input" type="date" value={f.hasta ?? ""} onChange={e=>setF({...f, hasta: e.target.value || undefined})}/>
          <input className="input" placeholder="# Venta" value={f.venta ?? ""} onChange={e=>setF({...f, venta: e.target.value || undefined})}/>
        </div>
        <div style={{ display: "flex", gap: ".6rem", justifyContent: "flex-end" }}>
          <button className="secondary" onClick={limpiar}>Limpiar</button>
          <button className="secondary">Exportar CSV (UI)</button>
          <button className="secondary">Imprimir (UI)</button>
        </div>
      </div>

      {/* Totales */}
      <div className="card" style={{ display:"flex", gap:"1rem", flexWrap:"wrap", alignItems:"center" }}>
        <b>Bitácora de ventas</b>
        <span style={{opacity:.8}}>Eventos: <b>{totales.total}</b></span>
        <span className="badge">INSERT: {totales.insert}</span>
        <span className="badge">UPDATE: {totales.update}</span>
        <span className="badge">DELETE: {totales.delete}</span>
        <div style={{marginLeft:"auto", opacity:.75}}>Fuente: localStorage (UI)</div>
      </div>

      {/* Tabla */}
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th style={{width:110}}>#Bitácora</th>
              <th style={{width:110}}>#Venta</th>
              <th style={{width:120}}>Operación</th>
              <th>Usuario</th>
              <th style={{width:200}}>Fecha</th>
              <th style={{width:160}}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(b => (
              <tr key={b.id_bitacora}>
                <td>#{b.id_bitacora}</td>
                <td>#{b.id_venta}</td>
                <td>
                  <span className="badge" style={{
                    background: b.operacion==="INSERT" ? "#dcfce7" : b.operacion==="UPDATE" ? "#fef3c7" : "#fee2e2",
                    color: b.operacion==="INSERT" ? "#166534" : b.operacion==="UPDATE" ? "#92400e" : "#991b1b"
                  }}>
                    {b.operacion}
                  </span>
                </td>
                <td>{b.usuario_evento}</td>
                <td>{b.fecha_evento_iso}</td>
                <td style={{display:"flex", gap:".4rem"}}>
                  <button className="secondary" onClick={()=>{ setSeleccion(b); setOpen(true); }}>
                    Ver detalle JSON
                  </button>
                </td>
              </tr>
            ))}
            {rows.length===0 && (
              <tr><td colSpan={6} style={{padding:"1rem"}}>Sin eventos para los filtros actuales (UI).</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal detalle JSON */}
      {open && seleccion && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.25)", display:"grid", placeItems:"center", zIndex:60 }}>
          <div className="card" style={{ width:"min(980px,96vw)" }}>
            <h3 style={{marginTop:0}}>Detalle del evento #{seleccion.id_bitacora}</h3>
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem"}}>
              <div>
                <div style={{opacity:.7, fontWeight:600, marginBottom:".25rem"}}>Datos anteriores</div>
                <pre style={{background:"#0b1220", color:"#e5e7eb", padding:".75rem", borderRadius:8, maxHeight:320, overflow:"auto"}}>
{seleccion.datos_anteriores ?? "null"}
                </pre>
              </div>
              <div>
                <div style={{opacity:.7, fontWeight:600, marginBottom:".25rem"}}>Datos nuevos</div>
                <pre style={{background:"#0b1220", color:"#e5e7eb", padding:".75rem", borderRadius:8, maxHeight:320, overflow:"auto"}}>
{seleccion.datos_nuevos ?? "null"}
                </pre>
              </div>
            </div>
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:".6rem", marginTop:".75rem"}}>
              <div><label>Venta</label><div>#{seleccion.id_venta}</div></div>
              <div><label>Operación</label><div>{seleccion.operacion}</div></div>
              <div><label>Usuario</label><div>{seleccion.usuario_evento}</div></div>
              <div><label>Fecha</label><div>{seleccion.fecha_evento_iso}</div></div>
            </div>
            <div style={{display:"flex", gap:".6rem", justifyContent:"flex-end", marginTop:"1rem"}}>
              <button className="secondary" onClick={()=>setOpen(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Nota UI */}
      <div className="card" style={{display:"flex", gap:".6rem", flexWrap:"wrap"}}>
        <span className="badge secondary">UI de evidencia (sin backend).</span>
        <span className="badge">Con backend: lectura directa de dbo.bitacora_ventas y trigger `trg_bitacora_ventas`.</span>
      </div>
    </div>
  );
}
