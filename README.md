# PoliMarket · Cliente Ventas (React + TypeScript)

Cliente web para el rol **vendedor** del caso PoliMarket (Actividad Sumativa U2 — Reutilización de software). Consume el backend en C#/.NET 8 (proyecto `PoliMarket.Api`) vía HTTP REST.

## Funcionalidades cubiertas

- **RF1** — Consultar y otorgar autorización a un vendedor (`GET/POST /api/rrhh/*`).
- **RF2** — Listar productos disponibles y registrar una venta (`GET /api/bodega/productos`, `GET /api/ventas/clientes`, `POST /api/ventas`).

## Requisitos previos

El backend `PoliMarket.Api` debe estar corriendo en `http://localhost:5000` (ver su propio README: `dotnet run --project PoliMarket.Api`). CORS ya está abierto en el backend (`AllowAnyOrigin`), así que no se necesita configuración adicional.

## Ejecución local

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`.

## Build de producción

```bash
npm run build
```
# client-app
