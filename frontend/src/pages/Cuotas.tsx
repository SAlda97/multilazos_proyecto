// src/pages/Cuotas.tsx
import { useEffect, useMemo, useState } from "react";
import EmptyState from "../components/EmptyState";
import { listCuotas, asignarPagoCuota } from "../services/cuotas";
import type { CuotaCredito } from "../types/cuotas";

// PDF
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Filtros = {
  q: string;
  desde?: string;
  hasta?: string;
  id_venta?: string;
};

type RowUI = {
  id: number;
  idVenta: number;
  numero: number;
  fechaVenc: string;         // ISO o "-"
  montoProgramado: number;   // number
};

export default function Cuotas(){
  const [rows, setRows] = useState<RowUI[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Filtros (mismo look & feel, sin “estado”)
  const [f, setF] = useState<Filtros>({ q: "" });

  // modal Asignar pago
  const [openPago, setOpenPago] = useState(false);
  const [cuotaSel, setCuotaSel] = useState<RowUI | null>(null);
  const [montoPago, setMontoPago] = useState<string>("");
  const [fechaPago, setFechaPago] = useState<string>(() => new Date().toISOString().slice(0,10));
  const [savingPago, setSavingPago] = useState(false);

  async function load(){
    setLoading(true);
    try{
      const res = await listCuotas({
        q: f.q || undefined,
        desde: f.desde || undefined,
        hasta: f.hasta || undefined,
        id_venta: f.id_venta ? Number(f.id_venta) : undefined,
        page: 1, page_size: 1000,
      });
      const mapped = res.results.map(c => ({
        id: c.id_cuota,
        idVenta: c.id_venta,
        numero: c.numero_cuota,
        fechaVenc: c.fecha_venc_iso || "-",
        montoProgramado: Number(c.monto_programado),
      }));
      setRows(mapped);
      setCount(res.count);
    } finally {
      setLoading(false);
    }
  }

  useEffect(()=>{ load(); }, []); // init
  useEffect(()=>{ load(); }, [f.q, f.desde, f.hasta, f.id_venta]); // recarga al cambiar filtros

  // filtrado adicional en UI (opcional por si deseas texto libre extra)
  const filtered = useMemo(()=>{
    const q = (f.q||"").toLowerCase();
    return rows.filter(r=>{
      const texto = [`venta:${r.idVenta}`, `n:${r.numero}`, r.fechaVenc].join(" ").toLowerCase();
      if(q && !texto.includes(q)) return false;
      if(f.desde && r.fechaVenc !== "-" && r.fechaVenc < f.desde) return false;
      if(f.hasta && r.fechaVenc !== "-" && r.fechaVenc > f.hasta) return false;
      if(f.id_venta && String(r.idVenta)!==String(f.id_venta)) return false;
      return true;
    });
  }, [rows, f]);

  // totales visibles
  const totProgramado = useMemo(()=>{
    return filtered.reduce((acc, r)=> acc + (r.montoProgramado||0), 0);
  }, [filtered]);

  const [page, setPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageData = useMemo(()=>{
    const i = (page-1)*pageSize;
    return filtered.slice(i, i+pageSize);
  }, [filtered, page]);

  function limpiar(){
    setF({ q:"" });
    setPage(1);
  }

  function exportPDF(){
    if(!confirm("¿Desea exportar las cuotas filtradas a PDF?")) return;

    const doc = new jsPDF({ unit:"pt", format:"a4" });
    const title = `Cuotas de crédito (${filtered.length} registros)`;
    doc.setFont("helvetica", "bold"); doc.setFontSize(14);
    doc.text(title, 40, 40);

    const filtrosLinea = [
      f.q ? `Buscar="${f.q}"` : null,
      f.desde ? `Desde=${f.desde}` : null,
      f.hasta ? `Hasta=${f.hasta}` : null,
      f.id_venta ? `#Venta=${f.id_venta}` : null,
    ].filter(Boolean).join(" • ");
    if(filtrosLinea){
      doc.setFont("helvetica", "normal"); doc.setFontSize(10);
      doc.text(filtrosLinea, 40, 58);
    }

    const head = [["#Venta", "N° Cuota", "Vence", "Programado (Q)"]];
    const body = filtered.map(r=>[
      `#${r.idVenta}`, String(r.numero), r.fechaVenc || "-", r.montoProgramado.toFixed(2)
    ]);

    autoTable(doc, {
      startY: 70,
      head, body,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [42,106,195] },
      theme: "striped",
      didDrawPage: data => {
        const pageSize = doc.internal.pageSize;
        doc.setFontSize(8); doc.setTextColor(120);
        doc.text("Exportado desde Multilazos", 40, pageSize.height - 24);
        doc.text(`Página ${doc.getCurrentPageInfo().pageNumber}`, pageSize.width - 80, pageSize.height - 24);
      },
      margin: { left: 40, right: 40 },
    });

    doc.save("cuotas.pdf");
  }

  // --- Asignar pago ---
  function abrirPago(r: RowUI){
    setCuotaSel(r);
    setMontoPago("");
    setFechaPago(new Date().toISOString().slice(0,10));
    setOpenPago(true);
  }
  async function guardarPago(e: React.FormEvent){
    e.preventDefault();
    if(!cuotaSel) return;
    const m = Number(montoPago);
    if(!(m>0)){ alert("Monto debe ser > 0"); return; }
    try{
      setSavingPago(true);
      await asignarPagoCuota(cuotaSel.id, { monto_pago: m, fecha_iso: fechaPago || undefined });
      setOpenPago(false);
    }catch(err:any){
      alert(err?.response?.data?.detail || err?.message || "Error al registrar pago.");
    }finally{
      setSavingPago(false);
    }
  }

  return (
    <div style={{display:"grid",gap:"1rem"}}>
      {/* Filtros (mismo diseño, sin “estado”) */}
      <div className="card" style={{display:"grid",gap:".7rem",gridTemplateColumns:"2fr 1fr 1fr 1fr"}}>
        <input className="input" placeholder="Buscar (venta, número, fecha…)" value={f.q} onChange={e=>setF({...f, q:e.target.value})} />
        <input className="input" type="date" value={f.desde || ""} onChange={e=>setF({...f, desde: e.target.value || undefined})} />
        <input className="input" type="date" value={f.hasta || ""} onChange={e=>setF({...f, hasta: e.target.value || undefined})} />
        <input className="input" placeholder="# Venta" value={f.id_venta || ""} onChange={e=>setF({...f, id_venta: e.target.value || undefined})} />
      </div>

      {/* Totales del período visible */}
      <div className="card" style={{display:"flex",gap:"1rem",alignItems:"center",flexWrap:"wrap"}}>
        <b>Totales (selección):</b>
        <div>Programado: <b>Q {totProgramado.toFixed(2)}</b></div>
        <div style={{marginLeft:"auto",display:"flex",gap:".5rem"}}>
          <button className="secondary" onClick={limpiar} disabled={loading}>Limpiar</button>
          <button className="secondary" onClick={exportPDF} disabled={loading}>Exportar PDF</button>
        </div>
      </div>

      {/* Tabla (sin CRUD; solo “Asignar pago”) */}
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Venta</th>
              <th>N° Cuota</th>
              <th>Vence</th>
              <th>Programado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pageData.map(c=>(
              <tr key={c.id}>
                <td>#{c.idVenta}</td>
                <td>{c.numero}</td>
                <td>{c.fechaVenc || "-"}</td>
                <td>Q {c.montoProgramado.toFixed(2)}</td>
                <td style={{display:"flex",gap:".4rem"}}>
                  <button onClick={()=>abrirPago(c)}>Asignar pago</button>
                </td>
              </tr>
            ))}
            {pageData.length===0 && !loading && (
              <tr>
                <td colSpan={5}>
                  <EmptyState
                    title="No hay cuotas"
                    subtitle="Se generan automáticamente al crear ventas a crédito. Ajusta los filtros para ver resultados."
                  />
                </td>
              </tr>
            )}
            {loading && (
              <tr><td colSpan={5} style={{padding:"1rem"}}>Cargando…</td></tr>
            )}
          </tbody>
        </table>

        {/* Paginación */}
        <div style={{display:"flex",gap:".5rem",justifyContent:"flex-end",marginTop:".8rem"}}>
          <button className="secondary" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Anterior</button>
          <div style={{alignSelf:"center"}}>Página {page} / {totalPages}</div>
          <button className="secondary" disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)}>Siguiente</button>
        </div>
      </div>

      {/* Modal Asignar pago */}
      {openPago && cuotaSel && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.25)",display:"grid",placeItems:"center",zIndex:50}}>
          <form className="card" onSubmit={guardarPago} style={{minWidth:320,width:"min(520px, 95vw)"}}>
            <h3 style={{marginTop:0}}>Asignar pago a cuota</h3>
            <div style={{display:"grid",gap:".6rem",gridTemplateColumns:"1fr 1fr"}}>
              <div>
                <label>Fecha pago</label>
                <input className="input" type="date" value={fechaPago} onChange={e=>setFechaPago(e.target.value)} />
              </div>
              <div>
                <label>Monto (Q)</label>
                <input className="input" type="number" step="0.01" value={montoPago} onChange={e=>setMontoPago(e.target.value)} />
              </div>
            </div>
            <div style={{display:"flex",gap:".6rem",justifyContent:"flex-end",marginTop:"1rem"}}>
              <button type="button" className="secondary" onClick={()=>setOpenPago(false)} disabled={savingPago}>Cancelar</button>
              <button type="submit" disabled={savingPago}>{savingPago ? "Guardando..." : "Guardar"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
