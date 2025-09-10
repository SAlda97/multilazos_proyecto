import { useEffect, useMemo, useState } from "react";
import { CuotasStore } from "./pagos/_cuotasStore";
import { PagosStore, VentaRef } from "./pagos/_pagosStore";

type Filtros = {
  q: string; // busca por cliente, #venta, #cuota
  estado: "Todos" | "pendiente" | "parcial" | "pagada";
  desde?: string; // yyyy-mm-dd (vencimiento)
  hasta?: string;
  venta?: string; // id venta como texto para no validar (UI)
};

type Row = {
  id_cuota: number;
  id_venta: number;
  numero_cuota: number;
  fecha_venc_iso: string;
  monto_programado: number;
  monto_pagado: number;
  saldo_pendiente: number;
  estado: "pendiente" | "parcial" | "pagada";
  cliente?: string;
  tipo?: "Contado" | "Crédito";
};

export default function EstadoCuotas() {
  // Carga "DB" desde localStorage de los stores existentes
  const [cuotasDb, setCuotasDb] = useState(CuotasStore.getAll());
  const [ventasDb, setVentasDb] = useState(PagosStore.getAll().ventas);

  const [f, setF] = useState<Filtros>({ q: "", estado: "Todos" });

  // refrescar cuando regresas desde otros módulos/modales
  useEffect(() => {
    setCuotasDb(CuotasStore.getAll());
    setVentasDb(PagosStore.getAll().ventas);
  }, []);

  const pagosPorCuota = useMemo(() => {
    const map = new Map<number, number>();
    for (const a of cuotasDb.pago_cuota) {
      map.set(a.id_cuota, (map.get(a.id_cuota) || 0) + a.monto_asignado);
    }
    return map;
  }, [cuotasDb]);

  const ventasMap = useMemo(
    () => new Map<number, VentaRef>(ventasDb.map(v => [v.id_venta, v])),
    [ventasDb]
  );

  // Construye las filas estilo v_cuotas_estado
  const base: Row[] = useMemo(() => {
    return cuotasDb.cuotas.map(c => {
      const pagado = pagosPorCuota.get(c.id_cuota) || 0;
      const saldo = Number((c.monto_programado - pagado).toFixed(2));
      const estado: Row["estado"] =
        pagado === 0 ? "pendiente" : (pagado < c.monto_programado ? "parcial" : "pagada");
      const venta = ventasMap.get(c.id_venta);
      return {
        id_cuota: c.id_cuota,
        id_venta: c.id_venta,
        numero_cuota: c.numero_cuota,
        fecha_venc_iso: c.fecha_venc_iso,
        monto_programado: c.monto_programado,
        monto_pagado: Number(pagado.toFixed(2)),
        saldo_pendiente: saldo,
        estado,
        cliente: venta?.cliente,
        tipo: venta?.tipo_transaccion,
      };
    });
  }, [cuotasDb, pagosPorCuota, ventasMap]);

  // Filtros UI
  const rows = base.filter(r => {
    const texto = [
      r.id_cuota, r.id_venta, r.numero_cuota,
      r.cliente ?? "", r.tipo ?? "", r.estado
    ].join(" ").toLowerCase();

    if (f.q && !texto.includes(f.q.toLowerCase())) return false;
    if (f.estado !== "Todos" && r.estado !== f.estado) return false;

    if (f.venta && String(r.id_venta) !== String(f.venta)) return false;

    if (f.desde && r.fecha_venc_iso < f.desde) return false;
    if (f.hasta && r.fecha_venc_iso > f.hasta) return false;

    return true;
  });

  // Totales
  const totales = useMemo(() => {
    const porEstado = rows.reduce(
      (acc, r) => {
        acc[r.estado] = (acc[r.estado] || 0) + 1;
        return acc;
      },
      {} as Record<Row["estado"], number>
    );
    const sumaSaldo = rows.reduce((acc, r) => acc + r.saldo_pendiente, 0);
    const sumaProgramado = rows.reduce((acc, r) => acc + r.monto_programado, 0);
    const sumaPagado = rows.reduce((acc, r) => acc + r.monto_pagado, 0);
    return {
      registros: rows.length,
      porEstado,
      sumaSaldo: Number(sumaSaldo.toFixed(2)),
      sumaProgramado: Number(sumaProgramado.toFixed(2)),
      sumaPagado: Number(sumaPagado.toFixed(2)),
    };
  }, [rows]);

  function limpiar() {
    setF({ q: "", estado: "Todos" });
  }

  function Chip({ s }: { s: Row["estado"] }) {
    const color =
      s === "pagada" ? "#16a34a" : s === "parcial" ? "#f59e0b" : "#ef4444";
    const bg = s === "pagada" ? "#dcfce7" : s === "parcial" ? "#fef3c7" : "#fee2e2";
    return (
      <span style={{
        fontSize: 12, padding: ".15rem .5rem", borderRadius: 999,
        color, background: bg, fontWeight: 600, textTransform: "uppercase"
      }}>
        {s}
      </span>
    );
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      {/* Filtros */}
      <div className="card" style={{ display: "grid", gap: ".6rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 160px 140px 140px 160px", gap: ".6rem" }}>
          <input
            className="input"
            placeholder="Buscar (cliente, #venta, #cuota)…"
            value={f.q}
            onChange={(e) => setF({ ...f, q: e.target.value })}
          />
          <select
            className="select"
            value={f.estado}
            onChange={(e) => setF({ ...f, estado: e.target.value as Filtros["estado"] })}
          >
            <option value="Todos">Todos</option>
            <option value="pendiente">Pendiente</option>
            <option value="parcial">Parcial</option>
            <option value="pagada">Pagada</option>
          </select>
          <input className="input" type="date" value={f.desde ?? ""} onChange={e=>setF({...f, desde:e.target.value||undefined})}/>
          <input className="input" type="date" value={f.hasta ?? ""} onChange={e=>setF({...f, hasta:e.target.value||undefined})}/>
          <input className="input" placeholder="# Venta" value={f.venta ?? ""} onChange={e=>setF({...f, venta:e.target.value||undefined})}/>
        </div>
        <div style={{ display: "flex", gap: ".6rem", justifyContent: "flex-end" }}>
          <button className="secondary" onClick={limpiar}>Limpiar</button>
          <button className="secondary">Exportar CSV (UI)</button>
          <button className="secondary">Imprimir (UI)</button>
        </div>
      </div>

      {/* Totales / badges */}
      <div className="card" style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
        <b>Estado de cuotas</b>
        <span style={{ opacity: .8 }}>Registros: <b>{totales.registros}</b></span>
        <span className="badge">Pendientes: {totales.porEstado?.pendiente ?? 0}</span>
        <span className="badge">Parciales: {totales.porEstado?.parcial ?? 0}</span>
        <span className="badge">Pagadas: {totales.porEstado?.pagada ?? 0}</span>
        <span style={{ marginLeft: "auto", opacity: .8 }}>
          Programado: <b>Q {totales.sumaProgramado.toFixed(2)}</b>
          &nbsp;•&nbsp; Pagado: <b>Q {totales.sumaPagado.toFixed(2)}</b>
          &nbsp;•&nbsp; Saldo: <b>Q {totales.sumaSaldo.toFixed(2)}</b>
        </span>
      </div>

      {/* Tabla */}
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th style={{width:100}}>#Cuota</th>
              <th style={{width:120}}>#Venta</th>
              <th>Cliente</th>
              <th style={{width:110}}>Vence</th>
              <th style={{width:120, textAlign:"right"}}>Programado (Q)</th>
              <th style={{width:120, textAlign:"right"}}>Pagado (Q)</th>
              <th style={{width:120, textAlign:"right"}}>Saldo (Q)</th>
              <th style={{width:120}}>Estado</th>
              <th style={{width:140}}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id_cuota}>
                <td>#{r.id_cuota} (#{r.numero_cuota})</td>
                <td>#{r.id_venta}</td>
                <td>{r.cliente ?? "—"}</td>
                <td>{r.fecha_venc_iso}</td>
                <td style={{textAlign:"right"}}>Q {r.monto_programado.toFixed(2)}</td>
                <td style={{textAlign:"right"}}>Q {r.monto_pagado.toFixed(2)}</td>
                <td style={{textAlign:"right"}}><b>Q {r.saldo_pendiente.toFixed(2)}</b></td>
                <td><Chip s={r.estado} /></td>
                <td style={{display:"flex", gap:".4rem"}}>
                  <button className="secondary" title="UI: ir a Pagos/Asignación">Asignar pago</button>
                  <button className="secondary" title="UI: ver venta">Ver venta</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: "1rem" }}>Sin cuotas para los filtros actuales (UI).</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Notas UI */}
      <div className="card" style={{ display:"flex", gap:".6rem", flexWrap:"wrap" }}>
        <span className="badge secondary">Cálculo UI con stores locales (sin backend).</span>
        <span className="badge">Con backend: se consultará `v_cuotas_estado` en SQL Server.</span>
      </div>
    </div>
  );
}
