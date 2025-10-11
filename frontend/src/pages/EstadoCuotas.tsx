// src/pages/EstadoCuotas.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listEstadoCuotas } from "../services/estadoCuotas";
import { asignarPagoCuota } from "../services/cuotas";
import type { EstadoCuota } from "../types/estadoCuotas";
import { fmtQ, fmt2 } from "../utils/format";

// PDF
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Filtros = {
  q: string;
  estado: "Todos" | "pendiente" | "parcial" | "pagada" | "atrasada";
  desde?: string;
  hasta?: string;
  venta?: string;
};

export default function EstadoCuotas(){
  const navigate = useNavigate();

  const [f, setF] = useState<Filtros>({ q: "", estado: "Todos" });
  const [rows, setRows] = useState<EstadoCuota[]>([]);
  const [allRows, setAllRows] = useState<EstadoCuota[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(count/pageSize));
  const [loading, setLoading] = useState(false);
  

  // Modal pago
  const [openPago, setOpenPago] = useState(false);
  const [cuotaSel, setCuotaSel] = useState<EstadoCuota|null>(null);
  const [montoPago, setMontoPago] = useState("");

  async function load(p = page) {
    setLoading(true);
    try {
      // mismos filtros para ambas consultas
      const commonParams = {
        search: f.q || undefined,
        desde: f.desde || undefined,
        hasta: f.hasta || undefined,
        id_venta: f.venta || undefined,
        estado: f.estado !== "Todos" ? f.estado : undefined,
      };

      // 1) Page actual (paginada)
      // 2) Todas las filas filtradas (para totales), sin paginar
      const [pageRes, fullRes] = await Promise.all([
        listEstadoCuotas({ ...commonParams, page: p, page_size: pageSize }),
        listEstadoCuotas({ ...commonParams, page: 1, page_size: 10000000 }) // << solo para totales
      ]);

      setRows(pageRes.results);
      setCount(pageRes.count);
      setAllRows(fullRes.results); // << aquí guardamos TODO lo filtrado
      setPage(p);
    } finally {
      setLoading(false);
    }
  }

  useEffect(()=>{ load(1); }, []); // init
  useEffect(()=>{ load(1); }, [f.q, f.estado, f.desde, f.hasta, f.venta]); // refiltrar

  function limpiar(){ setF({ q:"", estado:"Todos" }); setPage(1); }

  function exportPDF(){
    if(!confirm("¿Exportar estado de cuotas a PDF?")) return;
    const doc = new jsPDF({ unit:"pt", format:"a4" });
    doc.setFont("helvetica","bold"); doc.setFontSize(14);
    doc.text(`Estado de cuotas (total: ${count})`, 40, 40);

    const filtros = [
      f.q ? `Buscar="${f.q}"` : null,
      f.estado!=="Todos" ? `Estado=${f.estado}` : null,
      f.desde ? `Desde=${f.desde}` : null,
      f.hasta ? `Hasta=${f.hasta}` : null,
      f.venta ? `#Venta=${f.venta}` : null,
    ].filter(Boolean).join(" • ");
    doc.setFont("helvetica","normal"); doc.setFontSize(10);
    if(filtros) doc.text(filtros, 40, 58);

    autoTable(doc, {
      startY: 70,
      head: [["#Cuota","#Venta","Cliente","Vence","Programado","Pagado","Saldo","Estado"]],
      body: rows.map(r=>[
        `#${r.id_cuota} (#${r.numero_cuota})`,
        `#${r.id_venta}`,
        r.cliente,
        r.fecha_venc_iso,
        Number(r.monto_programado).toFixed(2),
        Number(r.monto_pagado).toFixed(2),
        Number(r.saldo_pendiente).toFixed(2),
        r.estado
      ]),
      styles:{ fontSize:9 },
      headStyles:{ fillColor:[42,106,195] },
      theme:"striped",
      margin:{ left:40, right:40 },
      columnStyles:{
        0:{cellWidth:90}, 1:{cellWidth:70}, 2:{cellWidth:140}, 3:{cellWidth:90},
        4:{cellWidth:80}, 5:{cellWidth:80}, 6:{cellWidth:80}, 7:{cellWidth:70}
      },
      didDrawPage: data=>{
        const s = doc.internal.pageSize;
        doc.setFontSize(8); doc.setTextColor(120);
        doc.text("Exportado desde Multilazos", 40, s.height-24);
        doc.text(`Página ${doc.getCurrentPageInfo().pageNumber}`, s.width-80, s.height-24);
      }
    });
    doc.save("estado_cuotas.pdf");
  }

  function abrirPago(r: EstadoCuota){
    setCuotaSel(r);
    setMontoPago("");
    setOpenPago(true);
  }

  async function guardarPago(e: React.FormEvent){
    e.preventDefault();
    const monto = Number(montoPago||0);
    if(!(monto>0)){ alert("Monto > 0"); return; }
    if(Number(cuotaSel?.saldo_pendiente || 0) <= 0){
      alert("La cuota no tiene saldo pendiente."); return;
    }
    if(monto > Number(cuotaSel?.saldo_pendiente || 0)){
      alert("El monto excede el saldo de la cuota."); return;
    }
    if(!confirm("¿Confirmar asignación del pago a esta cuota?")) return;

    try{
      await asignarPagoCuota({ id_cuota: cuotaSel!.id_cuota, monto_pago: monto });
      setOpenPago(false);
      await load(page);
    }catch(err:any){
      alert(err?.response?.data?.detail || err?.message || "Error al asignar el pago.");
    }
  }

  // Totales + participación %
  const totales = useMemo(() => {
    const dataset = allRows; // <- fuente global filtrada
    const regs = dataset.length;

    const sumaProgramado = dataset.reduce((acc, r) => acc + Number(r.monto_programado || 0), 0);
    const sumaPagado    = dataset.reduce((acc, r) => acc + Number(r.monto_pagado || 0), 0);
    const sumaSaldo     = dataset.reduce((acc, r) => acc + Number(r.saldo_pendiente || 0), 0);

    const porEstado = dataset.reduce((acc, r) => {
      (acc as any)[r.estado] = ((acc as any)[r.estado] || 0) + 1;
      return acc;
    }, {} as Record<EstadoCuota["estado"], number>);

    // participación % respecto a la suma (programado+pagado+saldo) del conjunto filtrado
    const totalAbs = (sumaProgramado + sumaPagado + sumaSaldo) || 1;
    const pct = (v: number) => (totalAbs > 0 ? (v * 100) / totalAbs : 0);

    return {
      registros: regs,
      porEstado,
      sumaProgramado,
      sumaPagado,
      sumaSaldo,
      pctProgramado: pct(sumaProgramado),
      pctPagado: pct(sumaPagado),
      pctSaldo: pct(sumaSaldo),
    };
  }, [allRows]);

  function Chip({ s }: { s: EstadoCuota["estado"] }) {
    const color =
      s === "pagada"   ? "#16a34a" :
      s === "parcial"  ? "#f59e0b" :
      s === "atrasada" ? "#ef4444" : "#ef4444";
    const bg =
      s === "pagada"   ? "#dcfce7" :
      s === "parcial"  ? "#fef3c7" :
      s === "atrasada" ? "#fee2e2" : "#fee2e2";
    return (
      <span style={{
        fontSize: 12, padding: ".15rem .5rem", borderRadius: 999,
        color, background: bg, fontWeight: 600, textTransform: "uppercase"
      }}>
        {s}
      </span>
    );
  }

  return (
    <div style={{ display:"grid", gap:"1rem" }}>
      {/* Filtros */}
      <div className="card" style={{ display:"grid", gap:".6rem" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 160px 140px 140px 160px", gap:".6rem" }}>
          <input
            className="input"
            placeholder="Buscar (cliente, #venta, #cuota)…"
            value={f.q}
            onChange={e=>setF({...f, q:e.target.value})}
          />
          <select
            className="select"
            value={f.estado}
            onChange={e=>setF({...f, estado: e.target.value as Filtros["estado"]})}
          >
            <option value="Todos">Todos</option>
            <option value="pendiente">Pendiente</option>
            <option value="parcial">Parcial</option>
            <option value="pagada">Pagada</option>
            <option value="atrasada">Atrasada</option>
          </select>
          <input className="input" type="date" value={f.desde ?? ""} onChange={e=>setF({...f, desde:e.target.value||undefined})}/>
          <input className="input" type="date" value={f.hasta ?? ""} onChange={e=>setF({...f, hasta:e.target.value||undefined})}/>
          <input className="input" placeholder="# Venta" value={f.venta ?? ""} onChange={e=>setF({...f, venta:e.target.value||undefined})}/>
        </div>
        <div style={{ display:"flex", gap:".6rem", justifyContent:"flex-end" }}>
          <button className="secondary" onClick={limpiar} disabled={loading}>Limpiar</button>
          <button className="secondary" onClick={exportPDF} disabled={loading}>Exportar PDF</button>
        </div>
      </div>

      {/* Totales con % */}
      <div className="card" style={{ display:"grid", gap:".4rem" }}>
        <div style={{ display:"flex", gap:"1rem", alignItems:"center", flexWrap:"wrap" }}>
          <b>Estado de cuotas</b>
          <span style={{ opacity:.8 }}>
            Registros: <b>{totales.registros}</b>
            <div style={{ fontSize:12, opacity:.8, marginTop:2 }}>100%</div>
          </span>
          <span className="badge">Pendientes: {totales.porEstado?.pendiente ?? 0}</span>
          <span className="badge">Parciales: {totales.porEstado?.parcial ?? 0}</span>
          <span className="badge">Atrasadas: {totales.porEstado?.atrasada ?? 0}</span>
          <span className="badge">Pagadas: {totales.porEstado?.pagada ?? 0}</span>

          <div style={{ marginLeft:"auto", display:"flex", gap:"1.2rem", flexWrap:"wrap" }}>
            <div>
              Total cartera(Programado) : <b>{fmtQ(totales.sumaProgramado)}</b>
              <div style={{ fontSize:12, opacity:.8, marginTop:2 }}>
                {totales.pctProgramado.toFixed(1)}%
              </div>
            </div>
            <div>
              Pagado: <b>{fmtQ(totales.sumaPagado)}</b>
              <div style={{ fontSize:12, opacity:.8, marginTop:2 }}>
                {totales.pctPagado.toFixed(1)}%
              </div>
            </div>
            <div>
              Saldo: <b>{fmtQ(totales.sumaSaldo)}</b>
              <div style={{ fontSize:12, opacity:.8, marginTop:2 }}>
                {totales.pctSaldo.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th style={{width:100}}>#Cuota</th>
              <th style={{width:120}}>#Venta</th>
              <th>Cliente</th>
              <th style={{width:110}}>Vence</th>
              <th style={{width:120, textAlign:"right"}}>Programado</th>
              <th style={{width:120, textAlign:"right"}}>Pagado</th>
              <th style={{width:120, textAlign:"right"}}>Saldo</th>
              <th style={{width:120}}>Estado</th>
              <th style={{width:200}}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r=>(
              <tr key={r.id_cuota}>
                <td>#{r.id_cuota} (#{r.numero_cuota})</td>
                <td>#{r.id_venta}</td>
                <td>{r.cliente}</td>
                <td>{r.fecha_venc_iso}</td>
                <td style={{textAlign:"right"}}>{fmtQ(r.monto_programado)}</td>
                <td style={{textAlign:"right"}}>{fmtQ(r.monto_pagado)}</td>
                <td style={{textAlign:"right"}}><b>{fmtQ(r.saldo_pendiente)}</b></td>
                <td><Chip s={r.estado} /></td>
                <td style={{display:"flex", gap:".4rem"}}>
                  <button
                    className="secondary"
                    onClick={() => navigate(`/ventas/${r.id_venta}/detalle`)}
                    title="Ver detalle de la venta"
                  >
                    Ventas
                  </button>
                  <button
                    onClick={()=>abrirPago(r)}
                    disabled={Number(r.saldo_pendiente) <= 0}
                    title={Number(r.saldo_pendiente) <= 0 ? "La cuota ya no tiene saldo" : "Asignar pago a esta cuota"}
                    style={ Number(r.saldo_pendiente) <= 0 ? {
                      background:"#e6f7ed", color:"#166534", borderColor:"#bbf7d0", cursor:"not-allowed"
                    } : undefined}
                  >
                    Asignar pago
                  </button>
                </td>
              </tr>
            ))}
            {rows.length===0 && !loading && (
              <tr><td colSpan={9} style={{padding:"1rem"}}>Sin cuotas para los filtros actuales.</td></tr>
            )}
            {loading && (
              <tr><td colSpan={9} style={{padding:"1rem"}}>Cargando…</td></tr>
            )}
          </tbody>
        </table>

        {/* Paginación */}
        <div style={{display:"flex",gap:".5rem",justifyContent:"flex-end",marginTop:".8rem"}}>
          <button className="secondary" disabled={page<=1} onClick={()=>load(page-1)}>Anterior</button>
          <div style={{alignSelf:"center"}}>Página {page} / {totalPages}</div>
          <button className="secondary" disabled={page>=totalPages} onClick={()=>load(page+1)}>Siguiente</button>
        </div>
      </div>

      {/* Modal pago */}
      {openPago && cuotaSel && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.25)",display:"grid",placeItems:"center",zIndex:50}}>
          <form className="card" onSubmit={guardarPago} style={{minWidth:320,width:"min(520px,95vw)"}}>
            <h3 style={{marginTop:0}}>
              Asignar pago a cuota #{cuotaSel.numero_cuota} (venta #{cuotaSel.id_venta})
            </h3>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".6rem",marginBottom:".6rem"}}>
              <div>
                <label>Programado</label>
                <div>Q {Number(cuotaSel.monto_programado).toFixed(2)}</div>
              </div>
              <div>
                <label>Saldo pendiente</label>
                <div><b>Q {Number(cuotaSel.saldo_pendiente).toFixed(2)}</b></div>
              </div>
            </div>

            <div>
              <label>Monto (Q)</label>
              <input
                className="input"
                type="number"
                step="0.01"
                value={montoPago}
                onChange={e=>setMontoPago(e.target.value)}
                disabled={Number(cuotaSel.saldo_pendiente) <= 0}
                style={ Number(cuotaSel.saldo_pendiente) <= 0 ? {
                  background:"#e6f7ed", color:"#166534", borderColor:"#bbf7d0", cursor:"not-allowed"
                } : undefined }
                placeholder="0.00"
              />
            </div>

            <div style={{display:"flex",gap:".6rem",justifyContent:"flex-end",marginTop:"1rem"}}>
              <button type="button" className="secondary" onClick={()=>setOpenPago(false)}>Cancelar</button>
              <button type="submit">Guardar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
