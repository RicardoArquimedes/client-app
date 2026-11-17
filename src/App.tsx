import { useEffect, useMemo, useState } from "react";
import "./App.css";
import {
  autorizarVendedor,
  consultarAutorizacion,
  consultarHistorialCliente,
  listarClientes,
  listarProductosDisponibles,
  registrarVenta,
} from "./api";
import type { Cliente, Producto, Venta } from "./types";
import { Loader } from "./components/Loader";

type Tab = "auth" | "venta" | "historial";

function money(n: number) {
  return n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
}

// El backend serializa el enum EstadoVenta como número (0 Pendiente, 1 Confirmada,
// 2 Entregada, 3 Cancelada), no como texto.
const ESTADOS: Record<number, string> = {
  0: "Pendiente",
  1: "Confirmada",
  2: "Entregada",
  3: "Cancelada",
};

function estadoLabel(estado: number | string): string {
  if (typeof estado === "number") return ESTADOS[estado] ?? `Estado ${estado}`;
  return estado;
}

function estadoClass(estado: number | string): string {
  return estadoLabel(estado).toLowerCase();
}

function AutorizacionPanel() {
  const [idVendedor, setIdVendedor] = useState("V01");
  const [autorizado, setAutorizado] = useState<boolean | null>(null);
  const [fechaVencimiento, setFechaVencimiento] = useState("2026-12-31");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState<"consultar" | "autorizar" | null>(null);

  const consultar = async () => {
    setError("");
    setCargando("consultar");
    try {
      const res = await consultarAutorizacion(idVendedor);
      setAutorizado(res.autorizado);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCargando(null);
    }
  };

  const autorizar = async () => {
    setError("");
    setMensaje("");
    setCargando("autorizar");
    try {
      await autorizarVendedor(idVendedor, fechaVencimiento);
      setMensaje(`${idVendedor} queda autorizado hasta ${fechaVencimiento}.`);
      await consultarAutorizacion(idVendedor).then((res) => setAutorizado(res.autorizado));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCargando(null);
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
        <button onClick={consultar} disabled={cargando !== null}>
          {cargando === "consultar" ? <Loader size="sm" /> : "Consultar"}
        </button>
      </div>

      {cargando === "consultar" && (
        <p className="subtitle">
          <Loader size="sm" label="Consultando… el backend puede tardar unos segundos si estaba dormido." />
        </p>
      )}

      {autorizado !== null && cargando === null && (
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
        <button className="secondary" onClick={autorizar} disabled={cargando !== null}>
          {cargando === "autorizar" ? <Loader size="sm" /> : "Autorizar vendedor"}
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
  const [cargandoInicial, setCargandoInicial] = useState(true);

  useEffect(() => {
    let pendientes = 2;
    const marcarListo = () => {
      pendientes -= 1;
      if (pendientes === 0) setCargandoInicial(false);
    };

    listarClientes()
      .then((data) => {
        setClientes(data);
        if (data.length) setIdCliente(data[0].idCliente);
      })
      .catch((e) => setError((e as Error).message))
      .finally(marcarListo);

    listarProductosDisponibles()
      .then(setProductos)
      .catch((e) => setError((e as Error).message))
      .finally(marcarListo);
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
    // Si el cliente retoma el carrito después de ver el recibo de la venta
    // anterior, ese recibo deja de mostrarse (vuelve a verse el carrito vivo).
    if (venta) setVenta(null);
    setCantidades((prev) => ({ ...prev, [idProducto]: Math.max(0, cantidad) }));
  };

  const enviarVenta = async () => {
    setError("");
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

  // Mientras no haya líneas nuevas en el carrito, el ticket muestra el recibo
  // de la última venta confirmada en lugar de quedar vacío en "$0".
  const mostrandoRecibo = lineas.length === 0 && venta !== null;

  return (
    <>
      <h1>Registrar venta</h1>
      <p className="subtitle">Elige el cliente, ajusta cantidades y confirma — el ticket se arma a la derecha.</p>

      {cargandoInicial && (
        <p className="subtitle">
          <Loader label="Cargando clientes y productos… el backend puede tardar unos segundos si estaba dormido." />
        </p>
      )}

      <div className="field-row">
        <div className="field">
          <span className="field-label">Vendedor</span>
          <input value={idVendedor} onChange={(e) => setIdVendedor(e.target.value)} />
        </div>
        <div className="field">
          <span className="field-label">Cliente</span>
          <select value={idCliente} onChange={(e) => setIdCliente(e.target.value)} disabled={cargandoInicial}>
            {clientes.length === 0 && (
              <option value="">
                {cargandoInicial ? "Cargando…" : "Sin clientes — ¿está el backend corriendo?"}
              </option>
            )}
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
          {productos.length === 0 && !error && cargandoInicial && (
            <p className="subtitle">
              <Loader size="sm" label="Cargando productos disponibles…" />
            </p>
          )}
        </div>

        <aside className="ticket">
          {mostrandoRecibo ? (
            <>
              <h2>Última venta registrada</h2>
              <p className="feedback ok" style={{ marginTop: 0 }}>
                {venta!.idVenta} · {estadoLabel(venta!.estado)}
              </p>
              {venta!.detalles.map((d, i) => (
                <div className="ticket-line" key={`${d.idProducto}-${i}`}>
                  <span>{d.idProducto}</span>
                  <span className="cant">×{d.cantidad}</span>
                  <span className="subtotal">{money(d.subtotal)}</span>
                </div>
              ))}
              <div className="ticket-total">
                <span className="label">Total</span>
                <span className="value">{money(venta!.total)}</span>
              </div>
              <p className="subtitle" style={{ marginTop: "0.75rem" }}>
                Ajusta cantidades a la izquierda para registrar otra venta.
              </p>
            </>
          ) : (
            <>
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
                {cargando ? <Loader size="sm" label="Registrando…" /> : "Registrar venta"}
              </button>
            </>
          )}
          {error && <p className="feedback error">{error}</p>}
        </aside>
      </div>
    </>
  );
}

function HistorialPanel() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [idCliente, setIdCliente] = useState("");
  const [ventas, setVentas] = useState<Venta[] | null>(null);
  const [error, setError] = useState("");
  const [cargandoClientes, setCargandoClientes] = useState(true);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  useEffect(() => {
    listarClientes()
      .then((data) => {
        setClientes(data);
        if (data.length) setIdCliente(data[0].idCliente);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setCargandoClientes(false));
  }, []);

  const consultar = async () => {
    if (!idCliente) return;
    setError("");
    setCargandoHistorial(true);
    try {
      const data = await consultarHistorialCliente(idCliente);
      setVentas(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCargandoHistorial(false);
    }
  };

  return (
    <>
      <h1>Historial de ventas</h1>
      <p className="subtitle">Consulta las ventas ya registradas para un cliente (GET /api/ventas/historial).</p>

      <div className="field-row">
        <div className="field">
          <span className="field-label">Cliente</span>
          <select value={idCliente} onChange={(e) => setIdCliente(e.target.value)} disabled={cargandoClientes}>
            {clientes.length === 0 && <option value="">{cargandoClientes ? "Cargando…" : "Sin clientes"}</option>}
            {clientes.map((c) => (
              <option key={c.idCliente} value={c.idCliente}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>
        <button onClick={consultar} disabled={cargandoClientes || cargandoHistorial || !idCliente}>
          {cargandoHistorial ? <Loader size="sm" /> : "Consultar historial"}
        </button>
      </div>

      {cargandoHistorial && (
        <p className="subtitle">
          <Loader size="sm" label="Consultando… el backend puede tardar unos segundos si estaba dormido." />
        </p>
      )}

      {ventas !== null && !cargandoHistorial && (
        ventas.length === 0 ? (
          <p className="subtitle">Este cliente todavía no tiene ventas registradas.</p>
        ) : (
          <div className="historial-list">
            {ventas.map((v) => (
              <div className="historial-card" key={v.idVenta}>
                <div className="historial-head">
                  <strong>{v.idVenta}</strong>
                  <span className={`chip ${estadoClass(v.estado)}`}>{estadoLabel(v.estado)}</span>
                </div>
                <div className="subtitle">
                  {new Date(v.fecha).toLocaleString("es-CO")} · vendedor {v.idVendedor}
                </div>
                {v.detalles.map((d, i) => (
                  <div className="ticket-line" key={`${v.idVenta}-${d.idProducto}-${i}`}>
                    <span>{d.idProducto}</span>
                    <span className="cant">×{d.cantidad}</span>
                    <span className="subtotal">{money(d.subtotal)}</span>
                  </div>
                ))}
                <div className="ticket-total">
                  <span className="label">Total</span>
                  <span className="value">{money(v.total)}</span>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {error && <p className="error">{error}</p>}
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
          <button className={tab === "historial" ? "active" : ""} onClick={() => setTab("historial")}>
            Historial
          </button>
        </nav>
      </header>

      <main>
        {tab === "auth" && <AutorizacionPanel />}
        {tab === "venta" && <VentaPanel />}
        {tab === "historial" && <HistorialPanel />}
      </main>
    </div>
  );
}

export default App;
