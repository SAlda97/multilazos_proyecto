import { useEffect, useMemo, useState } from "react";
import { DetalleStore, Detalle, VentaRef } from "./ventas/_detalleStore";

type FormState = {
  id_detalle_venta: number;
  id_venta: number;
  id_producto: number;
  cantidad: number;
  precio_unitario: number;
  costo_unitario_venta: number;
};

export default function DetalleVentas(){
  const [db, setDb] = useState(DetalleStore.getAll());

  // venta seleccionada (para mostrar sus líneas)
  const [ventaSel, setVentaSel] = useState<number>(db.ventas[0]?.id_venta ?? 0);

  // buscador (por producto / id)
  const [q, setQ] = useState("");

  // CRUD modal
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<FormState | null>(null);

  useEffect(()=>{ setDb(DetalleStore.getAll()); }, [open]);

  const ventaInfo: VentaRef | undefined = useMemo(
    ()=> db.ventas.find(v=>v.id_venta===ventaSel),
    [db, ventaSel]
  );

  const rows = useMemo(()=>{
    const r = db.detalles.filter(d=>d.id_venta===ventaSel);
    if(!q) return r;
    const texto = q.toLowerCase();
    return r.filter(d=>{
      const prod = db.productos.find(p=>p.id_producto===d.id_producto)?.nombre_producto ?? "";
      return [d.id_detalle_venta, d.id_producto, prod].join(" ").toLowerCase().includes(texto);
    });
  }, [db, ventaSel, q]);

  const totales = useMemo(()=>{
    const total = rows.reduce((acc, d)=> acc + d.cantidad * d.precio_unitario, 0);
    const totalCosto = rows.reduce((acc, d)=> acc + d.cantidad * d.costo_unitario_venta, 0);
    const margen = total - totalCosto;
    return { total, totalCosto, margen, lineas: rows.length };
  }, [rows]);

  function limpiar(){
    setQ("");
  }

  // CRUD
  function onNew(){
    setEdit({
      id_detalle_venta: 0,
      id_venta: ventaSel,
      id_producto: db.productos[0]?.id_producto ?? 0,
      cantidad: 1,
      precio_unitario: 0,
      costo_unitario_venta: 0
    });
    setOpen(true);
  }

  function onEditRow(d: Detalle){
    setEdit({...d});
    setOpen(true);
  }

  function onDeleteRow(id:number){
    if(confirm("¿Eliminar línea de venta? (UI)")){
      DetalleStore.delete(id);
      setDb(DetalleStore.getAll());
    }
  }

  function onSave(e: React.FormEvent){
    e.preventDefault();
    if(!edit) return;
    if(edit.id_detalle_venta===0){
      DetalleStore.create({
        id_venta: edit.id_venta,
        id_producto: edit.id_producto,
        cantidad: Number(edit.cantidad||0),
        precio_unitario: Number(edit.precio_unitario||0),
        costo_unitario_venta: Number(edit.costo_unitario_venta||0),
      });
    }else{
      DetalleStore.update({
        id_detalle_venta: edit.id_detalle_venta,
        id_venta: edit.id_venta,
        id_producto: edit.id_producto,
        cantidad: Number(edit.cantidad||0),
        precio_unitario: Number(edit.precio_unitario||0),
        costo_unitario_venta: Number(edit.costo_unitario_venta||0),
      });
    }
    setOpen(false);
  }

  return (
    <div style={{display:"grid", gap:"1rem"}}>
      {/* Encabezado / filtros */}
      <div className="card" style={{display:"grid", gap:".8rem"}}>
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:".6rem"}}>
          <div>
            <label>Venta</label>
            <select className="select" value={ventaSel} onChange={e=>setVentaSel(Number(e.target.value))}>
              {db.ventas.map(v=>(
                <option key={v.id_venta} value={v.id_venta}>#{v.id_venta} • {v.cliente} ({v.tipo_transaccion})</option>
              ))}
            </select>
          </div>
          <div>
            <label>Buscar producto / ID</label>
            <input className="input" placeholder="Texto…" value={q} onChange={e=>setQ(e.target.value)} />
          </div>
          <div style={{display:"flex", gap:".6rem", alignItems:"flex-end", justifyContent:"flex-end"}}>
            <button className="secondary" onClick={limpiar}>Limpiar</button>
            <button onClick={onNew}>+ Agregar línea</button>
          </div>
        </div>

        {ventaInfo && (
          <div style={{opacity:.8}}>
            <b>Cliente:</b> {ventaInfo.cliente} &nbsp;•&nbsp; <b>Tipo:</b> {ventaInfo.tipo_transaccion}
          </div>
        )}
      </div>

      {/* Totales visibles */}
      <div className="card" style={{display:"flex", gap:"1rem", alignItems:"center", flexWrap:"wrap"}}>
        <b>Detalle de ventas</b>
        <span style={{opacity:.8}}>Líneas: <b>{totales.lineas}</b></span>
        <span style={{opacity:.8}}>Total venta: <b>Q {totales.total.toFixed(2)}</b></span>
        <span style={{opacity:.8}}>Total costo: <b>Q {totales.totalCosto.toFixed(2)}</b></span>
        <span style={{opacity:.8}}>Margen: <b>Q {totales.margen.toFixed(2)}</b></span>
        <div style={{marginLeft:"auto", display:"flex", gap:".5rem"}}>
          <button className="secondary">Exportar CSV (UI)</button>
          <button className="secondary">Imprimir (UI)</button>
        </div>
      </div>

      {/* Tabla */}
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th style={{width:90}}>#Detalle</th>
              <th style={{minWidth:220}}>Producto</th>
              <th style={{width:120, textAlign:"right"}}>Cantidad</th>
              <th style={{width:140, textAlign:"right"}}>Precio (Q)</th>
              <th style={{width:160, textAlign:"right"}}>Costo histórico (Q)</th>
              <th style={{width:140, textAlign:"right"}}>Subtotal (Q)</th>
              <th style={{width:240}}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(d=>{
              const prod = db.productos.find(p=>p.id_producto===d.id_producto)?.nombre_producto ?? "—";
              const subtotal = d.cantidad * d.precio_unitario;
              return (
                <tr key={d.id_detalle_venta}>
                  <td>#{d.id_detalle_venta}</td>
                  <td>{prod}</td>
                  <td style={{textAlign:"right"}}>{d.cantidad}</td>
                  <td style={{textAlign:"right"}}>Q {d.precio_unitario.toFixed(2)}</td>
                  <td style={{textAlign:"right"}}>Q {d.costo_unitario_venta.toFixed(2)}</td>
                  <td style={{textAlign:"right"}}><b>Q {subtotal.toFixed(2)}</b></td>
                  <td style={{display:"flex", gap:".4rem"}}>
                    <button className="secondary" onClick={()=>onEditRow(d)}>Editar</button>
                    <button className="warn" onClick={()=>onDeleteRow(d.id_detalle_venta)}>Eliminar</button>
                  </td>
                </tr>
              );
            })}
            {rows.length===0 && (
              <tr><td colSpan={7} style={{padding:"1rem"}}>Sin líneas para esta venta (UI).</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal CRUD */}
      {open && edit && (
        <div style={{position:"fixed", inset:0, background:"rgba(0,0,0,.25)", display:"grid", placeItems:"center", zIndex:50}}>
          <form className="card" onSubmit={onSave} style={{minWidth:420, width:"min(760px,95vw)"}}>
            <h3 style={{marginTop:0}}>{edit.id_detalle_venta===0 ? "Agregar línea" : `Editar línea #${edit.id_detalle_venta}`}</h3>

            <div style={{display:"grid", gap:".8rem", gridTemplateColumns:"1fr 1fr"}}>
              <div style={{gridColumn:"1 / span 2"}}>
                <label>Producto</label>
                <select className="select" value={edit.id_producto} onChange={e=>setEdit({...edit, id_producto:Number(e.target.value)})}>
                  {db.productos.map(p=>(
                    <option key={p.id_producto} value={p.id_producto}>{p.nombre_producto}</option>
                  ))}
                </select>
              </div>

              <div>
                <label>Cantidad</label>
                <input className="input" value={String(edit.cantidad)} onChange={e=>setEdit({...edit, cantidad:Number(e.target.value)||0})}/>
              </div>

              <div>
                <label>Precio unitario (Q)</label>
                <input className="input" value={String(edit.precio_unitario)} onChange={e=>setEdit({...edit, precio_unitario:Number(e.target.value)||0})}/>
              </div>

              <div>
                <label>Costo histórico (Q)</label>
                <input className="input" value={String(edit.costo_unitario_venta)} onChange={e=>setEdit({...edit, costo_unitario_venta:Number(e.target.value)||0})}/>
              </div>

              <div style={{alignSelf:"end", justifySelf:"end"}}>
                <div style={{opacity:.7, fontSize:12}}>Subtotal</div>
                <div style={{fontWeight:700}}>
                  Q { ( (Number(edit.cantidad)||0) * (Number(edit.precio_unitario)||0) ).toFixed(2) }
                </div>
              </div>
            </div>

            <div style={{display:"flex", gap:".6rem", justifyContent:"flex-end", marginTop:"1rem"}}>
              <button type="button" className="secondary" onClick={()=>setOpen(false)}>Cancelar</button>
              <button type="submit">Guardar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
