import { useMemo, useState } from "react";
import EmptyState from "../components/EmptyState";

/**
 * Alineado al script:
 * - Tabla base: cuota_creditos (id_cuota, id_venta, numero_cuota, id_fecha_venc, monto_programado)
 * - Vista v_cuotas_estado: (id_cuota, id_venta, numero_cuota, id_fecha_venc, monto_programado, monto_pagado, saldo_pendiente, estado)
 * En UI usamos fecha ISO (yyyy-mm-dd). El mapeo a dim_fecha se hará en backend.
 */

type EstadoCuota = "pendiente" | "parcial" | "pagada";

type TCuota = {
  id: number;
  idVenta: number;
  numero: number;
  fechaVenc: string;          // ISO en UI
  montoProgramado: number;
  montoPagado: number;        // agregado en UI para “simular” v_cuotas_estado
  saldo: number;              // programado - pagado
  estado: EstadoCuota;
};

export default function Cuotas(){
  // Datos en memoria (UI)
  const [data, setData] = useState<TCuota[]>([]);

  // Filtros
  const [q, setQ] = useState("");                         // busca por venta o número
  const [estado, setEstado] = useState<"todas" | EstadoCuota>("todas");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  // Modal CRUD de cuota
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number|null>(null);
  const [form, setForm] = useState<{
    idVenta: number|string;
    numero: number|string;
    fechaVenc: string;
    montoProgramado: number|string;
  }>({ idVenta:"", numero:"", fechaVenc:"", montoProgramado:"" });

  // Modal simple para “asignar pago” (UI)
  const [openPago, setOpenPago] = useState(false);
  const [cuotaPagoId, setCuotaPagoId] = useState<number|null>(null);
  const [montoPago, setMontoPago] = useState<number|string>("");

  // Filtrado
  const filtered = useMemo(()=>{
    return data.filter(c => {
      const texto = [`venta:${c.idVenta}`, `n:${c.numero}`, c.estado, c.fechaVenc].join(" ").toLowerCase();
      const okTexto = texto.includes(q.toLowerCase());
      const okEstado = (estado==="todas") || c.estado===estado;
      const okDesde = !desde || c.fechaVenc >= desde;
      const okHasta = !hasta || c.fechaVenc <= hasta;
      return okTexto && okEstado && okDesde && okHasta;
    });
  }, [data,q,estado,desde,hasta]);

  // Totales (período filtrado)
  const totales = useMemo(()=>{
    const base = { programado:0, pagado:0, saldo:0 };
    for(const c of filtered){
      base.programado += c.montoProgramado;
      base.pagado    += c.montoPagado;
      base.saldo     += c.saldo;
    }
    return base;
  }, [filtered]);

  // Paginación simple
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageData = useMemo(()=>{
    const i = (page-1)*pageSize;
    return filtered.slice(i, i+pageSize);
  }, [filtered,page]);
  function limpiar(){ setQ(""); setEstado("todas"); setDesde(""); setHasta(""); setPage(1); }

  // Helpers de estado (UI, sin validaciones)
  function calcularEstado(montoProgramado: number, montoPagado: number): EstadoCuota{
    if(montoPagado <= 0) return "pendiente";
    if(montoPagado < montoProgramado) return "parcial";
    return "pagada";
  }

  // CRUD (sin validaciones)
  function onNew(){
    setEditId(null);
    setForm({ idVenta:"", numero:"", fechaVenc:"", montoProgramado:"" });
    setOpen(true);
  }
  function onEdit(id:number){
    const c = data.find(x=>x.id===id); if(!c) return;
    setEditId(id);
    setForm({
      idVenta: c.idVenta,
      numero: c.numero,
      fechaVenc: c.fechaVenc,
      montoProgramado: c.montoProgramado,
    });
    setOpen(true);
  }
  function onDelete(id:number){
    if(confirm("¿Eliminar cuota? (UI)")) setData(d=>d.filter(x=>x.id!==id));
  }
  function onSave(e:React.FormEvent){
    e.preventDefault();
    const idVenta = Number(form.idVenta || 0);
    const numero = Number(form.numero || 0);
    const montoProgramado = Number(form.montoProgramado || 0);
    const fechaVenc = form.fechaVenc || "";

    if(editId==null){
      const next = Math.max(0, ...data.map(x=>x.id)) + 1;
      const montoPagado = 0;
      const saldo = +(montoProgramado - montoPagado).toFixed(2);
      const est = calcularEstado(montoProgramado, montoPagado);
      setData(d=>[...d, {
        id: next, idVenta, numero, fechaVenc,
        montoProgramado, montoPagado, saldo, estado: est
      }]);
    }else{
      setData(d=>d.map(x=>{
        if(x.id!==editId) return x;
        const montoPagado = x.montoPagado; // mantenemos pagos ya “registrados” en UI
        const saldo = +(montoProgramado - montoPagado).toFixed(2);
        const est = calcularEstado(montoProgramado, montoPagado);
        return { ...x, idVenta, numero, fechaVenc, montoProgramado, saldo, estado: est };
      }));
    }
    setOpen(false);
  }

  // “Asignar pago” (UI sin validación)
  function abrirPago(id:number){
    setCuotaPagoId(id);
    setMontoPago("");
    setOpenPago(true);
  }
  function guardarPago(e:React.FormEvent){
    e.preventDefault();
    const m = Number(montoPago || 0);
    setData(d=>d.map(x=>{
      if(x.id!==cuotaPagoId) return x;
      const nuevoPagado = +(x.montoPagado + m).toFixed(2);
      const nuevoSaldo = +(x.montoProgramado - nuevoPagado).toFixed(2);
      const est = calcularEstado(x.montoProgramado, nuevoPagado);
      return { ...x, montoPagado: nuevoPagado, saldo: nuevoSaldo, estado: est };
    }));
    setOpenPago(false);
  }

  return (
    <div style={{display:"grid",gap:"1rem"}}>
      {/* Filtros */}
      <div className="card" style={{display:"grid",gap:".7rem",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr"}}>
        <input className="input" placeholder="Buscar (venta, número, estado…)" value={q} onChange={e=>setQ(e.target.value)} />
        <select className="select" value={estado} onChange={e=>setEstado(e.target.value as any)}>
          <option value="todas">Todas</option>
          <option value="pendiente">Pendiente</option>
          <option value="parcial">Parcial</option>
          <option value="pagada">Pagada</option>
        </select>
        <input className="input" type="date" value={desde} onChange={e=>setDesde(e.target.value)} />
        <input className="input" type="date" value={hasta} onChange={e=>setHasta(e.target.value)} />
        <div style={{display:"flex",gap:".5rem"}}>
          <button className="secondary" onClick={limpiar} style={{width:"100%"}}>Limpiar</button>
          <button onClick={onNew} style={{width:"100%"}}>+ Nueva cuota</button>
        </div>
      </div>

      {/* Totales del período visible */}
      <div className="card" style={{display:"flex",gap:"1rem",alignItems:"center",flexWrap:"wrap"}}>
        <b>Totales (selección):</b>
        <div>Programado: <b>Q {totales.programado.toFixed(2)}</b></div>
        <div>Pagado: <b>Q {totales.pagado.toFixed(2)}</b></div>
        <div>Saldo: <b>Q {totales.saldo.toFixed(2)}</b></div>
        <div style={{marginLeft:"auto",display:"flex",gap:".5rem"}}>
          <button className="secondary">Exportar CSV (UI)</button>
          <button className="secondary">Imprimir (UI)</button>
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
              <th>Pagado</th>
              <th>Saldo</th>
              <th>Estado</th>
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
                <td>Q {c.montoPagado.toFixed(2)}</td>
                <td>Q {c.saldo.toFixed(2)}</td>
                <td>
                  <span className="badge" style={{
                    background: c.estado==="pagada" ? "#e6f7ed" : c.estado==="parcial" ? "#fff5e6" : "#fdecec",
                    color:      c.estado==="pagada" ? "#177245" : c.estado==="parcial" ? "#7a4e00" : "#b3261e"
                  }}>{c.estado}</span>
                </td>
                <td style={{display:"flex",gap:".4rem"}}>
                  <button onClick={()=>abrirPago(c.id)}>Asignar pago (UI)</button>
                  <button className="secondary" onClick={()=>onEdit(c.id)}>Editar</button>
                  <button className="warn" onClick={()=>onDelete(c.id)}>Eliminar</button>
                </td>
              </tr>
            ))}
            {pageData.length===0 && (
              <tr>
                <td colSpan={8}>
                  <EmptyState
                    title="No hay cuotas"
                    subtitle="Crea una cuota para una venta. Al conectar el backend, se poblarán desde la vista v_cuotas_estado."
                    actionLabel="+ Nueva cuota"
                    onAction={onNew}
                  />
                </td>
              </tr>
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

      {/* Modal CRUD de cuota (sin validaciones) */}
      {open && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.25)",display:"grid",placeItems:"center",zIndex:50}}>
          <form className="card" onSubmit={onSave} style={{minWidth:380,width:"min(720px, 95vw)"}}>
            <h3 style={{marginTop:0}}>{editId==null?"Nueva cuota":"Editar cuota"}</h3>
            <div style={{display:"grid",gap:".6rem",gridTemplateColumns:"1fr 1fr 1fr 1fr"}}>
              <div>
                <label>ID venta</label>
                <input className="input" value={form.idVenta} onChange={e=>setForm({...form,idVenta:e.target.value})}/>
              </div>
              <div>
                <label>N° cuota</label>
                <input className="input" value={form.numero} onChange={e=>setForm({...form,numero:e.target.value})}/>
              </div>
              <div>
                <label>Vencimiento</label>
                <input className="input" type="date" value={form.fechaVenc} onChange={e=>setForm({...form,fechaVenc:e.target.value})}/>
              </div>
              <div>
                <label>Monto programado (Q)</label>
                <input className="input" type="number" step={0.01} value={form.montoProgramado} onChange={e=>setForm({...form,montoProgramado:e.target.value})}/>
              </div>
            </div>
            <div style={{display:"flex",gap:".6rem",justifyContent:"flex-end",marginTop:"1rem"}}>
              <button type="button" className="secondary" onClick={()=>setOpen(false)}>Cancelar</button>
              <button type="submit">Guardar</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Asignar pago (UI sin validación) */}
      {openPago && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.25)",display:"grid",placeItems:"center",zIndex:50}}>
          <form className="card" onSubmit={guardarPago} style={{minWidth:320,width:"min(520px, 95vw)"}}>
            <h3 style={{marginTop:0}}>Asignar pago a cuota</h3>
            <div style={{display:"grid",gap:".6rem",gridTemplateColumns:"1fr 1fr"}}>
              <div style={{gridColumn:"1 / -1"}}>
                <label>Monto a asignar (Q)</label>
                <input className="input" type="number" step={0.01} value={montoPago} onChange={e=>setMontoPago(e.target.value)} />
              </div>
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
