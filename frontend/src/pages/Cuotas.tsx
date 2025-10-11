// src/pages/Cuotas.tsx
import { useEffect, useState } from "react";
import { listCuotas, asignarPagoCuota, type Cuota } from "../services/cuotas";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { fmtQ } from "../utils/format";

type Filtros = {
  q: string;
  desde?: string;
  hasta?: string;
  venta?: string;
};

export default function Cuotas(){
  const [rows, setRows] = useState<Cuota[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const [f, setF] = useState<Filtros>({ q: "" });
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(count/pageSize));

  // Modal pago
  const [openPago, setOpenPago] = useState(false);
  const [cuotaSel, setCuotaSel] = useState<Cuota|null>(null);
  const [montoPago, setMontoPago] = useState("");

  async function load(p=page){
    setLoading(true);
    try{
      const res = await listCuotas({
        search: f.q || undefined,
        desde: f.desde || undefined,
        hasta: f.hasta || undefined,
        id_venta: f.venta || undefined,
        page: p, page_size: pageSize
      });
      setRows(res.results);
      setCount(res.count);
      setPage(p);
    }finally{
      setLoading(false);
    }
  }
  useEffect(()=>{ load(1); }, []); // init
  useEffect(()=>{ load(1); }, [f.q, f.desde, f.hasta, f.venta]); // refiltrar

  function limpiar(){ setF({ q:"" }); setPage(1); }

  function exportPDF(){
    if(!confirm("¿Exportar cuotas filtradas a PDF?")) return;
    const doc = new jsPDF({ unit:"pt", format:"a4" });
    doc.setFont("helvetica","bold"); doc.setFontSize(14);
    doc.text(`Cuotas (total: ${count})`, 40, 40);
    const filtros = [
      f.q ? `Buscar="${f.q}"` : null,
      f.desde ? `Desde=${f.desde}` : null,
      f.hasta ? `Hasta=${f.hasta}` : null,
      f.venta ? `#Venta=${f.venta}` : null,
    ].filter(Boolean).join(" • ");
    doc.setFont("helvetica","normal"); doc.setFontSize(10);
    if(filtros) doc.text(filtros, 40, 58);

    autoTable(doc, {
      startY: 70,
      head: [["#Venta","N° Cuota","Vence","Programado"]],
      body: rows.map(r=>[
        `#${r.id_venta}`,
        r.numero_cuota,
        r.fecha_venc_iso,
        Number(r.monto_programado).toFixed(2)
      ]),
      styles:{ fontSize:9 },
      headStyles:{ fillColor:[42,106,195] },
      theme:"striped",
      columnStyles:{ 0:{cellWidth:80}, 1:{cellWidth:80}, 2:{cellWidth:120}, 3:{cellWidth:120} },
      didDrawPage: data=>{
        const s = doc.internal.pageSize;
        doc.setFontSize(8); doc.setTextColor(120);
        doc.text("Exportado desde Multilazos", 40, s.height-24);
        doc.text(`Página ${doc.getCurrentPageInfo().pageNumber}`, s.width-80, s.height-24);
      },
      margin:{ left:40, right:40 }
    });
    doc.save("cuotas.pdf");
  }

  function abrirPago(r: Cuota){ setCuotaSel(r); setMontoPago(""); setOpenPago(true); }
  async function guardarPago(e: React.FormEvent){
    e.preventDefault();
    if (!cuotaSel) return;

    const monto = Number(montoPago || 0);
    const programado = Number(cuotaSel.monto_programado);
    const asignado   = Number(cuotaSel.monto_asignado || 0);
    const saldo      = Number(cuotaSel.saldo_pendiente ?? (programado - asignado));

    if (!(monto > 0)) {
      alert("El monto debe ser mayor a 0.");
      return;
    }
    if (monto > saldo) {
      alert(`El monto (Q ${monto.toFixed(2)}) excede el saldo pendiente (Q ${saldo.toFixed(2)}).`);
      return;
    }

    const ok = confirm(
      `¿Confirmar asignación de Q ${monto.toFixed(2)} a la cuota #${cuotaSel.numero_cuota} (venta #${cuotaSel.id_venta})?`
    );
    if (!ok) return;

    try{
      await asignarPagoCuota({ id_cuota: cuotaSel.id_cuota, monto_pago: monto });
      alert("Pago asignado correctamente.");
      setOpenPago(false);
      await load(page); // refresca la tabla
    }catch(err:any){
      alert(err?.response?.data?.detail || err?.message || "Error al guardar pago.");
    }
  }

  return (
    <div style={{display:"grid",gap:"1rem"}}>
      {/* Filtros */}
      <div className="card" style={{display:"grid",gap:".7rem"}}>
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:".6rem"}}>
          <input className="input" placeholder="Buscar (venta, número, fecha…)" value={f.q} onChange={e=>setF({...f, q:e.target.value})}/>
          <input className="input" type="date" value={f.desde || ""} onChange={e=>setF({...f, desde: e.target.value || undefined})}/>
          <input className="input" type="date" value={f.hasta || ""} onChange={e=>setF({...f, hasta: e.target.value || undefined})}/>
          <input className="input" placeholder="# Venta" value={f.venta || ""} onChange={e=>setF({...f, venta: e.target.value || undefined})}/>
        </div>
        <div style={{display:"flex",gap:".5rem",justifyContent:"flex-end"}}>
          <button className="secondary" onClick={limpiar} disabled={loading}>Limpiar</button>
          <button className="secondary" onClick={exportPDF} disabled={loading}>Exportar PDF</button>
        </div>
      </div>

      {/* Tabla */}
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
            {rows.map(r=>(
              <tr key={r.id_cuota}>
                <td>#{r.id_venta}</td>
                <td>{r.numero_cuota}</td>
                <td>{r.fecha_venc_iso}</td>
                <td>Q {Number(r.monto_programado).toFixed(2)}</td>
                <td style={{display:"flex",gap:".4rem"}}>
                  {(() => {
                    const asignado = Number(r.monto_asignado || 0);
                    const programado = Number(r.monto_programado);
                    const saldo = Number(r.saldo_pendiente ?? (programado - asignado));

                    // Deshabilitar únicamente cuando el saldo esté en 0
                    const sinSaldo = saldo <= 0;
                    const disabled = sinSaldo;

                    // Etiqueta según estado
                    const label = sinSaldo
                      ? "Saldo en 0"
                      : (asignado > 0 ? "Asignar más pago" : "Asignar pago");

                    // Estilo cuando está deshabilitado (saldo en 0)
                    const styleWhenDisabled: React.CSSProperties = {
                      background: "#e6f7ed",
                      color: "#166534",
                      borderColor: "#bbf7d0",
                      cursor: "not-allowed"
                    };

                    return (
                      <button
                        onClick={() => abrirPago(r)}
                        disabled={disabled}
                        style={disabled ? styleWhenDisabled : undefined}
                        title={
                          disabled
                            ? "Esta cuota ya no tiene saldo disponible."
                            : "Registrar o incrementar pago para esta cuota"
                        }
                      >
                        {label}
                      </button>
                    );
                  })()}
                </td>
              </tr>
            ))}
            {rows.length===0 && !loading && (
              <tr><td colSpan={5} style={{padding:"1rem"}}>Sin cuotas para los filtros actuales.</td></tr>
            )}
            {loading && (
              <tr><td colSpan={5} style={{padding:"1rem"}}>Cargando…</td></tr>
            )}
          </tbody>
        </table>

        {/* Paginación simple */}
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

            {/* Info de saldos */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".6rem",marginBottom:".6rem"}}>
              <div>
                <label>Programado</label>
                <div>Q {Number(cuotaSel.monto_programado).toFixed(2)}</div>
              </div>
              <div>
                <label>Saldo pendiente</label>
                <div><b>Q {Number(cuotaSel.saldo_pendiente ?? (Number(cuotaSel.monto_programado) - Number(cuotaSel.monto_asignado||0))).toFixed(2)}</b></div>
              </div>
            </div>

            {/* Monto a pagar */}
            <div>
              <label>Monto (Q)</label>
              <input
                className="input"
                type="number"
                step="0.01"
                value={montoPago}
                onChange={e=>setMontoPago(e.target.value)}
                disabled={Number(cuotaSel.saldo_pendiente ?? 0) <= 0}
                style={ Number(cuotaSel.saldo_pendiente ?? 0) <= 0 ? {
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
