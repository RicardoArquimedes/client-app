// Tipos que reflejan los DTOs del backend PoliMarket.Api (System.Text.Json serializa en camelCase)

export interface Cliente {
  idCliente: string;
  nombre: string;
  documento: string;
  direccion: string;
  telefono: string;
}

export interface Producto {
  idProducto: string;
  nombre: string;
  descripcion: string;
  precioUnitario: number;
  unidadMedida: string;
}

export interface DetalleVentaInput {
  idProducto: string;
  cantidad: number;
  precioUnitario: number;
}

export interface DetalleVenta extends DetalleVentaInput {
  subtotal: number;
}

export interface Venta {
  idVenta: string;
  idVendedor: string;
  idCliente: string;
  fecha: string;
  total: number;
  // El backend serializa el enum EstadoVenta como número (ver estadoLabel en App.tsx).
  estado: number;
  detalles: DetalleVenta[];
}

export interface ApiError {
  error: string;
}
