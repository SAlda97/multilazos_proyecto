// Store simple para la UI (sin backend).
// Cuando conectemos con Django, estos métodos se reemplazan por fetch/axios,
// manteniendo el resto de la página igual.

export type VentaRef = {
  id_venta: number;
  cliente: string;
  tipo_transaccion: "Contado" | "Crédito"; // mapea a tipo_transacciones 1/2
};

export type Pago = {
  id_pago: number;
  id_venta: number;
  fecha_iso: string; // yyyy-mm-dd
  monto_pago: number;
};

type DB = {
  ventas: VentaRef[];
  pagos: Pago[];
};

const KEY = "mlz_pagos_store_v1";

const seed: DB = {
  ventas: [
    { id_venta: 1001, cliente: "María Pérez",  tipo_transaccion: "Crédito" },
    { id_venta: 1002, cliente: "Comercial Atlas", tipo_transaccion: "Contado" },
    { id_venta: 1003, cliente: "Juan López",   tipo_transaccion: "Crédito" },
  ],
  pagos: [
    { id_pago: 1, id_venta: 1001, fecha_iso: "2025-08-05", monto_pago: 350.00 },
    { id_pago: 2, id_venta: 1001, fecha_iso: "2025-08-20", monto_pago: 200.00 },
    { id_pago: 3, id_venta: 1002, fecha_iso: "2025-09-01", monto_pago: 1250.00 },
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

export const PagosStore = {
  getAll(): DB {
    return load();
  },
  create(p: Omit<Pago, "id_pago">): number {
    const db = load();
    const next = Math.max(0, ...db.pagos.map(x => x.id_pago)) + 1;
    db.pagos.push({ id_pago: next, ...p });
    save(db);
    return next;
  },
  update(p: Pago) {
    const db = load();
    db.pagos = db.pagos.map(x => (x.id_pago === p.id_pago ? p : x));
    save(db);
  },
  delete(id_pago: number) {
    const db = load();
    db.pagos = db.pagos.filter(x => x.id_pago !== id_pago);
    save(db);
  },
};
