import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Chart from "chart.js/auto";
import ChartDataLabels from "chartjs-plugin-datalabels";
import CatalogScaffold, { Row } from "./catalogos/_CatalogScaffold";
import { listVentas, createVenta, updateVenta, deleteVenta, ventasTotalesPorMes } from "../services/ventas";
import { getCliente } from "../services/clientes";
import { getTipoCliente } from "../services/tipoClientes";
import { listClientes } from "../services/clientes";
import { fetchTipoTransacciones } from "../services/tipoTransacciones";
import { getIdFechaByDate } from "../services/dimFecha";
import { listDetalleVentas } from "../services/detalleVentas";
import type { Venta } from "../types/ventas";
import type { Cliente } from "../types/clientes";
import type { TipoTransaccion } from "../types/tipoTransacciones";
import jsPDF from "jspdf";

Chart.register(ChartDataLabels);


type RowExt = Row & {
  cliente: string;
  tipo: string;
  fecha: string;
  plazo: number;
  interes: number;
  total: number;
  idFechaNum: number;
};

const PLAZOS_VALIDOS = [3,6,9,12,24,36,48];


function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function Ventas() {

  const navigate = useNavigate();
  // gráfico
  const canvasRef = useRef<HTMLCanvasElement|null>(null);
  const chartRef = useRef<Chart|null>(null);

  // grid
  const [rows, setRows] = useState<RowExt[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  // combos
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [tipos, setTipos] = useState<TipoTransaccion[]>([]);

  // modal
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<number|null>(null);
  const [form, setForm] = useState<{
    id_cliente: string;
    id_tipo_transaccion: string;
    fecha: string;
    plazo_mes: string;   // deshabilitado en contado
    interes: string;     // autollenado en crédito, 0 en contado (solo lectura)
  }>({ id_cliente:"", id_tipo_transaccion:"", fecha: todayISO(), plazo_mes:"0", interes:"0" });

  const totalPages = useMemo(()=>Math.max(1, Math.ceil(count/pageSize)),[count]);

  useEffect(()=>{
    (async()=>{
      const [cli, tps] = await Promise.all([
        listClientes({ page:1, page_size:1000 }),
        fetchTipoTransacciones({ page:1, page_size:1000 }),
      ]);
      setClientes(cli.results);
      setTipos(tps.results);
    })();
    loadData(1, q);
  },[]); // eslint-disable-line

  // Carga combos y data
  async function loadData(p=page, query=q) {
    setLoading(true);
    try {
      const res = await listVentas({ page:p, page_size:pageSize, search:query || undefined });
      const mapped: RowExt[] = res.results.map((v: Venta) => ({
        id: v.id_venta,
        nombre: `#${v.id_venta}`, // columna principal del scaffold
        cliente: v.cliente,
        tipo: v.tipo_transaccion,
        fecha: v.fecha || "",
        plazo: v.plazo_mes,
        interes: Number(v.interes),
        total: Number(v.total_venta_final),
        idFechaNum: v.id_fecha
      }));
      setRows(mapped);
      setCount(res.count);
      setPage(p);
    } finally {
      setLoading(false);
    }
  }

// === Gráfica: fetch + render ===
const fetchAndRenderChart = useCallback(async () => {
  const data = await ventasTotalesPorMes(); // [{ mes:"YYYY-MM", total:"123.45" }, ...]
  const labels = data.map(d => d.mes);
  const valores = data.map(d => parseFloat(String(d.total ?? "0")) || 0);

  if (!canvasRef.current) return;

  // si ya existe, actualizamos datos y listo
  if (chartRef.current) {
    chartRef.current.data.labels = labels;
    chartRef.current.data.datasets[0].data = valores;
    chartRef.current.update();
    return;
  }

  // crear nueva instancia: LINEA + datalabels
  chartRef.current = new Chart(canvasRef.current, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Ventas (Q)",
          data: valores,
          tension: 0.3,     // curva suave
          pointRadius: 3,   // puntos visibles
        },
      ],
    },
    options: {
      plugins: {
        legend: { position: "bottom" },
        datalabels: {
          anchor: "end",
          align: "top",
          formatter: (v: number) => `Q ${v.toFixed(2)}`,
          clamp: true,
          clip: false,
        },
      },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: "#e9edf5" } },
      },
    },
  });
}, []);

function handleExportGraficaPdf() {
  if (!canvasRef.current) return;

  // confirmación estilo catálogos
  const ok = confirm("¿Desea exportar la gráfica 'Ventas por mes' en PDF?");
  if (!ok) return;

  // obtener imagen del canvas
  const canvas = canvasRef.current;
  const imgData = canvas.toDataURL("image/png", 1.0);

  // PDF apaisado para aprovechar ancho
  const pdf = new jsPDF("landscape", "pt", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // márgenes
  const marginX = 36; // 0.5in
  const marginY = 36;

  // título
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text("Ventas por mes", marginX, marginY);

  // fecha de export
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  const fecha = new Date();
  const fechaStr = fecha.toLocaleString();
  pdf.text(`Exportado: ${fechaStr}`, pageWidth - marginX, marginY, { align: "right" });

  // espacio disponible para la imagen
  const availableW = pageWidth - marginX * 2;
  const availableH = pageHeight - marginY * 2 - 20; // 20px debajo del título

  // Mantener proporción de la imagen del canvas
  const img = new Image();
  img.src = imgData;

  // Truco: como toDataURL ya devuelve tamaño final del canvas,
  // escalamos en base a su relación de aspecto.
  const canvasW = canvas.width;
  const canvasH = canvas.height;
  const aspect = canvasW / canvasH;

  let drawW = availableW;
  let drawH = drawW / aspect;
  if (drawH > availableH) {
    drawH = availableH;
    drawW = drawH * aspect;
  }

  const startX = marginX + (availableW - drawW) / 2;
  const startY = marginY + 20 + (availableH - drawH) / 2;

  pdf.addImage(imgData, "PNG", startX, startY, drawW, drawH, undefined, "FAST");

  pdf.save("ventas-por-mes.pdf");
}

  

  // ====== GRÁFICA
  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!mounted) return;
      await fetchAndRenderChart();
    })();

    return () => {
      mounted = false;
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [fetchAndRenderChart]);

  // ====== CRUD Ventas

  function onNewClick(){
    setEditId(null);
    setForm({ id_cliente:"", id_tipo_transaccion:"", fecha: todayISO(), plazo_mes:"0", interes:"0" });
    setOpen(true);
  }

  async function onEditClick(row: Row){
    const v = rows.find(r=>r.id===row.id);
    if(!v) return;
    setEditId(v.id);
    // si crédito mantener plazo; si contado 0
    const tp = tipos.find(t=>t.id_tipo_transaccion===Number(v.tipo.includes("rédito")?2:1));
    setForm({
      id_cliente: String(v ? clientes.find(c=>`${c.nombre_cliente} ${c.apellido_cliente}`===v.cliente)?.id_cliente ?? "":"") ,
      id_tipo_transaccion: String(tp?.id_tipo_transaccion ?? ""),
      fecha: v.fecha || todayISO(),
      plazo_mes: String(v.plazo || 0),
      interes: String(v.interes ?? 0)
    });
    setOpen(true);
  }

  async function onDeleteClick(row: Row){
    const ok = confirm(`¿Eliminar la venta ${row.id}?`);
    if(!ok) return;
    try{
      setLoading(true);
      await deleteVenta(row.id);
      const next = rows.length===1 && page>1 ? page-1 : page;
      await loadData(next, q);
      await fetchAndRenderChart();
    } finally {
      setLoading(false);
    }
  }

  // al cambiar tipo: si contado -> plazo=0 e interes=0; si crédito -> habilitar plazos y calcular interés por cliente
  async function onTipoChange(idTipoStr: string){
    const idTipo = Number(idTipoStr||0);
    if(idTipo===1){
      // contado
      setForm(f=>({ ...f, id_tipo_transaccion:idTipoStr, plazo_mes:"0", interes:"0" }));
      return;
    }
  // crédito: intentar traer tasa por cliente
    const idCli = Number(form.id_cliente);
    let interesStr = form.interes || "0";
    if(idCli){
      try{
        const cli = await getCliente(idCli);
        // soportar estructura { tasa_interes_default } o anidada en tipo
        const bruto = (cli.tasa_interes_default ?? cli?.tipo_cliente?.tasa_interes_default ?? 0) as number;
        const normal = bruto <= 1 ? bruto * 100 : bruto; // 0.05 -> 5
        interesStr = String(Number(normal).toFixed(2));
      }catch{}
    }
    setForm(f=>({ ...f, id_tipo_transaccion:idTipoStr, interes: interesStr, plazo_mes: f.plazo_mes==="0" ? "3" : f.plazo_mes }));
  }

  async function fetchInteresForCliente(id_cliente: number): Promise<string> {
  try {
    const cli = await getCliente(id_cliente);
    // intenta varias formas de encontrar la tasa
    let bruto = cli?.tasa_interes_default 
             ?? cli?.tipo_cliente?.tasa_interes_default 
             ?? undefined;

    if (bruto === undefined) {
      const idTipo = cli?.id_tipo_cliente ?? cli?.tipo_cliente?.id_tipo_cliente;
      if (idTipo) {
        const tipo = await getTipoCliente(Number(idTipo));
        bruto = tipo?.tasa_interes_default ?? 0;
      } else {
        bruto = 0;
      }
    }

    const n = Number(bruto || 0);
    const normalizado = n <= 1 ? n * 100 : n; // 0.05 -> 5
    return String(Number(normalizado).toFixed(2));
  } catch {
    return "0";
  }
}


  useEffect(()=>{
    (async ()=>{
      if (Number(form.id_tipo_transaccion) === 2 && form.id_cliente) {
        try {
          const cli = await getCliente(Number(form.id_cliente));
          const bruto = (cli.tasa_interes_default ?? cli?.tipo_cliente?.tasa_interes_default ?? 0) as number;
          const normal = bruto <= 1 ? bruto * 100 : bruto; // 0.05 -> 5
          setForm(f => ({ ...f, interes: String(Number(normal).toFixed(2)) }));
        } catch {
          // opcional: manejar error silencioso
        }
      } else if (Number(form.id_tipo_transaccion) === 1) {
        // contado: interés 0 y plazo 0
        setForm(f => ({ ...f, interes: "0", plazo_mes: "0" }));
      }
    })();
    // importante: NO agregar 'form.interes' a deps para evitar loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.id_cliente, form.id_tipo_transaccion]);


  async function onSave(e: React.FormEvent){
    e.preventDefault();
    if(!confirm("¿Desea guardar los cambios?")) return;

    const id_cliente = Number(form.id_cliente);
    const id_tipo_transaccion = Number(form.id_tipo_transaccion);
    if(!id_cliente){ alert("Seleccione cliente."); return; }
    if(!id_tipo_transaccion){ alert("Seleccione tipo de transacción."); return; }
    try{
      setSaving(true);
      const { id_fecha } = await getIdFechaByDate(form.fecha);
      if(editId==null){
        const body: any = { id_cliente, id_tipo_transaccion, id_fecha };
        if(id_tipo_transaccion===2){ body.plazo_mes = Number(form.plazo_mes || 0); }
        await createVenta(body);
        await loadData(1, q);
        await fetchAndRenderChart(); // actualizar gráfica tras crear
      }else{
        const body: any = { id_cliente, id_tipo_transaccion, id_fecha };
        if(id_tipo_transaccion===2){ body.plazo_mes = Number(form.plazo_mes || 0); }
        await updateVenta(editId, body);
        await loadData(page, q);
        await fetchAndRenderChart();
      }
      setOpen(false);
    }catch(err:any){
      alert(err?.response?.data?.detail || err?.message || "Error al guardar.");
    }finally{
      setSaving(false);
    }
  }

  return (
    <>
      {/* ====== GRÁFICA ====== */}
      <div className="card" style={{ marginBottom: ".8rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: ".6rem" }}>
          <div style={{ fontWeight: 800 }}>Ventas por mes</div>
          <div style={{ marginLeft: "auto", display: "flex", gap: ".5rem" }}>
            <button className="secondary" onClick={handleExportGraficaPdf}>
              Exportar PDF
            </button>
          </div>
        </div>
        <canvas ref={canvasRef} height={80} />
      </div>

      {/* ====== LISTADO ====== */}
      <CatalogScaffold
        titulo="Catálogo: Ventas"
        placeholderBusqueda="Buscar por cliente..."
        rows={rows}
        totalCount={count}
        page={page}
        pageSize={pageSize}
        loading={loading}
        onSearch={(text)=>{ setQ(text); loadData(1, text); }}
        onClear={()=>{ setQ(""); loadData(1, ""); }}
        onPageChange={(next)=>{ if(next<1||next>totalPages) return; loadData(next, q); }}
        onNewClick={onNewClick}
        onEditClick={onEditClick}
        onDeleteClick={onDeleteClick}
        extraColumns={[
          { header: "Cliente", render: (r)=> (r as RowExt).cliente },
          { header: "Tipo", render: (r)=> (r as RowExt).tipo },
          { header: "Fecha", render: (r)=> (r as RowExt).fecha || "—" },
          { header: "Plazo", alignRight:true, render: (r)=> (r as RowExt).plazo },
          { header: "Interés (%)", alignRight:true, render: (r)=> (r as RowExt).interes.toFixed(2) },
          { header: "Total (Q)", alignRight:true, render: (r)=> (r as RowExt).total.toFixed(2) },
          { header: "",render: (r) => (<button className="secondary" onClick={()=> navigate(`/ventas/${(r as RowExt).id}/detalle`)}>Detalle</button>)}
        ]}
        exportPdf={{
          filename: "ventas.pdf",
          headers: ["ID", "Cliente", "Tipo", "Fecha", "Plazo", "Interés (%)", "Total (Q)"],
          mapRow: (r)=>{
            const v = r as RowExt;
            return [v.id, v.cliente, v.tipo, v.fecha || "", v.plazo, v.interes.toFixed(2), v.total.toFixed(2)];
          },
          footerNote: "Exportado desde Multilazos • Ventas",
          confirm: true,
          confirmMessage: "¿Desea exportar el PDF de Ventas (página visible)?",
        }}
      />

      {/* ====== MODAL NUEVO/EDITAR ====== */}
      {open && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.25)", display:"grid", placeItems:"center", zIndex:50 }}>
          <form className="card" onSubmit={onSave} style={{ minWidth: 560, width:"min(860px,95vw)" }}>
            <h3 style={{ marginTop:0 }}>{editId==null ? "Nueva venta" : "Editar venta"}</h3>

            <div style={{ display:"grid", gap:".8rem", gridTemplateColumns:"2fr 1fr 1fr 1fr" }}>
              <div style={{ gridColumn:"1 / span 2" }}>
                <label>Cliente</label>
                <select
                  className="input"
                  value={form.id_cliente}
                  onChange={e=>setForm(f=>({ ...f, id_cliente: e.target.value }))}
                >
                  <option value="">Seleccione…</option>
                  {clientes.map(c=>(
                    <option key={c.id_cliente} value={c.id_cliente}>
                      {c.nombre_cliente} {c.apellido_cliente}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label>Tipo</label>
                <select
                  className="input"
                  value={form.id_tipo_transaccion}
                  onChange={e=>onTipoChange(e.target.value)}
                >
                  <option value="">Seleccione…</option>
                  {tipos.map(t=>(
                    <option key={t.id_tipo_transaccion} value={t.id_tipo_transaccion}>
                      {t.nombre_tipo_transaccion}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label>Fecha</label>
                <input
                  className="input"
                  type="date"
                  value={form.fecha}
                  onChange={e=>setForm(f=>({ ...f, fecha: e.target.value }))}
                />
              </div>

              <div>
                <label>Plazo (meses)</label>
                <select
                  className="input"
                  value={form.plazo_mes}
                  onChange={e=>setForm(f=>({ ...f, plazo_mes: e.target.value }))}
                  disabled={Number(form.id_tipo_transaccion)!==2}
                >
                  {Number(form.id_tipo_transaccion)===2 ? (
                    <>
                      {PLAZOS_VALIDOS.map(p=><option key={p} value={p}>{p}</option>)}
                    </>
                  ) : (
                    <option value="0">0</option>
                  )}
                </select>
              </div>

              <div>
                <label>Interés (%)</label>
                <input className="input" value={form.interes} readOnly />
              </div>
            </div>

            <div style={{ display:"flex", gap:".6rem", justifyContent:"flex-end", marginTop:"1rem" }}>
              <button type="button" className="secondary" onClick={()=>setOpen(false)} disabled={saving}>Cancelar</button>
              <button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</button>
            </div>

            {/* Nota: el detalle se gestiona en su propia página */}
            <div style={{marginTop:".6rem", fontSize:12, opacity:.7}}>
              * El total se recalcula automáticamente con detalle venta
            </div>
          </form>
        </div>
      )}
    </>
  );
}
