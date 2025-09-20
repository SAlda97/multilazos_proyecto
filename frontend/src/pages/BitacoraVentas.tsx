import { useEffect, useMemo, useState } from "react";
import type { BitacoraVenta } from "../types/bitacoraVentas";
import { listBitacoraVentas } from "../services/bitacoraVentas";

// PDF
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Filtros = {
  q: string; // texto: #venta, usuario, operacion
  operacion: "Todas" | "INSERT" | "UPDATE" | "DELETE";
  desde?: string; // yyyy-mm-dd
  hasta?: string; // yyyy-mm-dd
  venta?: string; // id_venta como texto
};

export default function BitacoraVentas() {
  const [rows, setRows] = useState<BitacoraVenta[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const [f, setF] = useState<Filtros>({ q: "", operacion: "Todas" });

  // modal detalle (pretty JSON)
  const [open, setOpen] = useState(false);
  const [seleccion, setSeleccion] = useState<BitacoraVenta | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await listBitacoraVentas({
        q: f.q || undefined,
        operacion: f.operacion !== "Todas" ? f.operacion : undefined,
        desde: f.desde || undefined,
        hasta: f.hasta || undefined,
        venta: f.venta || undefined,
        page: 1,
        page_size: 1000,
      });
      setRows(res.results);
      setCount(res.count);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* carga inicial */ }, []); // eslint-disable-line
  // recargar al cambiar filtros
  useEffect(() => { load(); }, [f.q, f.operacion, f.desde, f.hasta, f.venta]); // eslint-disable-line

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

  function prettyJson(s: string | null) {
    try {
      return JSON.stringify(JSON.parse(s ?? "null"), null, 2);
    } catch {
      // si no es JSON válido, devuelve el texto tal cual
      return s ?? "null";
    }
  }

  function exportPDF() {
    if (!confirm("¿Desea exportar la bitácora filtrada a PDF?")) return;

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const title = `Bitácora de ventas (${rows.length} eventos)`;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(title, 40, 40);

    const filtrosLinea = [
      f.q ? `Buscar="${f.q}"` : null,
      f.operacion !== "Todas" ? `Op=${f.operacion}` : null,
      f.desde ? `Desde=${f.desde}` : null,
      f.hasta ? `Hasta=${f.hasta}` : null,
      f.venta ? `#Venta=${f.venta}` : null,
    ].filter(Boolean).join(" • ");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    if (filtrosLinea) doc.text(filtrosLinea, 40, 58);

    const head = [["#Bitácora", "#Venta", "Operación", "Usuario", "Fecha"]];
    const body = rows.map(b => [
      `#${b.id_bitacora}`,
      `#${b.id_venta}`,
      b.operacion,
      b.usuario_evento,
      b.fecha_evento_iso
    ]);

    autoTable(doc, {
      startY: 70,
      head,
      body,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [42, 106, 195] },
      theme: "striped",
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 80 },
        2: { cellWidth: 90 },
        3: { cellWidth: 140 },
        4: { cellWidth: 140 },
      },
      didDrawPage: data => {
        const pageSize = doc.internal.pageSize;
        doc.setFontSize(8);
        doc.setTextColor(120);
        doc.text("Exportado desde Multilazos", 40, pageSize.height - 24);
        doc.text(`Página ${doc.getCurrentPageInfo().pageNumber}`, pageSize.width - 80, pageSize.height - 24);
      },
      margin: { left: 40, right: 40 },
    });

    doc.save(`bitacora-ventas.pdf`);
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      {/* Filtros */}
      <div className="card" style={{ display: "grid", gap: ".6rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 160px 140px 140px 140px", gap: ".6rem" }}>
          {/* Buscar (sin etiqueta) */}
          <input
            className="input"
            placeholder="Buscar (usuario, #venta, op, fecha)…"
            value={f.q}
            onChange={e=>setF({...f, q:e.target.value})}
          />

          {/* Operación */}
          <div>
            <label style={{ display: "block", fontSize: 12, opacity: .8, marginBottom: 4 }}>Operación</label>
            <select
              className="select"
              value={f.operacion}
              onChange={e=>setF({...f, operacion: e.target.value as Filtros["operacion"]})}
            >
              <option value="Todas">Todas</option>
              <option value="INSERT">INSERT</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>

          {/* Desde */}
          <div>
            <label style={{ display: "block", fontSize: 12, opacity: .8, marginBottom: 4 }}>Desde</label>
            <input
              className="input"
              type="date"
              value={f.desde ?? ""}
              onChange={e=>setF({...f, desde: e.target.value || undefined})}
            />
          </div>

          {/* Hasta */}
          <div>
            <label style={{ display: "block", fontSize: 12, opacity: .8, marginBottom: 4 }}>Hasta</label>
            <input
              className="input"
              type="date"
              value={f.hasta ?? ""}
              onChange={e=>setF({...f, hasta: e.target.value || undefined})}
            />
          </div>

          {/* #Venta */}
          <div>
            <label style={{ display: "block", fontSize: 12, opacity: .8, marginBottom: 4 }}>#Venta</label>
            <input
              className="input"
              placeholder="# Venta"
              value={f.venta ?? ""}
              onChange={e=>setF({...f, venta: e.target.value || undefined})}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: ".6rem", justifyContent: "flex-end" }}>
          <button className="secondary" onClick={limpiar} disabled={loading}>Limpiar</button>
          {/* Reemplaza CSV/Imprimir por PDF */}
          <button className="secondary" onClick={exportPDF} disabled={loading}>Exportar PDF</button>
        </div>
      </div>

      {/* Totales */}
      <div className="card" style={{ display:"flex", gap:"1rem", flexWrap:"wrap", alignItems:"center" }}>
        <b>Bitácora de ventas</b>
        <span style={{opacity:.8}}>Eventos: <b>{count}</b> (visibles: <b>{rows.length}</b>)</span>
        <span className="badge">INSERT: {totales.insert}</span>
        <span className="badge">UPDATE: {totales.update}</span>
        <span className="badge">DELETE: {totales.delete}</span>
        <div style={{marginLeft:"auto", opacity:.75}}>{loading ? "Cargando…" : "Fuente: SQL (backend)"}</div>
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
                  <span
                    className="badge"
                    style={{
                      background:
                        b.operacion==="INSERT" ? "#dcfce7" :
                        b.operacion==="UPDATE" ? "#fef3c7" : "#fee2e2",
                      color:
                        b.operacion==="INSERT" ? "#166534" :
                        b.operacion==="UPDATE" ? "#92400e" : "#991b1b"
                    }}
                  >
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
            {rows.length===0 && !loading && (
              <tr><td colSpan={6} style={{padding:"1rem"}}>Sin eventos para los filtros actuales.</td></tr>
            )}
            {loading && (
              <tr><td colSpan={6} style={{padding:"1rem"}}>Cargando…</td></tr>
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
                <pre
                  style={{
                    background:"#0b1220",
                    color:"#e5e7eb",
                    padding:".75rem",
                    borderRadius:8,
                    maxHeight:320,
                    overflow:"auto",
                    whiteSpace:"pre-wrap",
                    wordBreak:"break-word",
                    overflowWrap:"anywhere"
                  }}
                >
{prettyJson(seleccion.datos_anteriores)}
                </pre>
              </div>
              <div>
                <div style={{opacity:.7, fontWeight:600, marginBottom:".25rem"}}>Datos nuevos</div>
                <pre
                  style={{
                    background:"#0b1220",
                    color:"#e5e7eb",
                    padding:".75rem",
                    borderRadius:8,
                    maxHeight:320,
                    overflow:"auto",
                    whiteSpace:"pre-wrap",
                    wordBreak:"break-word",
                    overflowWrap:"anywhere"
                  }}
                >
{prettyJson(seleccion.datos_nuevos)}
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

      {/* Nota */}
      <div className="card" style={{display:"flex", gap:".6rem", flexWrap:"wrap"}}>
      </div>
    </div>
  );
}
