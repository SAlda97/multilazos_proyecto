export type SerieMes = {
  mes_label: string; // "06/2025"
  venta: number;
  costo: number;
  margen_bruto: number;
  gastos: number;
  margen_neto: number;
  margen_bruto_pct: number;       // %
  margen_neto_pct: number;        // %
  gastos_sobre_venta_pct: number; // %
};

export type RentabResponse = {
  months: number;
  id_tipo_transaccion: 0 | 1 | 2;
  labels: string[];     // mes/año
  series: SerieMes[];   // alineado a labels
  totales: {
    venta: number; costo: number; margen_bruto: number; gastos: number; margen_neto: number;
  };
  ventas_por_tipo: {
    contado: number; credito: number;
  };
};
