import { useEffect, useMemo, useRef, useState } from "react";
import Chart from "chart.js/auto";                 // ✅ registra controllers/elementos/escalas automáticamente
import EmptyState from "../components/EmptyState";

// -------------------- Tipos y validación --------------------
type TVenta = {
  id: number;
  fecha: string;               // ISO yyyy-mm-dd (UI)
  cliente: string;
  tipoTransaccion: "Contado" | "Crédito";
  producto: string;
  cantidad: number;
  precioUnitario: number;
};

function validar(v: Omit<TVenta,"id">){
  const errs: Record<string,string> = {};
  if(!v.fecha) errs.fecha = "Fecha obligatoria.";
  if(!v.cliente.trim()) errs.cliente = "Cliente obligatorio.";
  if(!v.producto.trim()) errs.producto = "Producto obligatorio.";
  if(v.cantidad<=0) errs.cantidad = "Cantidad > 0.";
  if(v.precioUnitario<0) errs.precioUnitario = "Precio >= 0.";
  return errs;
}

// -------------------- Página --------------------
export default function Ventas(){
  // 🔸 Arrancamos SIN DATOS (UI habilitada)
  const [data, setData] = useState<TVenta[]>([]);
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState<"Todos"|"Contado"|"Crédito">("Todos");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  // Modal CRUD (habilitado)
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number|null>(null);
  const [form, setForm] = useState<Omit<TVenta,"id">>({
    fecha:"", cliente:"", tipoTransaccion:"Contado", producto:"", cantidad:1, precioUnitario:0
  });
  const [errors, setErrors] = useState<Record<string,string>>({});

  // Filtro (aunque esté vacío, dejamos la lógica)
  const filtered = useMemo(()=>{
    return data.filter(v=>{
      const okTexto = [v.cliente,v.producto,v.tipoTransaccion].join(" ").toLowerCase().includes(q.toLowerCase());
      const okTipo = (tipo==="Todos") || v.tipoTransaccion===tipo;
      const okDesde = !desde || v.fecha >= desde;
      const okHasta = !hasta || v.fecha <= hasta;
      return okTexto && okTipo && okDesde && okHasta;
    });
  },[data,q,tipo,desde,hasta]);

  // -------------------- Chart --------------------
  const canvasRef = useRef<HTMLCanvasElement|null>(null);
  const chartRef = useRef<Chart|null>(null);

  useEffect(()=>{
    // preparar datos
    const porMes = new Map<string, number>();
    filtered.forEach(v=>{
      const ym = v.fecha.slice(0,7); // yyyy-mm
      porMes.set(ym, (porMes.get(ym)||0) + v.cantidad*v.precioUnitario);
    });
    const labels = Array.from(porMes.keys()).sort();
    const valores = labels.map(l=>porMes.get(l) || 0);

    if(!canvasRef.current) return;

    // ✅ destruir cualquier instancia previa ANTES de crear una nueva
    if(chartRef.current){
      chartRef.current.destroy();
      chartRef.current = null;
    }

    chartRef.current = new Chart(canvasRef.current, {
      type:"bar",
      data:{
        labels,
        datasets:[{ label:"Ventas (Q)", data: valores, backgroundColor:"#2a6ac3", borderRadius:8 }]
      },
      options:{
        plugins:{ legend:{position:"bottom"} },
        scales:{ x:{ grid:{display:false}}, y:{ grid:{color:"#e9edf5"}} }
      }
    });

    // cleanup al desmontar o recalcular
    return ()=>{
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [filtered]);

  // -------------------- Acciones CRUD --------------------
  function onNew(){
    setEditId(null);
    setForm({fecha:"",cliente:"",tipoTransaccion:"Contado",producto:"",cantidad:1,precioUnitario:0});
    setErrors({});
    setOpen(true);
  }
  function onEdit(id:number){
    const v = data.find(x=>x.id===id);
    if(!v) return;
    const {id:_, ...rest} = v;
    setEditId(id);
    setForm(rest);
    setErrors({});
    setOpen(true);
  }
  function onDelete(id:number){
    if(confirm("¿Eliminar la venta seleccionada? (UI)")){
      setData(d => d.filter(x=>x.id!==id));
    }
  }
  function onSave(e:React.FormEvent){
    e.preventDefault();
    const errs = validar(form);
    setErrors(errs);
    if(Object.keys(errs).length) return;

    if(editId==null){
      const nextId = (Math.max(0,...data.map(x=>x.id)) + 1);
      setData(d => [...d, {id:nextId, ...form}]);
    }else{
      setData(d => d.map(x => x.id===editId ? ({id:editId, ...form}) : x));
    }
    setOpen(false);
  }

  // -------------------- Paginación --------------------
  const [page, setPage] = useState(1);
  const pageSize = 6;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageData = useMemo(()=>{
    const start = (page-1)*pageSize;
    return filtered.slice(start, start+pageSize);
  },[filtered,page]);

  useEffect(()=>{ setPage(1); },[q,tipo,desde,hasta]);

  // -------------------- Render --------------------
  return (
    <div style={{display:"grid", gap:"1rem"}}>
      {/* Filtros habilitados */}
      <div className="card" style={{display:"grid",gap:".7rem",gridTemplateColumns:"repeat(6,1fr)"}}>
        <input className="input" placeholder="Buscar…" value={q} onChange={e=>setQ(e.target.value)} />
        <select className="select" value={tipo} onChange={e=>setTipo(e.target.value as any)}>
          <option>Todos</option><option>Contado</option><option>Crédito</option>
        </select>
        <input className="input" type="date" value={desde} onChange={e=>setDesde(e.target.value)}/>
        <input className="input" type="date" value={hasta} onChange={e=>setHasta(e.target.value)}/>
        <button className="secondary" onClick={()=>{setQ("");setTipo("Todos");setDesde("");setHasta("");}}>Limpiar</button>
        <button onClick={onNew}>+ Nueva Venta</button>
      </div>

      {/* Gráfica (vacía si no hay datos) */}
      <div className="card">
        <div style={{fontWeight:800, marginBottom:".5rem"}}>Ventas por mes</div>
        <canvas ref={canvasRef} height={110}/>
        {filtered.length===0 && (
          <div style={{marginTop:".8rem"}}>
            <EmptyState
              title="Sin datos para graficar"
              subtitle="Cree registros o conecte el backend para visualizar la tendencia."
              actionLabel="+ Nueva Venta"
              onAction={onNew}
            />
          </div>
        )}
      </div>

      {/* Tabla (encabezados + estado vacío) */}
      <div className="card">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:".6rem"}}>
          <h3 style={{margin:0}}>Listado de Ventas</h3>
          <div style={{display:"flex",gap:".5rem"}}>
            <button className="secondary">Exportar CSV (UI)</button>
            <button className="secondary">Imprimir (UI)</button>
          </div>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Fecha</th><th>Cliente</th><th>Tipo</th><th>Producto</th><th>Cantidad</th><th>Precio</th><th>Total</th><th></th>
            </tr>
          </thead>
          <tbody>
            {pageData.map(v=>(
              <tr key={v.id}>
                <td>{v.fecha}</td>
                <td>{v.cliente}</td>
                <td><span className="badge">{v.tipoTransaccion}</span></td>
                <td>{v.producto}</td>
                <td>{v.cantidad}</td>
                <td>Q {v.precioUnitario.toFixed(2)}</td>
                <td>Q {(v.cantidad*v.precioUnitario).toFixed(2)}</td>
                <td style={{display:"flex",gap:".4rem"}}>
                  <button className="secondary" onClick={()=>onEdit(v.id)}>Editar</button>
                  <button className="warn" onClick={()=>onDelete(v.id)}>Eliminar</button>
                </td>
              </tr>
            ))}
            {pageData.length===0 && (
              <tr>
                <td colSpan={8}>
                  <EmptyState
                    title="Aún no hay ventas"
                    subtitle="Usa el botón 'Nueva Venta' para registrar la primera. Luego, al conectar el backend, esta tabla mostrará la información real."
                    actionLabel="+ Nueva Venta"
                    onAction={onNew}
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Paginación (visible aunque esté vacío, para evidencia UI) */}
        <div style={{display:"flex",gap:".5rem",justifyContent:"flex-end",marginTop:".8rem"}}>
          <button className="secondary" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Anterior</button>
          <div style={{alignSelf:"center"}}>Página {page} / {totalPages}</div>
          <button className="secondary" disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)}>Siguiente</button>
        </div>
      </div>

      {/* Modal CRUD (campos habilitados + validaciones) */}
      {open && (
        <div style={{
          position:"fixed", inset:0, background:"rgba(0,0,0,.25)", display:"grid", placeItems:"center", zIndex:50
        }}>
          <form className="card" onSubmit={onSave} style={{minWidth:360, width:"min(560px, 92vw)"}}>
            <h3 style={{marginTop:0}}>{editId==null? "Nueva Venta":"Editar Venta"}</h3>
            <div style={{display:"grid",gap:".6rem",gridTemplateColumns:"1fr 1fr"}}>
              <div>
                <label>Fecha</label>
                <input className="input" type="date" value={form.fecha} onChange={e=>setForm({...form,fecha:e.target.value})}/>
                {errors.fecha && <div style={{color:"crimson",fontSize:".85rem"}}>{errors.fecha}</div>}
              </div>
              <div>
                <label>Cliente</label>
                <input className="input" value={form.cliente} onChange={e=>setForm({...form,cliente:e.target.value})}/>
                {errors.cliente && <div style={{color:"crimson",fontSize:".85rem"}}>{errors.cliente}</div>}
              </div>
              <div>
                <label>Tipo de transacción</label>
                <select className="select" value={form.tipoTransaccion} onChange={e=>setForm({...form,tipoTransaccion:e.target.value as any})}>
                  <option>Contado</option><option>Crédito</option>
                </select>
              </div>
              <div>
                <label>Producto</label>
                <input className="input" value={form.producto} onChange={e=>setForm({...form,producto:e.target.value})}/>
                {errors.producto && <div style={{color:"crimson",fontSize:".85rem"}}>{errors.producto}</div>}
              </div>
              <div>
                <label>Cantidad</label>
                <input className="input" type="number" min={0} step={1} value={form.cantidad}
                  onChange={e=>setForm({...form,cantidad:Number(e.target.value)})}/>
                {errors.cantidad && <div style={{color:"crimson",fontSize:".85rem"}}>{errors.cantidad}</div>}
              </div>
              <div>
                <label>Precio unitario (Q)</label>
                <input className="input" type="number" min={0} step={0.01} value={form.precioUnitario}
                  onChange={e=>setForm({...form,precioUnitario:Number(e.target.value)})}/>
                {errors.precioUnitario && <div style={{color:"crimson",fontSize:".85rem"}}>{errors.precioUnitario}</div>}
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
