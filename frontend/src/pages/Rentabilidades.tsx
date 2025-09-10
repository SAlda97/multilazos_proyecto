import { useMemo, useState } from "react";
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement,
  Tooltip, Legend
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";



ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend);

type Filtros = {
  desde: string; hasta: string;
  idTipoCliente: number | 0;
  idTipoTransaccion: number | 0;
  idCategoriaProducto: number | 0;
};

// Estructura alineada a vw_resumen_rentabilidades / fn_resumen_mensual
type Fila = {
  anio: number;
  mes: number;                  // 1..12
  mes_inicio: string;           // yyyy-mm-01 (para eje)
  id_tipo_cliente: number | null;
  nombre_tipo_cliente: string;
  id_tipo_transaccion: number | null;
  nombre_tipo_transaccion: string;
  id_categoria_producto: number | null;
  nombre_categoria_producto: string;
  total_venta: number;
  total_costo: number;
  margen_bruto: number;
  gastos_asignados: number;
  margen_neto: number;
  dso_dias_prom: number | null;
};

// Catálogos mínimos de UI (se reemplazarán por backend)
const catTiposCliente = [
  { id: 1, nombre: "Mayorista" },
  { id: 2, nombre: "Minorista" },
];
const catTiposTrans = [
  { id: 1, nombre: "Contado" },
  { id: 2, nombre: "Crédito" },
];
const catCategorias = [
  { id: 1, nombre: "Lazos de nylon" },
  { id: 2, nombre: "Lazos de algodón" },
  { id: 3, nombre: "Accesorios" },
];

// Datos simulados (3 meses)
const seed: Fila[] = [
  { anio:2025, mes:6, mes_inicio:"2025-06-01", id_tipo_cliente:1, nombre_tipo_cliente:"Mayorista", id_tipo_transaccion:1, nombre_tipo_transaccion:"Contado", id_categoria_producto:1, nombre_categoria_producto:"Lazos de nylon", total_venta:120000, total_costo:90000, margen_bruto:30000, gastos_asignados:7000, margen_neto:23000, dso_dias_prom:0 },
  { anio:2025, mes:6, mes_inicio:"2025-06-01", id_tipo_cliente:2, nombre_tipo_cliente:"Minorista", id_tipo_transaccion:2, nombre_tipo_transaccion:"Crédito", id_categoria_producto:2, nombre_categoria_producto:"Lazos de algodón", total_venta:80000, total_costo:56000, margen_bruto:24000, gastos_asignados:5000, margen_neto:19000, dso_dias_prom:28 },
  { anio:2025, mes:7, mes_inicio:"2025-07-01", id_tipo_cliente:1, nombre_tipo_cliente:"Mayorista", id_tipo_transaccion:1, nombre_tipo_transaccion:"Contado", id_categoria_producto:1, nombre_categoria_producto:"Lazos de nylon", total_venta:100000, total_costo:76000, margen_bruto:24000, gastos_asignados:6000, margen_neto:18000, dso_dias_prom:0 },
  { anio:2025, mes:7, mes_inicio:"2025-07-01", id_tipo_cliente:2, nombre_tipo_cliente:"Minorista", id_tipo_transaccion:2, nombre_tipo_transaccion:"Crédito", id_categoria_producto:2, nombre_categoria_producto:"Lazos de algodón", total_venta:95000, total_costo:68000, margen_bruto:27000, gastos_asignados:5500, margen_neto:21500, dso_dias_prom:30 },
  { anio:2025, mes:8, mes_inicio:"2025-08-01", id_tipo_cliente:1, nombre_tipo_cliente:"Mayorista", id_tipo_transaccion:2, nombre_tipo_transaccion:"Crédito", id_categoria_producto:3, nombre_categoria_producto:"Accesorios", total_venta:60000, total_costo:42000, margen_bruto:18000, gastos_asignados:4000, margen_neto:14000, dso_dias_prom:25 },
];

export default function Rentabilidades(){
  const hoy = new Date();
  const yyyy = hoy.getFullYear(); const mm = String(hoy.getMonth()+1).padStart(2,"0");
  const defHasta = `${yyyy}-${mm}-01`;
  const defDesde = "2025-06-01";

  const [filtros, setFiltros] = useState<Filtros>({
    desde: defDesde,
    hasta: defHasta,
    idTipoCliente: 0,
    idTipoTransaccion: 0,
    idCategoriaProducto: 0
  });

  const filtrado = useMemo(()=>{
    return seed.filter(r=>{
      const okDesde = !filtros.desde || r.mes_inicio >= filtros.desde;
      const okHasta = !filtros.hasta || r.mes_inicio <= filtros.hasta;
      const okTC = !filtros.idTipoCliente || r.id_tipo_cliente === filtros.idTipoCliente;
      const okTT = !filtros.idTipoTransaccion || r.id_tipo_transaccion === filtros.idTipoTransaccion;
      const okCP = !filtros.idCategoriaProducto || r.id_categoria_producto === filtros.idCategoriaProducto;
      return okDesde && okHasta && okTC && okTT && okCP;
    });
  }, [filtros]);

  // Agregados para KPIs / tabla
  const resumen = useMemo(()=>{
    let venta=0, costo=0, margenB=0, gastos=0, margenN=0;
    filtrado.forEach(r=>{
      venta+=r.total_venta; costo+=r.total_costo; margenB+=r.margen_bruto; gastos+=r.gastos_asignados; margenN+=r.margen_neto;
    });
    return { venta, costo, margenB, gastos, margenN };
  }, [filtrado]);

  // Eje por mes (yyyy-mm)
  const etiquetasMes = Array.from(new Set(filtrado.map(r=>r.mes_inicio)));

  // Series por mes (ventas y margen neto)
  const ventasPorMes = etiquetasMes.map(m => filtrado.filter(r=>r.mes_inicio===m).reduce((a,b)=>a+b.total_venta,0));
  const margenNetoPorMes = etiquetasMes.map(m => filtrado.filter(r=>r.mes_inicio===m).reduce((a,b)=>a+b.margen_neto,0));

  // DSO promedio por mes
  const dsoPorMes = etiquetasMes.map(m=>{
    const arr = filtrado.filter(r=>r.mes_inicio===m && r.dso_dias_prom!=null).map(r=>r.dso_dias_prom as number);
    if(!arr.length) return 0;
    return +(arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(1);
  });

  function limpiar(){
    setFiltros({desde:defDesde, hasta:defHasta, idTipoCliente:0, idTipoTransaccion:0, idCategoriaProducto:0});
  }

  return (
    <div style={{display:"grid", gap:"1rem"}}>
      {/* Filtros */}
      <div className="card" style={{display:"grid", gap:".7rem", gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr"}}>
        <input className="input" type="date" value={filtros.desde} onChange={e=>setFiltros(f=>({...f,desde:e.target.value}))}/>
        <input className="input" type="date" value={filtros.hasta} onChange={e=>setFiltros(f=>({...f,hasta:e.target.value}))}/>
        <select className="select" value={filtros.idTipoCliente} onChange={e=>setFiltros(f=>({...f,idTipoCliente:Number(e.target.value)}))}>
          <option value={0}>Todos los tipos de cliente</option>
          {catTiposCliente.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <select className="select" value={filtros.idTipoTransaccion} onChange={e=>setFiltros(f=>({...f,idTipoTransaccion:Number(e.target.value)}))}>
          <option value={0}>Contado/Crédito</option>
          {catTiposTrans.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <div style={{display:"flex",gap:".5rem"}}>
          <select className="select" value={filtros.idCategoriaProducto} onChange={e=>setFiltros(f=>({...f,idCategoriaProducto:Number(e.target.value)}))} style={{width:"100%"}}>
            <option value={0}>Todas las categorías</option>
            {catCategorias.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <button className="secondary" onClick={limpiar}>Limpiar</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="card" style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:".7rem"}}>
        <div><div style={{opacity:.7}}>Ventas</div><div style={{fontWeight:700}}>Q {resumen.venta.toLocaleString()}</div></div>
        <div><div style={{opacity:.7}}>Costo</div><div style={{fontWeight:700}}>Q {resumen.costo.toLocaleString()}</div></div>
        <div><div style={{opacity:.7}}>Margen bruto</div><div style={{fontWeight:700}}>Q {resumen.margenB.toLocaleString()}</div></div>
        <div><div style={{opacity:.7}}>Gastos asignados</div><div style={{fontWeight:700}}>Q {resumen.gastos.toLocaleString()}</div></div>
        <div><div style={{opacity:.7}}>Margen neto</div><div style={{fontWeight:700}}>Q {resumen.margenN.toLocaleString()}</div></div>
      </div>

      {/* Gráfica 1: Ventas vs Margen neto por mes */}
      <div className="card">
        <h3 style={{marginTop:0}}>Ventas vs Margen neto (mensual)</h3>
        <Bar
          data={{
            labels: etiquetasMes,
            datasets: [
              { label: "Ventas (Q)", data: ventasPorMes },
              { label: "Margen neto (Q)", data: margenNetoPorMes },
            ]
          }}
          options={{
            responsive:true,
            plugins:{ legend:{ position:"top" } },
            scales:{ x:{ grid:{display:false} }, y:{ beginAtZero:true } }
          }}
        />
      </div>

      {/* Gráfica 2: DSO promedio por mes */}
      <div className="card">
        <h3 style={{marginTop:0}}>DSO promedio (días)</h3>
        <Line
          data={{
            labels: etiquetasMes,
            datasets: [{ label: "DSO", data: dsoPorMes }]
          }}
          options={{ responsive:true, plugins:{ legend:{ position:"top" } }, scales:{ y:{ beginAtZero:true } } }}
        />
      </div>

      {/* Tabla detalle (segmento) */}
      <div className="card">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:".6rem"}}>
          <h3 style={{margin:0}}>Detalle por segmento</h3>
          <div style={{display:"flex",gap:".5rem"}}>
            <button className="secondary">Exportar CSV (UI)</button>
            <button className="secondary">Imprimir (UI)</button>
          </div>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Mes</th>
              <th>Tipo cliente</th>
              <th>Transacción</th>
              <th>Categoría producto</th>
              <th style={{textAlign:"right"}}>Ventas</th>
              <th style={{textAlign:"right"}}>Costo</th>
              <th style={{textAlign:"right"}}>M. bruto</th>
              <th style={{textAlign:"right"}}>Gastos</th>
              <th style={{textAlign:"right"}}>M. neto</th>
              <th style={{textAlign:"right"}}>DSO</th>
            </tr>
          </thead>
          <tbody>
            {filtrado.map((r,i)=>(
              <tr key={i}>
                <td>{r.mes_inicio}</td>
                <td>{r.nombre_tipo_cliente}</td>
                <td>{r.nombre_tipo_transaccion}</td>
                <td>{r.nombre_categoria_producto}</td>
                <td style={{textAlign:"right"}}>Q {r.total_venta.toLocaleString()}</td>
                <td style={{textAlign:"right"}}>Q {r.total_costo.toLocaleString()}</td>
                <td style={{textAlign:"right"}}>Q {r.margen_bruto.toLocaleString()}</td>
                <td style={{textAlign:"right"}}>Q {r.gastos_asignados.toLocaleString()}</td>
                <td style={{textAlign:"right"}}>Q {r.margen_neto.toLocaleString()}</td>
                <td style={{textAlign:"right"}}>{r.dso_dias_prom ?? "-"}</td>
              </tr>
            ))}
            {filtrado.length===0 && (
              <tr><td colSpan={10} style={{padding:"1rem"}}>Sin datos en este filtro (UI).</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
