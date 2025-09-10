// Bitácora de ventas (solo UI). Refleja la tabla dbo.bitacora_ventas:
// id_bitacora, id_venta, operacion (INSERT/UPDATE/DELETE),
// datos_anteriores (JSON), datos_nuevos (JSON), usuario_evento, fecha_evento

export type BitacoraVenta = {
  id_bitacora: number;
  id_venta: number;
  operacion: "INSERT" | "UPDATE" | "DELETE";
  datos_anteriores: string | null; // JSON string o null
  datos_nuevos: string | null;     // JSON string o null
  usuario_evento: string;
  fecha_evento_iso: string;        // YYYY-MM-DD HH:mm:ss
};

type DB = { bitacora: BitacoraVenta[] };

const KEY = "mlz_bitacora_ventas_v1";

const seed: DB = {
  bitacora: [
    {
      id_bitacora: 1,
      id_venta: 1001,
      operacion: "INSERT",
      datos_anteriores: null,
      datos_nuevos: JSON.stringify({
        id_venta: 1001, id_cliente: 10, id_tipo_transaccion: 2, id_fecha: 20250901,
        plazo_mes: 3, interes: 12.5, total_venta_final: 900.0
      }, null, 2),
      usuario_evento: "admin",
      fecha_evento_iso: "2025-09-02 09:10:11",
    },
    {
      id_bitacora: 2,
      id_venta: 1001,
      operacion: "UPDATE",
      datos_anteriores: JSON.stringify({
        total_venta_final: 900.0, interes: 12.5
      }, null, 2),
      datos_nuevos: JSON.stringify({
        total_venta_final: 930.0, interes: 12.5
      }, null, 2),
      usuario_evento: "operador1",
      fecha_evento_iso: "2025-09-03 14:20:00",
    },
    {
      id_bitacora: 3,
      id_venta: 1002,
      operacion: "DELETE",
      datos_anteriores: JSON.stringify({
        id_venta: 1002, id_cliente: 11, id_tipo_transaccion: 1, total_venta_final: 300.0
      }, null, 2),
      datos_nuevos: null,
      usuario_evento: "auditor",
      fecha_evento_iso: "2025-09-05 08:30:45",
    }
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
function save(db: DB) { localStorage.setItem(KEY, JSON.stringify(db)); }

export const BitacoraStore = {
  getAll(): DB { return load(); },

  // utilidades UI para “agregar” eventos localmente si lo necesitas
  append(e: Omit<BitacoraVenta, "id_bitacora">) {
    const db = load();
    const next = Math.max(0, ...db.bitacora.map(b => b.id_bitacora)) + 1;
    db.bitacora.unshift({ id_bitacora: next, ...e }); // al inicio
    save(db);
    return next;
  },

  clearAll() {
    save({ bitacora: [] });
  }
};
