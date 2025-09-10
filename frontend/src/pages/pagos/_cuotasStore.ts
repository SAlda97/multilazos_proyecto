// Persistencia simple SOLO UI para el modal de asignación Pago↔Cuotas.
// Modelado en línea con dbo.cuota_creditos y dbo.pago_cuota del script.

export type Cuota = {
  id_cuota: number;
  id_venta: number;
  numero_cuota: number;
  fecha_venc_iso: string; // YYYY-MM-DD (equivale a id_fecha_venc en dim_fecha)
  monto_programado: number;
};

export type PagoCuota = {
  id_pago: number;
  id_cuota: number;
  monto_asignado: number;
};

type DB = {
  cuotas: Cuota[];
  pago_cuota: PagoCuota[]; // varias filas por pago
};

const KEY = "mlz_pago_cuota_store_v1";

const seed: DB = {
  cuotas: [
    // Venta 1001 (Crédito)
    { id_cuota: 501, id_venta: 1001, numero_cuota: 1, fecha_venc_iso: "2025-09-15", monto_programado: 300 },
    { id_cuota: 502, id_venta: 1001, numero_cuota: 2, fecha_venc_iso: "2025-10-15", monto_programado: 300 },
    { id_cuota: 503, id_venta: 1001, numero_cuota: 3, fecha_venc_iso: "2025-11-15", monto_programado: 300 },
    // Venta 1003 (Crédito)
    { id_cuota: 601, id_venta: 1003, numero_cuota: 1, fecha_venc_iso: "2025-09-20", monto_programado: 250 },
    { id_cuota: 602, id_venta: 1003, numero_cuota: 2, fecha_venc_iso: "2025-10-20", monto_programado: 250 },
  ],
  pago_cuota: [
    // ejemplo: pago #1 ya tiene una asignación parcial a la cuota 501
    { id_pago: 1, id_cuota: 501, monto_asignado: 150 },
  ],
};

function load(): DB {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      localStorage.setItem(KEY, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw) as DB;
  } catch {
    localStorage.setItem(KEY, JSON.stringify(seed));
    return seed;
  }
}
function save(db: DB) {
  localStorage.setItem(KEY, JSON.stringify(db));
}

export const CuotasStore = {
  getAll(): DB { return load(); },

  getCuotasByVenta(id_venta: number): Cuota[] {
    return load().cuotas.filter(c => c.id_venta === id_venta);
  },

  getAsignacionesByPago(id_pago: number): PagoCuota[] {
    return load().pago_cuota.filter(pc => pc.id_pago === id_pago);
  },

  upsertAsignacionesDePago(id_pago: number, filas: { id_cuota: number; monto_asignado: number }[]) {
    const db = load();
    // elimina todas las asignaciones previas de ese pago y guarda las nuevas (modo UI)
    db.pago_cuota = [
      ...db.pago_cuota.filter(pc => pc.id_pago !== id_pago),
      ...filas.map(f => ({ id_pago, id_cuota: f.id_cuota, monto_asignado: Number(f.monto_asignado || 0) }))
    ];
    save(db);
  },

  deleteAsignacion(id_pago: number, id_cuota: number) {
    const db = load();
    db.pago_cuota = db.pago_cuota.filter(pc => !(pc.id_pago === id_pago && pc.id_cuota === id_cuota));
    save(db);
  }
};
