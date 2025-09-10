import { useEffect, useMemo, useState } from "react";
import { PagosStore, Pago, VentaRef } from "./pagos/_pagosStore";
import PagosAsignarCuotas from "./pagos/PagosAsignarCuotas";

type Filtros = {
  q: string; // busca por cliente, id_venta, id_pago
  tipo: "Todos" | "Contado" | "Crédito";
  desde?: string; // yyyy-mm-dd
  hasta?: string;
  min?: string;   // como texto para no validar todavía (UI)
  max?: string;
};

export default function Pagos() {
  const [db, setDb]     = useState(PagosStore.getAll());
  const [f, setF]       = useState<Filtros>({ q: "", tipo: "Todos" });
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Pago | null>(null);

  const [asignarOpen, setAsignarOpen] = useState(false);
  const [pagoSel, setPagoSel] = useState<null | { id_pago:number; id_venta:number; fecha_iso:string; monto_pago:number }>(null);

  

  useEffect(() => setDb(PagosStore.getAll()), [open]);

  // Fuente combinada para mostrar cliente/tipo con cada pago
  const pagosEnriquecidos = useMemo(() => {
    const ventasMap = new Map<number, VentaRef>(db.ventas.map(v => [v.id_venta, v]));
    return db.pagos.map(p => ({
      ...p,
      venta: ventasMap.get(p.id_venta)
    }));
  }, [db]);

  // Filtro UI (sin validaciones por tu solicitud)
  const rows = pagosEnriquecidos.filter(p => {
    const texto = [
      p.id_pago, p.id_venta,
      p.venta?.cliente ?? "",
      p.venta?.tipo_transaccion ?? ""
    ].join(" ").toLowerCase();

    if (f.q && !texto.includes(f.q.toLowerCase())) return false;
    if (f.tipo !== "Todos" && p.venta?.tipo_transaccion !== f.tipo) return false;

    if (f.desde && p.fecha_iso < f.desde) return false;
    if (f.hasta && p.fecha_iso > f.hasta) return false;

    const min = f.min ? Number(f.min) : undefined;
    const max = f.max ? Number(f.max) : undefined;
    if (min !== undefined && p.monto_pago < min) return false;
    if (max !== undefined && p.monto_pago > max) return false;

    return true;
  });

  const totales = useMemo(() => {
    const total = rows.reduce((acc, r) => acc + (r.monto_pago || 0), 0);
    return { registros: rows.length, monto: total };
  }, [rows]);

  // CRUD
  function onNew() {
    const defaultVenta = db.ventas[0]?.id_venta ?? 0;
    setEdit({ id_pago: 0, id_venta: defaultVenta, fecha_iso: new Date().toISOString().slice(0,10), monto_pago: 0 });
    setOpen(true);
  }
  function onEdit(p: Pago) {
    setEdit({ ...p });
    setOpen(true);
  }
  function onDelete(id: number) {
    if (confirm("¿Eliminar pago? (UI)")) {
      PagosStore.delete(id);
      setDb(PagosStore.getAll());
    }
  }
  function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!edit) return;
    if (edit.id_pago === 0) {
      PagosStore.create({
        id_venta: edit.id_venta,
        fecha_iso: edit.fecha_iso,
        monto_pago: Number(edit.monto_pago || 0),
      });
    } else {
      PagosStore.update({ ...edit, monto_pago: Number(edit.monto_pago || 0) });
    }
    setOpen(false);
  }

  function limpiar() {
    setF({ q: "", tipo: "Todos" });
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      {/* Filtros */}
      <div className="card" style={{ display: "grid", gap: ".6rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 160px 140px 140px 140px 140px", gap: ".6rem" }}>
          <input
            className="input"
            placeholder="Buscar (cliente, #venta, #pago)…"
            value={f.q}
            onChange={(e) => setF({ ...f, q: e.target.value })}
          />
          <select className="select" value={f.tipo} onChange={(e)=>setF({ ...f, tipo: e.target.value as any })}>
            <option>Todos</option>
            <option>Contado</option>
            <option>Crédito</option>
          </select>
          <input className="input" type="date" value={f.desde ?? ""} onChange={e=>setF({...f, desde:e.target.value||undefined})}/>
          <input className="input" type="date" value={f.hasta ?? ""} onChange={e=>setF({...f, hasta:e.target.value||undefined})}/>
          <input className="input" placeholder="Monto mín." value={f.min ?? ""} onChange={e=>setF({...f, min:e.target.value})}/>
          <input className="input" placeholder="Monto máx." value={f.max ?? ""} onChange={e=>setF({...f, max:e.target.value})}/>
        </div>
        <div style={{ display: "flex", gap: ".6rem", justifyContent: "flex-end" }}>
          <button className="secondary" onClick={limpiar}>Limpiar</button>
          <button onClick={onNew}>+ Nuevo Pago</button>
        </div>
      </div>

      {/* Totales visibles */}
      <div className="card" style={{ display: "flex", gap: "1.2rem", alignItems: "center" }}>
        <b>Pagos</b>
        <span style={{ opacity: .8 }}>Registros: <b>{totales.registros}</b></span>
        <span style={{ opacity: .8 }}>Monto total (filtro): <b>Q {totales.monto.toFixed(2)}</b></span>
        <div style={{ marginLeft: "auto", display: "flex", gap: ".5rem" }}>
          <button className="secondary">Exportar CSV (UI)</button>
          <button className="secondary">Imprimir (UI)</button>
        </div>
      </div>

      {/* Tabla */}
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th style={{width:90}}>#Pago</th>
              <th style={{width:110}}>Fecha</th>
              <th style={{width:120}}>#Venta</th>
              <th>Cliente</th>
              <th style={{width:120}}>Tipo</th>
              <th style={{width:140}}>Monto (Q)</th>
              <th style={{width:250}}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(p => (
              <tr key={p.id_pago}>
                <td>#{p.id_pago}</td>
                <td>{p.fecha_iso}</td>
                <td>#{p.id_venta}</td>
                <td>{p.venta?.cliente ?? "—"}</td>
                <td>{p.venta?.tipo_transaccion ?? "—"}</td>
                <td>Q {p.monto_pago.toFixed(2)}</td>
                <td style={{ display: "flex", gap: ".4rem" }}>
                  <button className="secondary" onClick={()=>onEdit(p as Pago)}>Editar</button>
                  <button className="warn" onClick={()=>onDelete(p.id_pago)}>Eliminar</button>
                  <button className="secondary" onClick={() => { setPagoSel({ id_pago: p.id_pago, id_venta: p.id_venta, fecha_iso: p.fecha_iso, monto_pago: p.monto_pago,});setAsignarOpen(true);}}>Asignar a cuotas (UI)</button>

                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: "1rem" }}>
                  Sin datos para los filtros actuales (UI).
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal CRUD */}
      {open && edit && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.25)", display: "grid", placeItems: "center", zIndex: 50 }}>
          <form className="card" onSubmit={onSave} style={{ minWidth: 420, width: "min(760px,95vw)" }}>
            <h3 style={{ marginTop: 0 }}>{edit.id_pago === 0 ? "Nuevo pago" : `Editar pago #${edit.id_pago}`}</h3>

            <div style={{ display: "grid", gap: ".8rem", gridTemplateColumns: "1fr 1fr" }}>
              <div>
                <label>Venta</label>
                <select
                  className="select"
                  value={edit.id_venta}
                  onChange={(e) => setEdit({ ...edit, id_venta: Number(e.target.value) })}
                >
                  {db.ventas.map(v => (
                    <option key={v.id_venta} value={v.id_venta}>
                      #{v.id_venta} • {v.cliente} ({v.tipo_transaccion})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label>Fecha</label>
                <input
                  type="date"
                  className="input"
                  value={edit.fecha_iso}
                  onChange={(e) => setEdit({ ...edit, fecha_iso: e.target.value })}
                />
              </div>

              <div>
                <label>Monto (Q)</label>
                <input
                  className="input"
                  placeholder="0.00"
                  value={String(edit.monto_pago)}
                  onChange={(e) => setEdit({ ...edit, monto_pago: Number(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: ".6rem", justifyContent: "flex-end", marginTop: "1rem" }}>
              <button type="button" className="secondary" onClick={() => setOpen(false)}>Cancelar</button>
              <button type="submit">Guardar</button>
            </div>
          </form>
        </div>
      )}
      <PagosAsignarCuotas
        open={asignarOpen}
        onClose={() => {
            setAsignarOpen(false);
            setPagoSel(null);
        setDb(PagosStore.getAll()); // refresca la tabla tras guardar asignaciones
        }}
        pago={pagoSel}
    />
    </div>
  );
}
