// src/pages/Rentabilidades.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend
} from "chart.js";
import { Line, Pie } from "react-chartjs-2";
import { getRentabilidades } from "../services/rentabilidades";
import type { SerieMes } from "../types/rentabilidades";
import { fmtQ, fmt2 } from "../utils/format";
import { exportChartsToPDF } from "../utils/exportCharts"; //  NUEVO

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend);

// ---- Sticky & chart sizing ----
const STICKY_TOP_FILTERS = 0;   // px (posición sticky del bloque Filtros)
const TOP_KPIS = 104;           // px (alto aprox. de Filtros + separación)

//  Caja contenedora para cada gráfica (altura RESPONSIVA y estable, evita el “bucle” de crecimiento)
const CHART_BOX_STYLE: React.CSSProperties = {
  height: "clamp(260px, 48vh, 460px)", // mínimo 260px, ideal ~48% de la ventana, máximo 460px
  width: "100%",
};

type Filtros = {
  months: number;                 // últimos N meses
  idTipoTransaccion: 0 | 1 | 2;   // 0=Todas,1=Contado,2=Crédito
};

export default function Rentabilidades(){
  const [f, setF] = useState<Filtros>({ months: 6, idTipoTransaccion: 0 });
  const [labels, setLabels] = useState<string[]>([]);
  const [series, setSeries] = useState<SerieMes[]>([]);
  const [tot, setTot] = useState({ venta:0, costo:0, margen_bruto:0, gastos:0, margen_neto:0 });
  const [pie, setPie] = useState({ contado:0, credito:0 });
  const [loading, setLoading] = useState(false);

  // ⬇️ Refs a las gráficas
  const lineAbsRef   = useRef<any>(null); // G1
  const lineMBMNRef  = useRef<any>(null); // G2
  const linePctRef   = useRef<any>(null); // G3
  const lineGVRef    = useRef<any>(null); // G4
  const pieRef       = useRef<any>(null); // G5

  async function load(){
    setLoading(true);
    try{
      const res = await getRentabilidades({ months: f.months, id_tipo_transaccion: f.idTipoTransaccion });
      setLabels(res.labels || []);
      setSeries(res.series || []);
      setTot(res.totales || { venta:0,costo:0,margen_bruto:0,gastos:0,margen_neto:0 });
      setPie(res.ventas_por_tipo || { contado:0, credito:0 });
    }finally{
      setLoading(false);
    }
  }
  useEffect(()=>{ load(); }, []); // init
  useEffect(()=>{ load(); }, [f.months, f.idTipoTransaccion]); // vivo ante filtros

  function limpiar(){
    setF({ months: 6, idTipoTransaccion: 0 });
  }

  const r2 = (x:number)=> Number((x ?? 0).toFixed(2));

  const kpis = useMemo(()=>({
    venta: tot.venta,
    costo: tot.costo,
    margenB: tot.margen_bruto,
    gastos: tot.gastos,
    margenN: tot.margen_neto
  }), [tot]);

  const ventasLine       = series.map(s => s.venta);
  const margenBLine      = series.map(s => s.margen_bruto);
  const margenNLine      = series.map(s => s.margen_neto);

  const margenBPctLine     = series.map(s => r2(s.margen_bruto_pct));
  const margenNPctLine     = series.map(s => r2(s.margen_neto_pct));
  const gastosVentaPctLine = series.map(s => r2(s.gastos_sobre_venta_pct));

  const pieData = {
    labels: ["Contado", "Crédito"],
    datasets: [{ data: [pie.contado, pie.credito] }]
  };

  async function exportPDF(){
    if(!confirm("¿Desea exportar las gráficas a PDF?")) return;

    const tryImg = (ref: any) => {
      const inst = ref?.current;
      if (!inst) return null;
      const fn = inst.toBase64Image ? inst.toBase64Image.bind(inst) : null;
      return fn ? fn("image/png", 1.0) : null;
    };

    const imgs = [
      { title: "Tendencia: Ventas, Margen bruto y Margen neto", dataUrl: tryImg(lineAbsRef) },
      { title: "Tendencia: Margen bruto vs Margen neto (Q)",     dataUrl: tryImg(lineMBMNRef) },
      { title: "Tendencia: % Margen bruto y % Margen neto",      dataUrl: tryImg(linePctRef) },
      { title: "Tendencia: % Gastos sobre ventas",               dataUrl: tryImg(lineGVRef) },
      { title: "Ventas por tipo de transacción",                 dataUrl: tryImg(pieRef) },
    ].filter(x => !!x.dataUrl) as {title:string; dataUrl:string}[];

    const subtitle = [
      `Últimos ${f.months} meses`,
      f.idTipoTransaccion===0 ? "Transacción: Todas" : (f.idTipoTransaccion===1 ? "Transacción: Contado" : "Transacción: Crédito")
    ].join(" • ");

    exportChartsToPDF({
      title: "Rentabilidades",
      subtitle,
      charts: imgs,
      filename: "rentabilidades_graficas.pdf"
    });
  }

  const pctTooltip = {
    callbacks: {
      title: (items:any[]) => items?.[0]?.label ?? "",
      label: (ctx:any) => {
        const label = ctx.dataset.label || "";
        const v = Number(ctx.parsed.y ?? ctx.raw ?? 0);
        return `${label}: ${fmt2(v)}%`;
      }
    }
  };

  //  Opciones comunes a todas las gráficas para estabilidad de tamaño
  const commonLineOpts = {
    responsive: true,
    maintainAspectRatio: false,   // usamos altura del contenedor (CHART_BOX_STYLE)
    resizeDelay: 150,             // evita rebotes de redimensionamiento
    plugins: { legend: { position: "top" } },
    scales: { y: { beginAtZero: true } }
  } as const;

  return (
    <div style={{display:"grid", gap:"1rem"}}>
      {/* Filtros (sticky) */}
      <div
        className="card"
        style={{
          display:"grid",
          gap:".7rem",
          position:"sticky",
          top: STICKY_TOP_FILTERS,
          zIndex:50,
          background:"white"
        }}
      >
        <div style={{display:"grid", gridTemplateColumns:"200px 200px 1fr", gap:".6rem"}}>
          <div>
            <label>Últimos N meses</label>
            <input
              className="input"
              type="number"
              min={1} max={24}
              value={f.months}
              onChange={e=>setF({...f, months: Math.max(1, Math.min(24, Number(e.target.value)||1))})}
            />
          </div>
          <div>
            <label>Tipo de transacción</label>
            <select
              className="select"
              value={f.idTipoTransaccion}
              onChange={e=>setF({...f, idTipoTransaccion: Number(e.target.value) as 0|1|2})}
            >
              <option value={0}>Todas</option>
              <option value={1}>Contado</option>
              <option value={2}>Crédito</option>
            </select>
          </div>
          <div style={{display:"flex", gap:".5rem", alignItems:"end", justifyContent:"flex-end"}}>
            <button className="secondary" onClick={limpiar} disabled={loading}>Limpiar</button>
            <button className="secondary" onClick={exportPDF} disabled={loading}>Exportar PDF</button>
          </div>
        </div>
      </div>

      {/* KPIs (sticky) */}
      <div
        className="card"
        style={{
          display:"grid",
          gridTemplateColumns:"repeat(5,1fr)",
          gap:".7rem",
          position:"sticky",
          top: TOP_KPIS,
          zIndex:40,
          background:"white"
        }}
      >
        <div><div style={{opacity:.7}}>Ventas</div><div style={{fontWeight:700}}>{fmtQ(kpis.venta)}</div></div>
        <div><div style={{opacity:.7}}>Costo</div><div style={{fontWeight:700}}>{fmtQ(kpis.costo)}</div></div>
        <div><div style={{opacity:.7}}>Margen bruto</div><div style={{fontWeight:700}}>{fmtQ(kpis.margenB)}</div></div>
        <div><div style={{opacity:.7}}>Gastos</div><div style={{fontWeight:700}}>{fmtQ(kpis.gastos)}</div></div>
        <div><div style={{opacity:.7}}>Margen neto</div><div style={{fontWeight:700}}>{fmtQ(kpis.margenN)}</div></div>
      </div>

      {/* G1 */}
      <div className="card">
        <h3 style={{marginTop:0}}>Tendencia: Ventas, Margen bruto y Margen neto</h3>
        <div style={CHART_BOX_STYLE}>
          <Line
            ref={lineAbsRef}
            data={{
              labels,
              datasets: [
                { label: "Ventas (Q)", data: ventasLine },
                { label: "Margen bruto (Q)", data: margenBLine },
                { label: "Margen neto (Q)", data: margenNLine },
              ]
            }}
            options={commonLineOpts as any}
          />
        </div>
      </div>

      {/* G2 */}
      <div className="card">
        <h3 style={{marginTop:0}}>Tendencia: Margen bruto vs Margen neto (Q)</h3>
        <div style={CHART_BOX_STYLE}>
          <Line
            ref={lineMBMNRef}
            data={{
              labels,
              datasets: [
                { label: "Margen bruto (Q)", data: margenBLine },
                { label: "Margen neto (Q)", data: margenNLine },
              ]
            }}
            options={commonLineOpts as any}
          />
        </div>
      </div>

      {/* G3 */}
      <div className="card">
        <h3 style={{marginTop:0}}>Tendencia: % Margen bruto y % Margen neto</h3>
        <div style={CHART_BOX_STYLE}>
          <Line
            ref={linePctRef}
            data={{
              labels,
              datasets: [
                { label: "% Margen bruto", data: margenBPctLine },
                { label: "% Margen neto", data: margenNPctLine },
              ]
            }}
            options={{
              ...commonLineOpts,
              plugins:{ ...(commonLineOpts as any).plugins, tooltip: { ...(pctTooltip as any) } },
              scales:{ y:{ beginAtZero:true, ticks:{ callback:(v:any)=>`${fmt2(Number(v))}%` } } }
            } as any}
          />
        </div>
      </div>

      {/* G4 */}
      <div className="card">
        <h3 style={{marginTop:0}}>Tendencia: % Gastos sobre ventas</h3>
        <div style={CHART_BOX_STYLE}>
          <Line
            ref={lineGVRef}
            data={{
              labels,
              datasets: [
                { label: "% Gastos/Ventas", data: gastosVentaPctLine },
              ]
            }}
            options={{
              ...commonLineOpts,
              plugins:{ ...(commonLineOpts as any).plugins, tooltip: { ...(pctTooltip as any) } },
              scales:{ y:{ beginAtZero:true, ticks:{ callback:(v:any)=>`${fmt2(Number(v))}%` } } }
            } as any}
          />
        </div>
      </div>

      {/* G5 */}
      <div className="card">
        <h3 style={{marginTop:0}}>Ventas por tipo de transacción</h3>
        <div style={CHART_BOX_STYLE}>
          <Pie
            ref={pieRef}
            data={ {
              labels: ["Contado", "Crédito"],
              datasets: [{ data: [pie.contado, pie.credito] }]
            } }
            options={{ responsive:true, maintainAspectRatio:false, resizeDelay:150, plugins:{ legend:{ position:"top" } } }}
          />
        </div>
        <div style={{marginTop:".6rem", display:"flex", gap:"1rem"}}>
          <span>Contado: <b>{fmtQ(pie.contado)}</b></span>
          <span>Crédito: <b>{fmtQ(pie.credito)}</b></span>
        </div>
      </div>

      {/* Estado */}
      <div className="card" style={{display:"flex",gap:".6rem",flexWrap:"wrap"}}>
        <span className="badge secondary">{loading ? "Cargando…" : "Uso confidencial"}</span>
      </div>
    </div>
  );
}
