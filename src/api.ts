import type { Cliente, Producto, Venta, DetalleVentaInput } from "./types";

// Por defecto apunta al backend local. Para probar contra el backend desplegado
// (Render, etc.), crea un archivo .env con: VITE_API_BASE_URL=https://tu-url
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000";

async function handle<T>(res: Response): Promise<T> {
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message = data?.error ?? `Error ${res.status}`;
    throw new Error(message);
  }
  return data as T;
}

// RF1 - Recursos Humanos
export function consultarAutorizacion(idVendedor: string) {
  return fetch(`${BASE_URL}/api/rrhh/autorizado/${idVendedor}`).then((r) =>
    handle<{ idVendedor: string; autorizado: boolean }>(r)
  );
}

export function autorizarVendedor(idVendedor: string, fechaVencimiento: string) {
  const url = `${BASE_URL}/api/rrhh/autorizar/${idVendedor}?fechaVencimiento=${encodeURIComponent(
    fechaVencimiento
  )}`;
  return fetch(url, { method: "POST" }).then((r) => handle(r));
}

// RF2 - Ventas
export function listarClientes() {
  return fetch(`${BASE_URL}/api/ventas/clientes`).then((r) => handle<Cliente[]>(r));
}

export function registrarVenta(
  idVendedor: string,
  idCliente: string,
  detalles: DetalleVentaInput[]
) {
  return fetch(`${BASE_URL}/api/ventas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idVendedor, idCliente, detalles }),
  }).then((r) => handle<Venta>(r));
}

export function consultarHistorialCliente(idCliente: string) {
  return fetch(`${BASE_URL}/api/ventas/historial/${idCliente}`).then((r) => handle<Venta[]>(r));
}

// RF3 - Bodega
export function listarProductosDisponibles() {
  return fetch(`${BASE_URL}/api/bodega/productos`).then((r) => handle<Producto[]>(r));
}

export function consultarDisponibilidad(idProducto: string) {
  return fetch(`${BASE_URL}/api/bodega/disponibilidad/${idProducto}`).then((r) =>
    handle<{ idProducto: string; disponible: number }>(r)
  );
}
