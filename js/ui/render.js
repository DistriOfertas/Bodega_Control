import { getState, isAdmin } from "../services/state.js";
import {
  fmtDateTime,
  diffMinutes,
  labelEstado,
  estadoEmpleado,
} from "../utils/helpers.js";
import { llenarSelects } from "./events.js";

let currentTrazabilidadSearch = "";
let filtroBuscar = "";
let filtroEstado = "todos";
let filtroBodeguero = "todos";

// Función principal de renderizado
export function render() {
  const state = getState();

  const roleBadge = document.getElementById("roleBadge");
  if (roleBadge) roleBadge.textContent = `Rol: ${state.role}`;

  const userNameElement = document.getElementById("userName");
  if (userNameElement) {
    userNameElement.textContent = state.currentUser
      ? state.currentUser.nombre
      : "Sin sesión";
  }

  llenarSelects();
  cargarBodeguerosEnFiltro();
  renderPedidos();
  renderOperacion();
  renderDashboard();
  renderHistorial();
  renderAlmuerzos();
  renderPersonal();
  renderTrazabilidad();
}

export function renderPedidos() {
  const box = document.getElementById("listaPedidos");
  if (!box) return;

  const state = getState();
  if (!state.pedidos || state.pedidos.length === 0) {
    box.innerHTML = '<div class="empty">Aún no hay pedidos registrados.</div>';
    return;
  }

  let pedidosFiltrados = [...state.pedidos];

  // Filtro por búsqueda (proveedor, factura, comprador)
  if (filtroBuscar.trim() !== "") {
    const busqueda = filtroBuscar.toLowerCase().trim();
    pedidosFiltrados = pedidosFiltrados.filter(
      (p) =>
        (p.proveedor && p.proveedor.toLowerCase().includes(busqueda)) ||
        (p.factura && p.factura.toLowerCase().includes(busqueda)) ||
        (p.comprador && p.comprador.toLowerCase().includes(busqueda)),
    );
  }

  // Filtro por estado
  if (filtroEstado !== "todos") {
    pedidosFiltrados = pedidosFiltrados.filter(
      (p) => p.estado === filtroEstado,
    );
  }

  // Filtro por bodeguero
  if (filtroBodeguero !== "todos") {
    pedidosFiltrados = pedidosFiltrados.filter(
      (p) => p.bodegueroId === filtroBodeguero,
    );
  }

  if (pedidosFiltrados.length === 0) {
    box.innerHTML =
      '<div class="empty">No hay pedidos que coincidan con los filtros.</div>';
    return;
  }

  box.innerHTML = state.pedidos
    .map((p) => {
      const noReprogramar = p.estado === "finalizado" || !!p.reciboFin;
      return `<div class="order">
      <div class="order-top">
        <div>
          <h3>${p.proveedor || "Sin proveedor"}</h3>
          <div class="muted small">Factura: ${p.factura || "Sin factura"}</div>
        </div>
        <div class="status ${p.estado}">${labelEstado(p.estado)}</div>
      </div>
      <div class="meta">
        <span>📅 ${p.fechaProgramada || "Sin fecha"}</span>
        <span>🕒 ${p.horaProgramada || "Sin hora"}</span>
        <span>👷 ${p.bodeguero || "Sin asignar"}</span>
        <span>🛒 ${p.comprador || "Sin comprador"}</span>
      </div>
      ${p.observaciones ? `<div class="muted small">${p.observaciones}</div>` : ""}
      <div class="btns">
        <button class="btn-warn" onclick="window.reprogramarPedido('${p.id}')" ${noReprogramar ? "disabled" : ""}>Reprogramar</button>
        <button class="btn-soft" onclick="window.editarPersonas('${p.id}')">Personas descarga</button>
      </div>
    </div>`;
    })
    .join("");
}

// Añadir estas funciones al archivo render.js existente

export function renderOperacion() {
  const box = document.getElementById("listaOperacion");
  if (!box) return;

  const state = getState();
  const activos = state.pedidos.filter((p) => p.estado !== "finalizado");
  if (!activos.length) {
    box.innerHTML = '<div class="card empty">No hay operaciones activas.</div>';
    return;
  }

  box.innerHTML = activos
    .map((p) => {
      const sinBodeguero = !p.bodegueroId || !p.bodeguero;
      const optionsCurrent =
        state.personal && state.personal.length
          ? '<option value="">Selecciona bodeguero</option>' +
            state.personal
              .map(
                (e) =>
                  `<option value="${e.id}" ${p.bodegueroId === e.id ? "selected" : ""}>${e.nombre}</option>`,
              )
              .join("")
          : '<option value="">No hay empleados</option>';

      return `<div class="card">
      <div class="order-top">
        <div>
          <h3>${p.proveedor}</h3>
          <div class="muted small">Factura ${p.factura}</div>
        </div>
        <div class="status ${p.estado}">${labelEstado(p.estado)}</div>
      </div>
      <div class="meta">
        <span>📅 ${p.fechaProgramada}</span>
        <span>🕒 ${p.horaProgramada}</span>
        <span>👷 ${p.bodeguero || "Sin asignar"}</span>
        <span>🚚 Personas: ${p.personasDescarga ?? "No registrado"}</span>
      </div>
      <div class="order inline-assign">
        <div class="grid grid-2">
          <div><select id="assign-bodeguero-${p.id}">${optionsCurrent}</select></div>
          <div><button class="btn-blue" onclick="window.asignarBodegueroOperacion('${p.id}')">${sinBodeguero ? "Asignar" : "Actualizar"}</button></div>
        </div>
      </div>
      <div class="btns">
        <button class="btn-violet" onclick="window.iniciarInventario('${p.id}')" ${p.inventarioInicio ? "disabled" : ""}>Iniciar inventario</button>
        <button class="btn-soft" onclick="window.finalizarInventario('${p.id}')" ${!p.inventarioInicio || p.inventarioFin ? "disabled" : ""}>Finalizar inventario</button>
        <button class="btn-blue" onclick="window.iniciarRecibo('${p.id}')" ${!p.inventarioFin || p.reciboInicio ? "disabled" : ""}>Iniciar recibo</button>
        <button class="btn-primary" onclick="window.finalizarRecibo('${p.id}')" ${!p.reciboInicio || p.reciboFin ? "disabled" : ""}>Finalizar recibo</button>
      </div>
    </div>`;
    })
    .join("");
}

// Función para actualizar filtros y refrescar la lista
export function actualizarFiltros() {
  const inputBuscar = document.getElementById("filtroBuscar");
  const selectEstado = document.getElementById("filtroEstado");
  const selectBodeguero = document.getElementById("filtroBodeguero");

  if (inputBuscar) filtroBuscar = inputBuscar.value;
  if (selectEstado) filtroEstado = selectEstado.value;
  if (selectBodeguero) filtroBodeguero = selectBodeguero.value;

  renderPedidos();
}

// Función para limpiar filtros
export function limpiarFiltros() {
  const inputBuscar = document.getElementById("filtroBuscar");
  const selectEstado = document.getElementById("filtroEstado");
  const selectBodeguero = document.getElementById("filtroBodeguero");

  if (inputBuscar) inputBuscar.value = "";
  if (selectEstado) selectEstado.value = "todos";
  if (selectBodeguero) selectBodeguero.value = "todos";

  filtroBuscar = "";
  filtroEstado = "todos";
  filtroBodeguero = "todos";

  renderPedidos();
}

// Función para cargar bodegueros en el filtro (llamar después de cargar personal)
export function cargarBodeguerosEnFiltro() {
  const select = document.getElementById("filtroBodeguero");
  if (!select) return;

  const state = getState();
  const personal = state.personal || [];

  let options = '<option value="todos">Todos</option>';
  personal.forEach((emp) => {
    options += `<option value="${emp.id}">${emp.nombre}</option>`;
  });

  select.innerHTML = options;
}

export function renderDashboard() {
  const state = getState();
  const pedidos = state.pedidos;
  const activos = pedidos.filter((p) => p.estado !== "finalizado").length;
  const reprog = pedidos.filter(
    (p) => p.reprogramaciones && p.reprogramaciones.length > 0,
  ).length;

  document.getElementById("kpiActivos").textContent = activos;
  document.getElementById("kpiReprog").textContent = reprog;

  const resumen = { disponibles: 0, almuerzo: 0, inventario: 0, recibo: 0 };
  state.personal.forEach((emp) => {
    const est = estadoEmpleado(emp);
    if (est.clase === "almuerzo") resumen.almuerzo++;
    else if (est.clase === "inventario") resumen.inventario++;
    else if (est.clase === "recibo") resumen.recibo++;
    else resumen.disponibles++;
  });

  document.getElementById("kpiDisponibles").textContent = resumen.disponibles;
  document.getElementById("kpiAlmuerzo").textContent = resumen.almuerzo;
  document.getElementById("kpiInventarioPersonal").textContent =
    resumen.inventario;
  document.getElementById("kpiReciboPersonal").textContent = resumen.recibo;

  const alerts = [];
  pedidos.forEach((p) => {
    if (
      p.personasDescarga !== null &&
      p.personasDescarga < 2 &&
      p.estado !== "finalizado"
    ) {
      alerts.push(
        `Pedido ${p.factura} tiene pocas personas (${p.personasDescarga})`,
      );
    }
  });
  document.getElementById("listaAlertas").innerHTML = alerts.length
    ? alerts.map((a) => `<div class="alert">${a}</div>`).join("")
    : '<div class="empty">Sin alertas</div>';
}

export function renderHistorial() {
  const box = document.getElementById("listaHistorial");
  if (!box) return;

  const state = getState();
  const fin = state.pedidos.filter((p) => p.estado === "finalizado");
  if (!fin.length) {
    box.innerHTML = '<div class="empty">No hay pedidos finalizados.</div>';
    return;
  }

  box.innerHTML = fin
    .map(
      (p) => `<div class="order">
    <div class="order-top">
      <div>
        <h3>${p.proveedor}</h3>
        <div class="muted small">Factura ${p.factura}</div>
      </div>
      <div class="status finalizado">Finalizado</div>
    </div>
    <div class="meta">
      <span>Inventario: ${diffMinutes(p.inventarioInicio, p.inventarioFin) ?? "—"} min</span>
      <span>Recibo: ${diffMinutes(p.reciboInicio, p.reciboFin) ?? "—"} min</span>
    </div>
  </div>`,
    )
    .join("");
}

export function renderAlmuerzos() {
  const state = getState();
  const activos = state.almuerzos.filter((a) => !a.regreso);

  const activosDiv = document.getElementById("listaAlmuerzoActivos");
  if (activosDiv) {
    activosDiv.innerHTML = activos.length
      ? activos
          .map(
            (a) => `<div class="order">
        <h3>${a.nombre}</h3>
        <div class="meta">Salida: ${fmtDateTime(a.salida)}</div>
        <button class="btn-primary" onclick="window.registrarRegresoAlmuerzo('${a.id}')">Regresar</button>
      </div>`,
          )
          .join("")
      : '<div class="empty">Nadie en almuerzo</div>';
  }

  const historialDiv = document.getElementById("listaAlmuerzoHistorial");
  if (historialDiv) {
    historialDiv.innerHTML = state.almuerzos.length
      ? state.almuerzos
          .map(
            (a) => `<div class="order">
        <h3>${a.nombre}</h3>
        <div class="meta">Salida: ${fmtDateTime(a.salida)} | Regreso: ${fmtDateTime(a.regreso)}</div>
      </div>`,
          )
          .join("")
      : '<div class="empty">Sin historial</div>';
  }
}

export function renderPersonal() {
  const box = document.getElementById("listaPersonal");
  if (!box) return;

  const state = getState();
  if (!state.personal || state.personal.length === 0) {
    box.innerHTML =
      '<div class="empty">Aún no hay empleados registrados.</div>';
    return;
  }

  box.innerHTML = state.personal
    .map((emp) => {
      const est = estadoEmpleado(emp);
      const disableDelete = !isAdmin() ? "disabled" : "";
      return `<div class="order">
      <div class="order-top">
        <div>
          <h3>${emp.nombre}</h3>
          <div class="muted small">${emp.cargo || "Sin cargo"}</div>
        </div>
        <div class="status ${est.clase}">${est.texto}</div>
      </div>
      <div class="btns"><button class="btn-danger" onclick="window.eliminarEmpleado('${emp.id}')" ${disableDelete}>Eliminar</button></div>
    </div>`;
    })
    .join("");
}

export function renderTrazabilidad() {
  const box = document.getElementById("listaTrazabilidad");
  if (!box) return;

  const state = getState();
  if (!state.trazabilidad || state.trazabilidad.length === 0) {
    box.innerHTML =
      '<div class="empty">Aún no hay movimientos registrados.</div>';
    return;
  }

  // Aplicar filtro de búsqueda
  let filteredLogs = [...state.trazabilidad];

  if (currentTrazabilidadSearch.trim() !== "") {
    const searchTerm = currentTrazabilidadSearch.toLowerCase().trim();
    filteredLogs = state.trazabilidad.filter(
      (log) =>
        log.tipo.toLowerCase().includes(searchTerm) ||
        log.detalle.toLowerCase().includes(searchTerm) ||
        log.usuario.toLowerCase().includes(searchTerm) ||
        log.rol.toLowerCase().includes(searchTerm),
    );
  }

  if (filteredLogs.length === 0) {
    box.innerHTML = `<div class="empty">No hay resultados para "${currentTrazabilidadSearch}"</div>`;
    return;
  }

  box.innerHTML = filteredLogs
    .map(
      (t) => `<div class="order">
    <div class="order-top">
      <div>
        <h3>${t.tipo}</h3>
        <div class="muted small">${t.detalle}</div>
      </div>
      <div class="status">${t.usuario}</div>
    </div>
    <div class="meta">
      <span>Rol: ${t.rol}</span>
      <span>Fecha: ${fmtDateTime(t.fecha)}</span>
    </div>
  </div>`,
    )
    .join("");
}

// Función para actualizar la búsqueda
export function setTrazabilidadSearch(searchTerm) {
  currentTrazabilidadSearch = searchTerm;
  renderTrazabilidad();
}

export function mostrarVista(nombre) {
  const state = getState();
  if (!state.currentUser) {
    const loginView = document.getElementById("view-login");
    if (loginView) loginView.classList.remove("hidden");
    return;
  }

  const allowed =
    state.currentUser.role === "admin"
      ? [
          "pedidos",
          "operacion",
          "dashboard",
          "historial",
          "almuerzo",
          "personal",
          "reporte",
          "trazabilidad",
        ]
      : ["operacion", "dashboard", "historial", "almuerzo", "reporte"];

  if (!allowed.includes(nombre)) return;

  const views = [
    "pedidos",
    "operacion",
    "dashboard",
    "historial",
    "almuerzo",
    "personal",
    "reporte",
    "trazabilidad",
  ];
  views.forEach((v) => {
    const el = document.getElementById(`view-${v}`);
    if (el) el.classList.toggle("hidden", v !== nombre);
  });

  document.querySelectorAll(".tab").forEach((t) => {
    t.classList.toggle("active", t.dataset.view === nombre);
  });
}
// Similar para renderOperacion, renderDashboard, etc.
// (continuaré con las demás funciones de renderizado)
