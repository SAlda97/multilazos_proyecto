import { useMemo, useState } from "react";
import EmptyState from "../components/EmptyState";

type TProducto = {
  id: number;
  codigo: string;
  nombre: string;
  categoria: string;
  unidad: "Unidad" | "Caja" | "Paquete" | "Metro" | "Kg";
  costo: number;        // costo de compra
  precio: number;       // precio de venta
  stock: number;
  stockMin: number;
  estado: "Activo" | "Inactivo";
  imagenUrl?: string;   // solo para evidencia UI (no sube aún)
};

function validar(p: Omit<TProducto,"id">){
  const e: Record<string,string> = {};
  if(!p.codigo.trim()) e.codigo = "Código obligatorio.";
  if(!p.nombre.trim()) e.nombre = "Nombre obligatorio.";
  if(!p.categoria.trim()) e.categoria = "Categoría obligatoria.";
  if(p.costo < 0) e.costo = "Costo ≥ 0.";
  if(p.precio < 0) e.precio = "Precio ≥ 0.";
  if(p.precio < p.costo) e.precio = "Precio no puede ser menor que costo.";
  if(p.stock < 0) e.stock = "Stock ≥ 0.";
  if(p.stockMin < 0) e.stockMin = "Stock mínimo ≥ 0.";
  return e;
}

export default function Productos(){
  // Sin datos (UI)
  const [data, setData] = useState<TProducto[]>([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("Todas");
  const [estado, setEstado] = useState<"Todos"|"Activo"|"Inactivo">("Todos");
  const [stockFlag, setStockFlag] = useState<"Todos"|"Bajo stock">("Todos");

  // Modal / Form
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number|null>(null);
  const [form, setForm] = useState<Omit<TProducto,"id">>({
    codigo:"", nombre:"", categoria:"", unidad:"Unidad",
    costo:0, precio:0, stock:0, stockMin:0, estado:"Activo", imagenUrl:""
  });
  const [errors, setErrors] = useState<Record<string,string>>({});

  // categorías dinámicas desde data (aunque vacías)
  const categorias = useMemo(()=>{
    const set = new Set(data.map(d=>d.categoria).filter(Boolean));
    return ["Todas", ...Array.from(set).sort()];
  }, [data]);

  const filtered = useMemo(()=>{
    return data.filter(p=>{
      const texto = [p.codigo,p.nombre,p.categoria,p.unidad,p.estado].join(" ").toLowerCase();
      const okTexto = texto.includes(q.toLowerCase());
      const okCat = (cat==="Todas") || p.categoria===cat;
      const okEstado = (estado==="Todos") || p.estado===estado;
      const okStock = (stockFlag==="Todos") || (p.stock <= p.stockMin);
      return okTexto && okCat && okEstado && okStock;
    });
  }, [data,q,cat,estado,stockFlag]);

  function onNew(){
    setEditId(null);
    setForm({codigo:"",nombre:"",categoria:"",unidad:"Unidad",costo:0,precio:0,stock:0,stockMin:0,estado:"Activo",imagenUrl:""});
    setErrors({}); setOpen(true);
  }
  function onEdit(id:number){
    const p = data.find(x=>x.id===id); if(!p) return;
    const {id:_, ...rest} = p; setForm(rest); setEditId(id); setErrors({}); setOpen(true);
  }
  function onDelete(id:number){
    if(confirm("¿Eliminar producto? (UI)")) setData(d=>d.filter(x=>x.id!==id));
  }
  function onSave(e:React.FormEvent){
    e.preventDefault();
    const v = validar(form); setErrors(v);
    if(Object.keys(v).length) return;

    if(editId==null){
      const next = Math.max(0, ...data.map(x=>x.id)) + 1;
      setData(d=>[...d,{id:next, ...form}]);
    }else{
      setData(d=>d.map(x=>x.id===editId?({id:editId, ...form}):x));
    }
    setOpen(false);
  }
  function resetFiltros(){ setQ(""); setCat("Todas"); setEstado("Todos"); setStockFlag("Todos"); }

  // Paginación simple
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const total = Math.max(1, Math.ceil(filtered.length/pageSize));
  const pageData = useMemo(()=>{
    const i = (page-1)*pageSize; return filtered.slice(i, i+pageSize);
  }, [filtered,page]);

  return (
    <div style={{display:"grid",gap:"1rem"}}>
      {/* Filtros */}
      <div className="card" style={{display:"grid",gap:".7rem",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr"}}>
        <input className="input" placeholder="Buscar por código, nombre, categoría…" value={q} onChange={e=>setQ(e.target.value)} />
        <select className="select" value={cat} onChange={e=>setCat(e.target.value)}>
          {categorias.map(c => <option key={c}>{c}</option>)}
        </select>
        <select className="select" value={estado} onChange={e=>setEstado(e.target.value as any)}>
          <option>Todos</option><option>Activo</option><option>Inactivo</option>
        </select>
        <select className="select" value={stockFlag} onChange={e=>setStockFlag(e.target.value as any)}>
          <option>Todos</option><option>Bajo stock</option>
        </select>
        <div style={{display:"flex",gap:".5rem"}}>
          <button className="secondary" onClick={resetFiltros} style={{width:"100%"}}>Limpiar</button>
          <button onClick={onNew} style={{width:"100%"}}>+ Nuevo Producto</button>
        </div>
      </div>

      {/* Tabla */}
      <div className="card">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:".6rem"}}>
          <h3 style={{margin:0}}>Productos</h3>
          <div style={{display:"flex",gap:".5rem"}}>
            <button className="secondary">Exportar CSV (UI)</button>
            <button className="secondary">Imprimir (UI)</button>
          </div>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Código</th><th>Nombre</th><th>Categoría</th><th>Unidad</th>
              <th>Costo</th><th>Precio</th><th>Margen</th>
              <th>Stock</th><th>Mín.</th><th>Estado</th><th></th>
            </tr>
          </thead>
          <tbody>
            {pageData.map(p=>(
              <tr key={p.id}>
                <td>{p.codigo}</td>
                <td>{p.nombre}</td>
                <td>{p.categoria}</td>
                <td>{p.unidad}</td>
                <td>Q {p.costo.toFixed(2)}</td>
                <td>Q {p.precio.toFixed(2)}</td>
                <td>{p.costo>0 ? `${(((p.precio-p.costo)/p.costo)*100).toFixed(1)}%` : "-"}</td>
                <td>{p.stock}</td>
                <td>{p.stockMin}</td>
                <td>
                  <span className="badge" style={{
                    background: p.estado==="Activo" ? "#e6f7ed":"#fdecec",
                    color: p.estado==="Activo" ? "#177245":"#b3261e"
                  }}>{p.estado}</span>
                </td>
                <td style={{display:"flex",gap:".4rem"}}>
                  <button className="secondary" onClick={()=>onEdit(p.id)}>Editar</button>
                  <button className="warn" onClick={()=>onDelete(p.id)}>Eliminar</button>
                </td>
              </tr>
            ))}
            {pageData.length===0 && (
              <tr>
                <td colSpan={11}>
                  <EmptyState
                    title="Aún no hay productos"
                    subtitle="Usa “Nuevo Producto” para registrar el primero. Al conectar el backend, se listarán desde la BD."
                    actionLabel="+ Nuevo Producto"
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
          <div style={{alignSelf:"center"}}>Página {page} / {total}</div>
          <button className="secondary" disabled={page>=total} onClick={()=>setPage(p=>p+1)}>Siguiente</button>
        </div>
      </div>

      {/* Modal CRUD */}
      {open && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.25)",display:"grid",placeItems:"center",zIndex:50}}>
          <form className="card" onSubmit={onSave} style={{minWidth:420,width:"min(820px, 95vw)"}}>
            <h3 style={{marginTop:0}}>{editId==null?"Nuevo Producto":"Editar Producto"}</h3>

            <div style={{display:"grid",gap:".6rem",gridTemplateColumns:"1fr 1fr 1fr"}}>
              <div>
                <label>Código*</label>
                <input className="input" value={form.codigo} onChange={e=>setForm({...form,codigo:e.target.value})}/>
                {errors.codigo && <div style={{color:"crimson",fontSize:".85rem"}}>{errors.codigo}</div>}
              </div>
              <div style={{gridColumn:"2 / -1"}}>
                <label>Nombre*</label>
                <input className="input" value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})}/>
                {errors.nombre && <div style={{color:"crimson",fontSize:".85rem"}}>{errors.nombre}</div>}
              </div>
              <div>
                <label>Categoría*</label>
                <input className="input" value={form.categoria} onChange={e=>setForm({...form,categoria:e.target.value})}/>
                {errors.categoria && <div style={{color:"crimson",fontSize:".85rem"}}>{errors.categoria}</div>}
              </div>
              <div>
                <label>Unidad</label>
                <select className="select" value={form.unidad} onChange={e=>setForm({...form,unidad:e.target.value as any})}>
                  <option>Unidad</option><option>Caja</option><option>Paquete</option><option>Metro</option><option>Kg</option>
                </select>
              </div>
              <div>
                <label>Estado</label>
                <select className="select" value={form.estado} onChange={e=>setForm({...form,estado:e.target.value as any})}>
                  <option>Activo</option><option>Inactivo</option>
                </select>
              </div>
              <div>
                <label>Costo (Q)</label>
                <input className="input" type="number" min={0} step={0.01}
                  value={form.costo} onChange={e=>setForm({...form,costo:Number(e.target.value)})}/>
                {errors.costo && <div style={{color:"crimson",fontSize:".85rem"}}>{errors.costo}</div>}
              </div>
              <div>
                <label>Precio (Q)</label>
                <input className="input" type="number" min={0} step={0.01}
                  value={form.precio} onChange={e=>setForm({...form,precio:Number(e.target.value)})}/>
                {errors.precio && <div style={{color:"crimson",fontSize:".85rem"}}>{errors.precio}</div>}
              </div>
              <div>
                <label>Margen (%)</label>
                <input className="input" disabled value={
                  form.costo>0 ? (((form.precio-form.costo)/form.costo)*100).toFixed(1) : "—"
                }/>
              </div>
              <div>
                <label>Stock</label>
                <input className="input" type="number" min={0} step={1}
                  value={form.stock} onChange={e=>setForm({...form,stock:Number(e.target.value)})}/>
                {errors.stock && <div style={{color:"crimson",fontSize:".85rem"}}>{errors.stock}</div>}
              </div>
              <div>
                <label>Stock mínimo</label>
                <input className="input" type="number" min={0} step={1}
                  value={form.stockMin} onChange={e=>setForm({...form,stockMin:Number(e.target.value)})}/>
                {errors.stockMin && <div style={{color:"crimson",fontSize:".85rem"}}>{errors.stockMin}</div>}
              </div>
              <div style={{gridColumn:"1 / -1"}}>
                <label>Imagen (URL pública) – opcional</label>
                <input className="input" placeholder="https://…" value={form.imagenUrl||""}
                  onChange={e=>setForm({...form,imagenUrl:e.target.value})}/>
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
