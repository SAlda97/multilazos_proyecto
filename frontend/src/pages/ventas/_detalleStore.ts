// Persistencia simple en localStorage SOLO para evidenciar la UI.
// Estructura alineada con dbo.detalle_ventas (id_venta, id_producto, cantidad, precio_unitario, costo_unitario_venta)

export type VentaRef = {
  id_venta: number;
  cliente: string;
  tipo_transaccion: "Contado" | "Crédito";
};

export type ProductoRef = {
  id_producto: number;
  nombre_producto: string;
  id_categoria?: number;
};

export type Detalle = {
  id_detalle_venta: number;
  id_venta: number;
  id_producto: number;
  cantidad: number;
  precio_unitario: number;
  costo_unitario_venta: number;
};

type DB = {
  ventas: VentaRef[];
  productos: ProductoRef[];
  detalles: Detalle[]; // varias filas por venta
};

const KEY = "mlz_detalle_ventas_store_v1";

const seed: DB = {
  ventas: [
    { id_venta: 1001, cliente: "María Pérez",  tipo_transaccion: "Crédito" },
    { id_venta: 1002, cliente: "Comercial Atlas", tipo_transaccion: "Contado" },
    { id_venta: 1003, cliente: "Juan López",   tipo_transaccion: "Crédito" },
  ],
  productos: [
    { id_producto: 1, nombre_producto: "Lazo de nylon 12mm" },
    { id_producto: 2, nombre_producto: "Lazo de algodón 8mm" },
    { id_producto: 3, nombre_producto: "Accesorio tensor" },
  ],
  detalles: [
    { id_detalle_venta: 1, id_venta: 1001, id_producto: 1, cantidad: 10, precio_unitario: 50, costo_unitario_venta: 30 },
    { id_detalle_venta: 2, id_venta: 1001, id_producto: 3, cantidad:  5, precio_unitario: 20, costo_unitario_venta: 10 },
    { id_detalle_venta: 3, id_venta: 1002, id_producto: 2, cantidad: 50, precio_unitario: 15, costo_unitario_venta:  9 },
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

export const DetalleStore = {
  getAll(): DB { return load(); },

  create(d: Omit<Detalle, "id_detalle_venta">): number {
    const db = load();
    const next = Math.max(0, ...db.detalles.map(x => x.id_detalle_venta)) + 1;
    db.detalles.push({ id_detalle_venta: next, ...d });
    save(db);
    return next;
  },

  update(d: Detalle) {
    const db = load();
    db.detalles = db.detalles.map(x => x.id_detalle_venta === d.id_detalle_venta ? d : x);
    save(db);
  },

  delete(id_detalle_venta: number) {
    const db = load();
    db.detalles = db.detalles.filter(x => x.id_detalle_venta !== id_detalle_venta);
    save(db);
  },
};
