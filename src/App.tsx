import { useEffect, useMemo, useState } from "react";
import "./App.css";
import {
  autorizarVendedor,
  consultarAutorizacion,
  listarClientes,
  listarProductosDisponibles,
  registrarVenta,
} from "./api";
import type { Cliente, Producto, Venta } from "./types";

type Tab = "auth" | "venta";

function money(n: number) {
  return n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
}

function AutorizacionPanel() {
  const [idVendedor, setIdVendedor] = useState("V01");
  const [autorizado, setAutorizado] = useState<boolean | null>(null);
  const [fechaVencimiento, setFechaVencimiento] = useState("2026-12-31");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const consultar = async () => {
    setError("");
    try {
      const res = await consultarAutorizacion(idVendedor);
      setAutorizado(res.autorizado);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const autorizar = async () => {
    setError("");
    setMensaje("");
    try {
      await autorizarVendedor(idVendedor, fechaVencimiento);
      setMensaje(`${idVendedor} queda autorizado hasta ${fechaVencimiento}.`);
      await consultar();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <>
      <h1>Autorización de vendedores</h1>
      <p className="subtitle">Verifica si un vendedor puede operar en el sistema, o extiende su permiso.</p>

      <div className="field-row">
        <div className="field">
          <span className="field-label">Vendedor</span>
          <input value={idVendedor} onChange={(e) => setIdVendedor(e.target.value)} placeholder="V01" />
        </div>
        <button onClick={consultar}>Consultar</button>
      </div>

      {autorizado !== null && (
        <div className={`status-banner ${autorizado ? "si" : "no"}`}>
          <span className="dot" />
          <div>
            <strong>{autorizado ? "Autorizado" : "Sin autorización vigente"}</strong>
            <br />
            <span className="detail">
              {autorizado
                ? "Puede registrar ventas en el sistema."
                : "No podrá registrar ventas hasta que recursos humanos lo autorice."}
            </span>
          </div>
        </div>
      )}

      <hr className="divider" />

      <p className="subtitle" style={{ marginBottom: "1rem" }}>Extender autorización</p>
      <div className="field-row">
        <div className="field">
          <span className="field-label">Vigente hasta</span>
          <input type="date" value={fechaVencimiento} onChange={(e) => setFechaVencimiento(e.target.value)} />
        </div>
        <button className="secondary" onClick={autorizar}>
          Autorizar vendedor
        </button>
      </div>

      {mensaje && <p className="ok">{mensaje}</p>}
      {error && <p className="error">{error}</p>}
    </>
  );
}

function VentaPanel() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [idVendedor, setIdVendedor] = useState("V01");
  const [idCliente, setIdCliente] = useState("");
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [venta, setVenta] = useState<Venta | null>(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    listarClientes()
      .then((data) => {
        setClientes(data);
        if (data.length) setIdCliente(data[0].idCliente);
      })
      .catch((e) => setError((e as Error).message));

    listarProductosDisponibles()
      .then(setProductos)
      .catch((e) => setError((e as Error).message));
  }, []);

  const lineas = useMemo(
    () =>
      productos
        .map((p) => ({ producto: p, cantidad: cantidades[p.idProducto] ?? 0 }))
        .filter((l) => l.cantidad > 0),
    [productos, cantidades]
  );

  const total = useMemo(
    () => lineas.reduce((sum, l) => sum + l.cantidad * l.producto.precioUnitario, 0),
    [lineas]
  );

  const cambiarCantidad = (idProducto: string, cantidad: number) => {
    setCantidades((prev) => ({ ...prev, [idProducto]: Math.max(0, cantidad) }));
  };

  const enviarVenta = async () => {
    setError("");
    setVenta(null);
    if (!idCliente || lineas.length === 0) {
      setError("Selecciona un cliente y al menos un producto.");
      return;
    }
    setCargando(true);
    try {
      const detalles = lineas.map((l) => ({
        idProducto: l.producto.idProducto,
        cantidad: l.cantidad,
        precioUnitario: l.producto.precioUnitario,
      }));
      const nuevaVenta = await registrarVenta(idVendedor, idCliente, detalles);
      setVenta(nuevaVenta);
      setCantidades({});
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <>
      <h1>Registrar venta</h1>
      <p className="subtitle">Elige el cliente, ajusta cantidades y confirma — el ticket se arma a la derecha.</p>

      <div className="field-row">
        <div className="field">
          <span className="field-label">Vendedor</span>
          <input value={idVendedor} onChange={(e) => setIdVendedor(e.target.value)} />
        </div>
        <div className="field">
          <span className="field-label">Cliente</span>
          <select value={idCliente} onChange={(e) => setIdCliente(e.target.value)}>
            {clientes.length === 0 && <option value="">Sin clientes — ¿está el backend corriendo?</option>}
            {clientes.map((c) => (
              <option key={c.idCliente} value={c.idCliente}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="venta-layout">
        <div className="producto-list">
          {productos.map((p) => (
            <div className="producto-row" key={p.idProducto}>
              <div>
                <div className="nombre">{p.nombre}</div>
                <div className="unidad">{p.unidadMedida}</div>
              </div>
              <div className="precio">{money(p.precioUnitario)}</div>
              <input
                type="number"
                min={0}
                value={cantidades[p.idProducto] ?? ""}
                placeholder="0"
                onChange={(e) => cambiarCantidad(p.idProducto, Number(e.target.value))}
              />
            </div>
          ))}
          {productos.length === 0 && !error && (
            <p className="subtitle">Cargando productos disponibles…</p>
          )}
        </div>

        <aside className="ticket">
          <h2>Ticket</h2>
          {lineas.length === 0 ? (
            <p className="empty">Aún no has agregado productos.</p>
          ) : (
            lineas.map((l) => (
              <div className="ticket-line" key={l.producto.idProducto}>
                <span>{l.producto.nombre}</span>
                <span className="cant">×{l.cantidad}</span>
                <span className="subtotal">{money(l.cantidad * l.producto.precioUnitario)}</span>
              </div>
            ))
          )}
          <div className="ticket-total">
            <span className="label">Total</span>
            <span className="value">{money(total)}</span>
          </div>
          <button onClick={enviarVenta} disabled={lineas.length === 0 || cargando}>
            {cargando ? "Registrando…" : "Registrar venta"}
          </button>
          {venta && <p className="feedback ok">Venta {venta.idVenta} confirmada.</p>}
          {error && <p className="feedback error">{error}</p>}
        </aside>
      </div>
    </>
  );
}

function App() {
  const [tab, setTab] = useState<Tab>("auth");

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">PoliMarket</span>
        <nav>
          <button className={tab === "auth" ? "active" : ""} onClick={() => setTab("auth")}>
            Autorización
          </button>
          <button className={tab === "venta" ? "active" : ""} onClick={() => setTab("venta")}>
            Registrar venta
          </button>
        </nav>
      </header>

      <main>{tab === "auth" ? <AutorizacionPanel /> : <VentaPanel />}</main>
    </div>
  );
}

export default App;
