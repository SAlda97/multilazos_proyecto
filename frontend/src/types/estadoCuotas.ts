// src/types/estadoCuotas.ts
export type EstadoCuota = {
  id_cuota: number;
  id_venta: number;
  numero_cuota: number;
  fecha_venc_iso: string;
  monto_programado: string;
  monto_pagado: string;
  saldo_pendiente: string;
  estado: "pendiente" | "parcial" | "pagada" | "atrasada";
  cliente: string;
};
