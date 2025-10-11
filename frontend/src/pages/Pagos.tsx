// src/pages/Pagos.tsx
import { useEffect, useMemo, useState } from "react";
import type { Pago } from "../types/pagos";
import { listPagos, createPago, updatePago, deletePago } from "../services/pagos";
import { listVentasRefs, type VentaRef } from "../services/ventasRefs";
import { listVentas } from "../services/ventas"; 

// PDF
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Filtros = {
  q: string; tipo: "Todos" | "Contado" | "Crédito";
  desde?: string; hasta?: string; min?: string; max?: string;
};

export default function Pagos() {
  const [f, setF] = useState<Filtros>({ q: "", tipo: "Todos" });
  const [rows, setRows] = useState<Pago[]>([]);
  const [ventas, setVentas] = useState<VentaRef[]>([]);
  const [loading, setLoading] = useState(false);

  // modal CRUD
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<null | { id_pago:number; id_venta:number; fecha_iso:string; monto_pago:number }>(null);

  type VentaOption = {
    id_venta: number;
    cliente: string;
    tipo_transaccion: string;
    id_tipo_transaccion?: number;
  };

  const [ventasCredito, setVentasCredito] = useState<VentaOption[]>([]);

  async function load() {
    setLoading(true);
    try {
      const [ventasRes, pagosRes] = await Promise.all([
        listVentasRefs(),
        listPagos({
          q: f.q || undefined,
          tipo: f.tipo !== "Todos" ? f.tipo : undefined,
          desde: f.desde || undefined,
          hasta: f.hasta || undefined,
          min: f.min || undefined,
          max: f.max || undefined,
          page: 1,
          page_size: 1000
        })
      ]);
      setVentas(ventasRes);
      setRows(pagosRes.results);
    } finally { setLoading(false); }
  }

  useEffect(()=>{ load(); }, []); // eslint-disable-line
  useEffect(()=>{ load(); }, [f.q, f.tipo, f.desde, f.hasta, f.min, f.max]); // eslint-disable-line

  useEffect(() => {
    (async () => {
      try {
        // Trae solo ventas a crédito (id_tipo_transaccion=2)
        const res = await listVentas({ page: 1, page_size: 1000, id_tipo_transaccion: 2 });

        // Tolera {results:[...]} o arreglo directo
        const arr = Array.isArray((res as any)?.results) ? (res as any).results : (res as any);

        const mapped: VentaOption[] = (arr || [])
          .map((v: any) => ({
            id_venta: v.id_venta,
            cliente:
              v.cliente ??
              `${v?.id_cliente?.nombre_cliente ?? ""} ${v?.id_cliente?.apellido_cliente ?? ""}`.trim(),
            tipo_transaccion:
              v.tipo_transaccion ?? ((v.id_tipo_transaccion === 2) ? "Crédito" : "Contado"),
            id_tipo_transaccion: v.id_tipo_transaccion ?? v.tipo_transaccion_id ?? undefined,
          }))
          .filter((v: VentaOption) => (v.id_tipo_transaccion ?? 2) === 2);

        setVentasCredito(mapped);
      } catch {
        setVentasCredito([]);
      }
    })();
  }, []);

  const rowsEnriquecidos = useMemo(()=> {
    const map = new Map<number, VentaRef>(ventas.map(v=>[v.id_venta, v]));
    return rows.map(p => ({ ...p, venta: map.get(p.id_venta) || p.venta }));
  }, [rows, ventas]);

  const totales = useMemo(()=>({
    registros: rowsEnriquecidos.length,
    monto: rowsEnriquecidos.reduce((acc, r)=>acc + (r.monto_pago||0), 0)
  }), [rowsEnriquecidos]);

  function limpiar() { setF({ q:"", tipo:"Todos" }); }

  function onNew() {
    const defaultVenta = ventas[0]?.id_venta ?? 0;
    setEdit({ id_pago:0, id_venta: defaultVenta, fecha_iso: new Date().toISOString().slice(0,10), monto_pago: 0 });
    setOpen(true);
  }
  function onEdit(p: Pago) {
    setEdit({ id_pago: p.id_pago, id_venta: p.id_venta, fecha_iso: p.fecha_iso, monto_pago: p.monto_pago });
    setOpen(true);
  }
  async function onDelete(id:number){
    if(!confirm("¿Eliminar pago?")) return;
    await deletePago(id);
    await load();
  }
  async function onSave(e:React.FormEvent){
    e.preventDefault();
    if(!edit) return;
    if(!confirm(edit.id_pago===0 ? "¿Confirmar creación del pago?" : "¿Guardar cambios del pago?")) return;
    if(edit.id_pago===0){
      await createPago({ id_venta: edit.id_venta, fecha_iso: edit.fecha_iso, monto_pago: Number(edit.monto_pago||0) });
    }else{
      await updatePago(edit.id_pago, { fecha_iso: edit.fecha_iso, monto_pago: Number(edit.monto_pago||0) });
    }
    setOpen(false);
    await load();
  }

  function exportPDF(){
    if(!confirm("¿Desea exportar los pagos filtrados a PDF?")) return;
    const doc = new jsPDF({ unit:"pt", format:"a4" });
    doc.setFont("helvetica","bold"); doc.setFontSize(14);
    doc.text(`Pagos (${rowsEnriquecidos.length} registros)`, 40, 40);

    const filtros = [
      f.q ? `Buscar="${f.q}"` : null,
      f.tipo!=="Todos" ? `Tipo=${f.tipo}` : null,
      f.desde ? `Desde=${f.desde}` : null,
      f.hasta ? `Hasta=${f.hasta}` : null,
      f.min ? `Min=${f.min}` : null,
      f.max ? `Max=${f.max}` : null,
    ].filter(Boolean).join(" • ");
    if(filtros){ doc.setFont("helvetica","normal"); doc.setFontSize(10); doc.text(filtros, 40, 58); }

    const head = [["#Pago", "Fecha", "#Venta", "Cliente", "Tipo", "Monto (Q)"]];
    const body = rowsEnriquecidos.map(r=>[
      `#${r.id_pago}`, r.fecha_iso, `#${r.id_venta}`,
      r.venta?.cliente ?? "—", r.venta?.tipo_transaccion ?? "—",
      (r.monto_pago ?? 0).toFixed(2),
    ]);

    autoTable(doc, {
      startY: 70, head, body,
      styles:{ fontSize: 9 }, headStyles:{ fillColor: [42,106,195] }, theme:"striped",
      columnStyles:{ 0:{cellWidth:70}, 1:{cellWidth:90}, 2:{cellWidth:70}, 3:{cellWidth:160}, 4:{cellWidth:90}, 5:{cellWidth:90} },
      margin:{ left:40, right:40 },
      didDrawPage: data=>{
        const ps = doc.internal.pageSize;
        doc.setFontSize(8); doc.setTextColor(120);
        doc.text("Exportado desde Multilazos", 40, ps.height - 24);
        doc.text(`Página ${doc.getCurrentPageInfo().pageNumber}`, ps.width - 80, ps.height - 24);
      }
    });

    doc.save("pagos.pdf");
  }

  return (
    <div style={{ display:"grid", gap:"1rem" }}>
      {/* Filtros */}
      <div className="card" style={{ display:"grid", gap:".6rem" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 160px 140px 140px 140px 140px", gap:".6rem" }}>
          <input className="input" placeholder="Buscar (cliente, #venta, #pago)…"
            value={f.q} onChange={e=>setF({...f, q:e.target.value})}/>
          <select className="select" value={f.tipo} onChange={e=>setF({...f, tipo: e.target.value as any})}>
            <option>Todos</option>
            <option>Contado</option>
            <option>Crédito</option>
          </select>
          <input className="input" type="date" value={f.desde ?? ""} onChange={e=>setF({...f, desde:e.target.value||undefined})}/>
          <input className="input" type="date" value={f.hasta ?? ""} onChange={e=>setF({...f, hasta:e.target.value||undefined})}/>
          <input className="input" placeholder="Monto mín." value={f.min ?? ""} onChange={e=>setF({...f, min:e.target.value})}/>
          <input className="input" placeholder="Monto máx." value={f.max ?? ""} onChange={e=>setF({...f, max:e.target.value})}/>
        </div>
        <div style={{ display:"flex", gap:".6rem", justifyContent:"flex-end" }}>
          <button className="secondary" onClick={()=>limpiar()} disabled={loading}>Limpiar</button>
          <button className="secondary" onClick={exportPDF} disabled={loading}>Exportar PDF</button>
        </div>
      </div>

      {/* Totales */}
      <div className="card" style={{ display:"flex", gap:"1.2rem", alignItems:"center" }}>
        <b>Pagos</b>
        <span style={{ opacity:.8 }}>Registros: <b>{totales.registros}</b></span>
        <span style={{ opacity:.8 }}>Monto total (filtro): <b>Q {totales.monto.toFixed(2)}</b></span>
        <div style={{ marginLeft:"auto" }}>{loading ? "Cargando…" : " "}</div>
      </div>

      {/* Tabla */}
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th style={{width:90}}>#Pago</th>
              <th style={{width:110}}>Fecha</th>
              <th style={{width:120}}>#Venta</th>
              <th>Cliente</th>
              <th style={{width:120}}>Tipo</th>
              <th style={{width:140}}>Monto (Q)</th>
              <th style={{width:280}}></th>
            </tr>
          </thead>
          <tbody>
            {rowsEnriquecidos.map(p=>(
              <tr key={p.id_pago}>
                <td>#{p.id_pago}</td>
                <td>{p.fecha_iso}</td>
                <td>#{p.id_venta}</td>
                <td>{p.venta?.cliente ?? "—"}</td>
                <td>{p.venta?.tipo_transaccion ?? "—"}</td>
                <td>Q {(p.monto_pago||0).toFixed(2)}</td>
                <td style={{display:"flex", gap:".4rem"}}>
                  <button className="secondary" onClick={()=>onEdit(p)}>Editar</button>
                  <button className="warn" onClick={()=>onDelete(p.id_pago)}>Eliminar</button>
                </td>
              </tr>
            ))}
            {rowsEnriquecidos.length===0 && !loading && (
              <tr><td colSpan={7} style={{padding:"1rem"}}>Sin datos para los filtros actuales.</td></tr>
            )}
            {loading && (
              <tr><td colSpan={7} style={{padding:"1rem"}}>Cargando…</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal CRUD */}
      {open && edit && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.25)", display:"grid", placeItems:"center", zIndex:50 }}>
          <form className="card" onSubmit={onSave} style={{ minWidth:420, width:"min(760px,95vw)" }}>
            <h3 style={{marginTop:0}}>{edit.id_pago===0 ? "Nuevo pago" : `Editar pago #${edit.id_pago}`}</h3>
            <div style={{ display:"grid", gap:".8rem", gridTemplateColumns:"1fr 1fr" }}>
              <div>
                <label>Venta</label>
                <select className="select" value={edit.id_venta} onChange={e=>setEdit({...edit!, id_venta:Number(e.target.value)})}>
                  {ventasCredito.map((v: VentaOption) => (
                    <option key={v.id_venta} value={v.id_venta}>
                      #{v.id_venta} • {v.cliente} ({v.tipo_transaccion})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>Fecha</label>
                <input type="date" className="input" value={edit.fecha_iso} onChange={e=>setEdit({...edit!, fecha_iso:e.target.value})}/>
              </div>
              <div>
                <label>Monto (Q)</label>
                <input className="input" type="number" step="0.01"
                  value={String(edit.monto_pago)}
                  onChange={e=>setEdit({...edit!, monto_pago:Number(e.target.value)||0})}/>
              </div>
            </div>
            <div style={{ display:"flex", gap:".6rem", justifyContent:"flex-end", marginTop:"1rem" }}>
              <button type="button" className="secondary" onClick={()=>setOpen(false)}>Cancelar</button>
              <button type="submit">{edit.id_pago===0 ? "Crear" : "Guardar"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
