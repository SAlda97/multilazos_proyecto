import { useMemo, useState } from "react";
import EmptyState from "../components/EmptyState";

type TCliente = {
  id: number;
  nombre: string;
  nit?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  tipo: "Mayorista" | "Minorista";
  estado: "Activo" | "Inactivo";
  limiteCredito: number;
  saldoCredito: number;
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validar(c: Omit<TCliente,"id">){
  const e: Record<string,string> = {};
  if(!c.nombre.trim()) e.nombre = "El nombre es obligatorio.";
  if(c.email && !emailRegex.test(c.email)) e.email = "Correo inválido.";
  if(c.telefono && c.telefono.replace(/\D/g,"").length < 8) e.telefono = "Teléfono incompleto.";
  if(c.limiteCredito < 0) e.limiteCredito = "Debe ser mayor o igual a 0.";
  if(c.saldoCredito < 0) e.saldoCredito = "Debe ser mayor o igual a 0.";
  if(c.saldoCredito > c.limiteCredito) e.saldoCredito = "No puede exceder el límite.";
  return e;
}

export default function Clientes(){
  // Sin datos (UI para evidencia)
  const [data, setData] = useState<TCliente[]>([]);
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState<"Todos"|"Mayorista"|"Minorista">("Todos");
  const [estado, setEstado] = useState<"Todos"|"Activo"|"Inactivo">("Todos");

  // Modal / Form
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number|null>(null);
  const [form, setForm] = useState<Omit<TCliente,"id">>({
    nombre:"", nit:"", telefono:"", email:"", direccion:"",
    tipo:"Mayorista", estado:"Activo", limiteCredito:0, saldoCredito:0,
  });
  const [errors, setErrors] = useState<Record<string,string>>({});

  const filtered = useMemo(()=>{
    return data.filter(c=>{
      const texto = [c.nombre, c.nit, c.telefono, c.email, c.direccion, c.tipo, c.estado].join(" ").toLowerCase();
      const okTexto = texto.includes(q.toLowerCase());
      const okTipo = (tipo==="Todos") || c.tipo===tipo;
      const okEstado = (estado==="Todos") || c.estado===estado;
      return okTexto && okTipo && okEstado;
    });
  }, [data,q,tipo,estado]);

  function onNew(){
    setEditId(null);
    setForm({nombre:"",nit:"",telefono:"",email:"",direccion:"",tipo:"Mayorista",estado:"Activo",limiteCredito:0,saldoCredito:0});
    setErrors({});
    setOpen(true);
  }
  function onEdit(id:number){
    const c = data.find(x=>x.id===id); if(!c) return;
    const {id:_, ...rest} = c; setForm(rest); setEditId(id); setErrors({}); setOpen(true);
  }
  function onDelete(id:number){
    if(confirm("¿Eliminar cliente? (UI)")) setData(d=>d.filter(x=>x.id!==id));
  }
  function onSave(e:React.FormEvent){
    e.preventDefault();
    const v = validar(form); setErrors(v);
    if(Object.keys(v).length) return;
    if(editId==null){
      const next = Math.max(0, ...data.map(x=>x.id))+1;
      setData(d=>[...d,{id:next,...form}]);
    }else{
      setData(d=>d.map(x=>x.id===editId?({id:editId,...form}):x));
    }
    setOpen(false);
  }

  // Paginación simple (UI)
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const total = Math.max(1, Math.ceil(filtered.length/pageSize));
  const pageData = useMemo(()=>{
    const i = (page-1)*pageSize;
    return filtered.slice(i, i+pageSize);
  }, [filtered,page]);
  function resetFiltros(){ setQ(""); setTipo("Todos"); setEstado("Todos"); setPage(1); }

  return (
    <div style={{display:"grid",gap:"1rem"}}>
      {/* Filtros */}
      <div className="card" style={{display:"grid",gap:".7rem",gridTemplateColumns:"2fr 1fr 1fr 1fr"}}>
        <input className="input" placeholder="Buscar por nombre, NIT, correo…" value={q} onChange={e=>setQ(e.target.value)} />
        <select className="select" value={tipo} onChange={e=>setTipo(e.target.value as any)}>
          <option>Todos</option><option>Mayorista</option><option>Minorista</option>
        </select>
        <select className="select" value={estado} onChange={e=>setEstado(e.target.value as any)}>
          <option>Todos</option><option>Activo</option><option>Inactivo</option>
        </select>
        <div style={{display:"flex",gap:".5rem"}}>
          <button className="secondary" onClick={resetFiltros} style={{width:"100%"}}>Limpiar</button>
          <button onClick={onNew} style={{width:"100%"}}>+ Nuevo Cliente</button>
        </div>
      </div>

      {/* Tabla */}
      <div className="card">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:".6rem"}}>
          <h3 style={{margin:0}}>Clientes</h3>
          <div style={{display:"flex",gap:".5rem"}}>
            <button className="secondary">Exportar CSV (UI)</button>
            <button className="secondary">Imprimir (UI)</button>
          </div>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th><th>NIT</th><th>Teléfono</th><th>Email</th>
              <th>Tipo</th><th>Estado</th><th>Límite</th><th>Saldo</th><th></th>
            </tr>
          </thead>
          <tbody>
            {pageData.map(c=>(
              <tr key={c.id}>
                <td>{c.nombre}</td>
                <td>{c.nit||"-"}</td>
                <td>{c.telefono||"-"}</td>
                <td>{c.email||"-"}</td>
                <td><span className="badge">{c.tipo}</span></td>
                <td><span className="badge" style={{background:c.estado==="Activo"?"#e6f7ed":"#fdecec", color:c.estado==="Activo"?"#177245":"#b3261e"}}>{c.estado}</span></td>
                <td>Q {c.limiteCredito.toFixed(2)}</td>
                <td>Q {c.saldoCredito.toFixed(2)}</td>
                <td style={{display:"flex",gap:".4rem"}}>
                  <button className="secondary" onClick={()=>onEdit(c.id)}>Editar</button>
                  <button className="warn" onClick={()=>onDelete(c.id)}>Eliminar</button>
                </td>
              </tr>
            ))}
            {pageData.length===0 && (
              <tr>
                <td colSpan={9}>
                  <EmptyState
                    title="Aún no hay clientes"
                    subtitle="Crea el primer cliente para comenzar. Al conectar el backend, se mostrará la lista real."
                    actionLabel="+ Nuevo Cliente"
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
          <form className="card" onSubmit={onSave} style={{minWidth:380,width:"min(760px, 95vw)"}}>
            <h3 style={{marginTop:0}}>{editId==null?"Nuevo Cliente":"Editar Cliente"}</h3>

            <div style={{display:"grid",gap:".6rem",gridTemplateColumns:"1fr 1fr"}}>
              <div>
                <label>Nombre*</label>
                <input className="input" value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})}/>
                {errors.nombre && <div style={{color:"crimson",fontSize:".85rem"}}>{errors.nombre}</div>}
              </div>
              <div>
                <label>NIT</label>
                <input className="input" value={form.nit||""} onChange={e=>setForm({...form,nit:e.target.value})}/>
              </div>
              <div>
                <label>Teléfono</label>
                <input className="input" value={form.telefono||""} onChange={e=>setForm({...form,telefono:e.target.value})}/>
                {errors.telefono && <div style={{color:"crimson",fontSize:".85rem"}}>{errors.telefono}</div>}
              </div>
              <div>
                <label>Email</label>
                <input className="input" value={form.email||""} onChange={e=>setForm({...form,email:e.target.value})}/>
                {errors.email && <div style={{color:"crimson",fontSize:".85rem"}}>{errors.email}</div>}
              </div>
              <div style={{gridColumn:"1 / -1"}}>
                <label>Dirección</label>
                <input className="input" value={form.direccion||""} onChange={e=>setForm({...form,direccion:e.target.value})}/>
              </div>
              <div>
                <label>Tipo</label>
                <select className="select" value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value as any})}>
                  <option>Mayorista</option><option>Minorista</option>
                </select>
              </div>
              <div>
                <label>Estado</label>
                <select className="select" value={form.estado} onChange={e=>setForm({...form,estado:e.target.value as any})}>
                  <option>Activo</option><option>Inactivo</option>
                </select>
              </div>
              <div>
                <label>Límite de crédito (Q)</label>
                <input className="input" type="number" min={0} step={0.01}
                  value={form.limiteCredito} onChange={e=>setForm({...form,limiteCredito:Number(e.target.value)})}/>
                {errors.limiteCredito && <div style={{color:"crimson",fontSize:".85rem"}}>{errors.limiteCredito}</div>}
              </div>
              <div>
                <label>Saldo crédito (Q)</label>
                <input className="input" type="number" min={0} step={0.01}
                  value={form.saldoCredito} onChange={e=>setForm({...form,saldoCredito:Number(e.target.value)})}/>
                {errors.saldoCredito && <div style={{color:"crimson",fontSize:".85rem"}}>{errors.saldoCredito}</div>}
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
