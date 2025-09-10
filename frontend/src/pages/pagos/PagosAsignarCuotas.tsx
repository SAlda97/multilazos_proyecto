import { useEffect, useMemo, useState } from "react";
import { CuotasStore, Cuota } from "./_cuotasStore";

export type PagoResumen = {
  id_pago: number;
  id_venta: number;
  fecha_iso: string;
  monto_pago: number;
};

type Fila = { id_cuota: number; monto_asignado: number };

export default function PagosAsignarCuotas({
  open,
  onClose,
  pago,
}: {
  open: boolean;
  onClose: () => void;
  pago: PagoResumen | null;
}) {
  const [cuotas, setCuotas] = useState<Cuota[]>([]);
  const [filas, setFilas]   = useState<Fila[]>([]);

  useEffect(() => {
    if (!open || !pago) return;
    const cs = CuotasStore.getCuotasByVenta(pago.id_venta);
    setCuotas(cs);

    const actuales = CuotasStore.getAsignacionesByPago(pago.id_pago).map(a => ({
      id_cuota: a.id_cuota,
      monto_asignado: a.monto_asignado,
    }));
    setFilas(actuales.length ? actuales : (cs.length ? [{ id_cuota: cs[0].id_cuota, monto_asignado: 0 }] : []));
  }, [open, pago]);

  const pagadoPorCuota = useMemo(() => {
    const map = new Map<number, number>();
    const all = CuotasStore.getAll().pago_cuota;
    for (const a of all) {
      map.set(a.id_cuota, (map.get(a.id_cuota) || 0) + a.monto_asignado);
    }
    return map; // monto global pagado por cuota (UI)
  }, [open, pago]);

  const totalAsignadoActual = useMemo(
    () => filas.reduce((acc, f) => acc + (Number(f.monto_asignado) || 0), 0),
    [filas]
  );

  function addFila() {
    const primera = cuotas[0]?.id_cuota;
    if (!primera) return;
    setFilas(arr => [...arr, { id_cuota: primera, monto_asignado: 0 }]);
  }

  function delFila(idx: number) {
    setFilas(arr => arr.filter((_, i) => i !== idx));
  }

  function setCuota(idx: number, id_cuota: number) {
    setFilas(arr => arr.map((f, i) => (i === idx ? { ...f, id_cuota } : f)));
  }

  function setMonto(idx: number, val: string) {
    setFilas(arr => arr.map((f, i) => (i === idx ? { ...f, monto_asignado: Number(val || 0) } : f)));
  }

  function guardar() {
    if (!pago) return;
    // Sin validaciones duras (solo UI). Persistimos tal cual.
    CuotasStore.upsertAsignacionesDePago(
      pago.id_pago,
      filas.filter(f => f.monto_asignado > 0)
    );
    onClose();
  }

  if (!open || !pago) return null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.25)", display: "grid", placeItems: "center", zIndex: 60 }}>
      <div className="card" style={{ width: "min(980px, 96vw)" }}>
        <h3 style={{ marginTop: 0 }}>Asignar pago a cuotas</h3>

        <div style={{ display: "grid", gap: ".6rem", gridTemplateColumns: "repeat(4, 1fr)" }}>
          <div><label># Pago</label><div>#{pago.id_pago}</div></div>
          <div><label># Venta</label><div>#{pago.id_venta}</div></div>
          <div><label>Fecha pago</label><div>{pago.fecha_iso}</div></div>
          <div><label>Monto del pago</label><div><b>Q {pago.monto_pago.toFixed(2)}</b></div></div>
        </div>

        <div className="card" style={{ marginTop: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: ".6rem", marginBottom: ".6rem" }}>
            <b>Asignaciones</b>
            <span style={{ marginLeft: "auto" }}>Total asignado (UI): <b>Q {totalAsignadoActual.toFixed(2)}</b></span>
            <button className="secondary" onClick={addFila}>+ Fila</button>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 240 }}>Cuota</th>
                <th>Vence</th>
                <th style={{ width: 160, textAlign: "right" }}>Programado (Q)</th>
                <th style={{ width: 140, textAlign: "right" }}>Pagado (Q)</th>
                <th style={{ width: 160, textAlign: "right" }}>Saldo (UI)</th>
                <th style={{ width: 180 }}>Monto a asignar</th>
                <th style={{ width: 100 }}></th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f, idx) => {
                const c = cuotas.find(x => x.id_cuota === f.id_cuota);
                const pagado = pagadoPorCuota.get(f.id_cuota) || 0;
                const saldoUI = (c?.monto_programado || 0) - pagado;
                return (
                  <tr key={idx}>
                    <td>
                      <select className="select" value={f.id_cuota} onChange={(e) => setCuota(idx, Number(e.target.value))}>
                        {cuotas.map(cu => (
                          <option key={cu.id_cuota} value={cu.id_cuota}>
                            Cuota #{cu.numero_cuota} (id {cu.id_cuota})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{c?.fecha_venc_iso ?? "—"}</td>
                    <td style={{ textAlign: "right" }}>Q {c ? c.monto_programado.toFixed(2) : "0.00"}</td>
                    <td style={{ textAlign: "right" }}>Q {pagado.toFixed(2)}</td>
                    <td style={{ textAlign: "right" }}><b>Q {saldoUI.toFixed(2)}</b></td>
                    <td>
                      <input className="input" placeholder="0.00" value={String(f.monto_asignado)}
                             onChange={(e) => setMonto(idx, e.target.value)} />
                    </td>
                    <td><button className="warn" onClick={() => delFila(idx)}>Quitar</button></td>
                  </tr>
                );
              })}
              {filas.length === 0 && (
                <tr><td colSpan={7} style={{ padding: "1rem" }}>Sin filas de asignación (UI).</td></tr>
              )}
            </tbody>
          </table>

          {/* Avisos UI (NO bloquean) */}
          <div style={{ marginTop: ".6rem", display: "flex", gap: ".8rem", flexWrap: "wrap" }}>
            <span className="badge">Este módulo es de evidencia UI (sin validaciones duras).</span>
            <span className="badge secondary">Con backend: se validará contra trigger `trg_pago_cuota_limite`.</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: ".6rem", justifyContent: "flex-end", marginTop: "1rem" }}>
          <button className="secondary" onClick={onClose}>Cancelar</button>
          <button onClick={guardar}>Guardar asignaciones</button>
        </div>
      </div>
    </div>
  );
}
