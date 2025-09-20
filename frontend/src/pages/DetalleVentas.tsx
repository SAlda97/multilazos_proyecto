import { useEffect, useMemo, useState } from "react";
import CatalogScaffold, { Row } from "./catalogos/_CatalogScaffold";
import { listDetalleVentas, createDetalleVenta, updateDetalleVenta, deleteDetalleVenta } from "../services/detalleVentas";
import { listProductos } from "../services/productos";
import type { DetalleVenta } from "../types/detalleVentas";
import type { Producto } from "../types/productos";
import { useNavigate, useParams } from "react-router-dom";

type RowExt = Row & {
  producto: string;
  cantidad: number;
  precio_unitario: number;
  costo_unitario_venta: number;
};

export default function DetalleVentas() {
  const [rows, setRows] = useState<RowExt[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [loading, setLoading] = useState(false);
  const [subtotal, setSubtotal] = useState("0.00");
  const [productos, setProductos] = useState<Producto[]>([]);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<number|null>(null);
  const [form, setForm] = useState<{ id_producto: string; cantidad: string }>({ id_producto: "", cantidad: "" });

  const navigate = useNavigate();
  const { id } = useParams();  
  const idVenta = Number(id);

  const totalPages = useMemo(()=>Math.max(1, Math.ceil(count/pageSize)),[count]);

  async function load(p=page) {
    setLoading(true);
    try {
      const res = await listDetalleVentas(idVenta);
      const mapped: RowExt[] = res.results.map((d: DetalleVenta)=>({
        id: d.id_detalle_venta,
        nombre: `#${d.id_detalle_venta}`,
        producto: d.producto,
        cantidad: Number(d.cantidad),
        precio_unitario: Number(d.precio_unitario),
        costo_unitario_venta: Number(d.costo_unitario_venta),
      }));
      setRows(mapped);
      setCount(mapped.length);
      setSubtotal(res.subtotal);
      setPage(1);
    } finally {
      setLoading(false);
    }
  }

  useEffect(()=>{
    if(!idVenta || Number.isNaN(idVenta)) return;
    (async()=> {

     const prods = await listProductos({ page:1, page_size:1000 });
     // tolerante a {results:[...]} o a [...]
     const arr = Array.isArray((prods as any)?.results) ? (prods as any).results : (prods as any);
     const safe = (Array.isArray(arr) ? arr : []).filter((p:any)=>(
       p && typeof p.id_producto !== "undefined" && typeof p.nombre_producto !== "undefined"
     ));
     setProductos(safe);
      await load(1);
    })();
  },[idVenta]); // eslint-disable-line

  function onNewClick(){
    setEditId(null);
    setForm({ id_producto:"", cantidad:"" });
    setOpen(true);
  }
  function onEditClick(row: Row){
    const r = rows.find(x=>x.id===row.id);
    if(!r) return;
    setEditId(r.id);
    setForm({ id_producto: String(productos.find(p=>p.nombre_producto===r.producto)?.id_producto ?? ""), cantidad: String(r.cantidad) });
    setOpen(true);
  }
  async function onDeleteClick(row: Row){
    const ok = confirm("¿Eliminar ítem del detalle?");
    if(!ok) return;
    try{
      setLoading(true);
      await deleteDetalleVenta(idVenta, row.id);
      await load(1);
    } finally {
      setLoading(false);
    }
  }

  async function onSave(e: React.FormEvent){
    e.preventDefault();
    if(!confirm("¿Desea guardar los cambios?")) return;

    const id_producto = Number(form.id_producto);
    const cantidad = Number(form.cantidad);
    if(!id_producto){ alert("Seleccione producto."); return; }
    if(!(cantidad > 0)){ alert("Cantidad debe ser > 0."); return; }

    try{
      setSaving(true);
      if(editId==null){
        await createDetalleVenta(idVenta, {  id_producto: Number(form.id_producto), cantidad: Number(form.cantidad) });
      }else{
        await updateDetalleVenta(idVenta, editId, { cantidad });
      }
      await load(1);
      setOpen(false);
    }catch(err:any){
      alert(err?.response?.data?.detail || err?.message || "Error al guardar.");
    }finally{
      setSaving(false);
    }
  }

  return (
    <>
      <div className="card" style={{ display:"flex", gap:".6rem", alignItems:"center", marginBottom:".6rem" }}>
        <button className="secondary" onClick={()=> navigate("/ventas")}>← Volver a Ventas</button>
        <div style={{marginLeft:".6rem"}}><b>Detalle de la venta #{idVenta}</b></div>
        <div style={{marginLeft:"auto"}}>Subtotal (SQL): <b>Q {Number(subtotal).toFixed(2)}</b></div>
      </div>

      <CatalogScaffold
        titulo="Ítems de venta"
        rows={rows}
        totalCount={rows.length}
        page={page}
        pageSize={pageSize}
        loading={loading}
        onNewClick={onNewClick}
        onEditClick={onEditClick}
        onDeleteClick={onDeleteClick}
        onPageChange={(next)=>{ /* local paging */ }}
        extraColumns={[
          { header: "Producto", render: (r)=> (r as RowExt).producto },
          { header: "Cantidad", alignRight:true, render: (r)=> (r as RowExt).cantidad.toFixed(2) },
          { header: "Precio unit.", alignRight:true, render: (r)=> (r as RowExt).precio_unitario.toFixed(2) },
          { header: "Costo unit.", alignRight:true, render: (r)=> (r as RowExt).costo_unitario_venta.toFixed(2) },
        ]}
        exportPdf={{
          filename: `detalle-venta-${idVenta}.pdf`,
          headers: ["ID Det.", "Producto", "Cantidad", "Precio unit.", "Costo unit."],
          mapRow: (r)=>{
            const d = r as RowExt;
            return [d.id, d.producto, d.cantidad.toFixed(2), d.precio_unitario.toFixed(2), d.costo_unitario_venta.toFixed(2)];
          },
          footerNote: `Venta #${idVenta} • Exportado desde Multilazos`,
          confirm: true,
          confirmMessage: "¿Desea exportar el PDF del detalle (página visible)?",
        }}
      />

      {open && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.25)", display:"grid", placeItems:"center", zIndex:50 }}>
          <form className="card" onSubmit={onSave} style={{ minWidth: 560, width:"min(820px,95vw)" }}>
            <h3 style={{marginTop:0}}>{editId==null ? "Agregar producto" : "Editar cantidad"}</h3>

            <div style={{ display:"grid", gap:".8rem", gridTemplateColumns:"2fr 1fr" }}>
              <div>
                <label>Producto</label>
                <select
                  className="input"
                  value={form.id_producto}
                  onChange={e=>setForm(f=>({ ...f, id_producto: e.target.value }))}
                  disabled={editId!=null} // no cambiar producto en edición
                >
                  <option value="">Seleccione…</option>
                  {productos.map(p=>(
                    <option key={p.id_producto} value={p.id_producto}>{p.nombre_producto}</option>
                  ))}
                </select>
              </div>

              <div>
                <label>Cantidad</label>
                <input className="input" type="number" step="0.01" min="0" value={form.cantidad}
                  onChange={e=>setForm(f=>({ ...f, cantidad: e.target.value }))}/>
              </div>
            </div>

            <div style={{ display:"flex", gap:".6rem", justifyContent:"flex-end", marginTop:"1rem" }}>
              <button type="button" className="secondary" onClick={()=>setOpen(false)} disabled={saving}>Cancelar</button>
              <button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</button>
            </div>
            <div style={{marginTop:".6rem", fontSize:12, opacity:.7}}>
              * El precio y costo se toman automáticamente del producto y el subtotal lo calcula SQL.
            </div>
          </form>
        </div>
      )}
    </>
  );
}
