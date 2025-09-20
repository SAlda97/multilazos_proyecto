export interface DetalleVenta {
  id_detalle_venta: number;
  id_producto: number;
  producto: string;
  cantidad: string | number;
  precio_unitario: string | number;
  costo_unitario_venta: string | number;
}
