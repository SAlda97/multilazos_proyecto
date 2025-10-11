// src/utils/format.ts
const nfQ = new Intl.NumberFormat("es-GT", {
  style: "currency",
  currency: "GTQ",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Acepta number | string | null | undefined
export function fmtQ(v: number | string | null | undefined): string {
  const n = Number(v ?? 0);
  if (!isFinite(n)) return "Q 0.00";
  // Reemplazo NBSP por espacio normal para evitar saltos raros
  return nfQ.format(n).replace(/\u00A0/g, " ");
}

// Si en algún lugar quieres solo número con separadores (sin Q)
// ej. porcentajes, totales no-monetarios, etc.
const nf2 = new Intl.NumberFormat("es-GT", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
export function fmt2(v: number | string | null | undefined): string {
  const n = Number(v ?? 0);
  if (!isFinite(n)) return "0.00";
  return nf2.format(n);
}
