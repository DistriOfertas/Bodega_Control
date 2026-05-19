import { getState, isAdmin } from "../services/state.js";
import {
  fmtDateTime,
  diffMinutes,
  labelEstado,
  estadoEmpleado,
} from "../utils/helpers.js";
import { llenarSelects } from "./events.js";

// Variables para gráficos
let chartsInitialized = false;
let pedidosChart = null;
let personalChart = null;
let tendenciasChart = null;

let trazabilidadSearchTerm = "";

function setTrazabilidadSearch(searchTerm) {
  console.log("setTrazabilidadSearch llamada con:", searchTerm);
  trazabilidadSearchTerm = searchTerm;
  renderTrazabilidad();
}

// Función principal de renderizado
function render() {
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
  renderPedidos();
  renderOperacion();
  renderDashboard();
  renderHistorial();
  renderPausas();
  renderPersonal();
  renderTrazabilidad();

  // Actualizar gráficos si ya están inicializados
  if (chartsInitialized) {
    updateChartsData();
  }
}

// Inicializar gráficos (llamar una sola vez)
function initCharts() {
  if (chartsInitialized) return;

  console.log("🎨 Inicializando gráficos...");

  // Destruir gráficos existentes si los hay
  destroyCharts();

  // Crear nuevo gráfico de pedidos
  const ctxPedidos = document.getElementById("chartPedidosEstado");
  if (ctxPedidos) {
    pedidosChart = new Chart(ctxPedidos, {
      type: "doughnut",
      data: {
        labels: [
          "Programado",
          "Reprogramado",
          "Inventario",
          "Recibo",
          "Finalizado",
        ],
        datasets: [
          {
            data: [0, 0, 0, 0, 0],
            backgroundColor: [
              "#ffc107",
              "#fd7e14",
              "#17a2b8",
              "#007bff",
              "#28a745",
            ],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { position: "bottom" } },
      },
    });
  }

  // Crear nuevo gráfico de personal
  const ctxPersonal = document.getElementById("chartPersonalEstado");
  if (ctxPersonal) {
    personalChart = new Chart(ctxPersonal, {
      type: "pie",
      data: {
        labels: ["Disponible", "Almuerzo", "Inventario", "Recibo"],
        datasets: [
          {
            data: [0, 0, 0, 0],
            backgroundColor: ["#28a745", "#ffc107", "#17a2b8", "#007bff"],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { position: "bottom" } },
      },
    });
  }

  // Crear nuevo gráfico de tendencias
  const ctxTendencias = document.getElementById("chartTendencias");
  if (ctxTendencias) {
    tendenciasChart = new Chart(ctxTendencias, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "Pedidos creados",
            data: [],
            borderColor: "#007bff",
            backgroundColor: "rgba(0, 123, 255, 0.1)",
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { position: "top" } },
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
      },
    });
  }

  chartsInitialized = true;
  updateChartsData();
  console.log("✅ Gráficos inicializados correctamente");
}

// Destruir gráficos
function destroyCharts() {
  if (pedidosChart) {
    pedidosChart.destroy();
    pedidosChart = null;
  }
  if (personalChart) {
    personalChart.destroy();
    personalChart = null;
  }
  if (tendenciasChart) {
    tendenciasChart.destroy();
    tendenciasChart = null;
  }
}

// Actualizar datos de los gráficos
function updateChartsData() {
  const state = getState();
  const pedidos = state.pedidos || [];
  const personal = state.personal || [];

  // Actualizar gráfico de pedidos
  if (pedidosChart) {
    const estados = [
      "programado",
      "reprogramado",
      "inventario",
      "recibo",
      "finalizado",
    ];
    const conteos = estados.map(
      (e) => pedidos.filter((p) => p.estado === e).length,
    );
    pedidosChart.data.datasets[0].data = conteos;
    pedidosChart.update();
  }

  // Actualizar gráfico de personal
  if (personalChart) {
    let disponibles = 0,
      almuerzo = 0,
      inventario = 0,
      recibo = 0;

    personal.forEach((emp) => {
      const enAlmuerzo = state.almuerzos.some(
        (a) => a.empleadoId === emp.id && !a.regreso,
      );
      const enInventario = pedidos.some(
        (p) =>
          p.bodegueroId === emp.id && p.inventarioInicio && !p.inventarioFin,
      );
      const enRecibo = pedidos.some(
        (p) => p.bodegueroId === emp.id && p.reciboInicio && !p.reciboFin,
      );

      if (enAlmuerzo) almuerzo++;
      else if (enInventario) inventario++;
      else if (enRecibo) recibo++;
      else disponibles++;
    });

    personalChart.data.datasets[0].data = [
      disponibles,
      almuerzo,
      inventario,
      recibo,
    ];
    personalChart.update();
  }

  // Actualizar gráfico de tendencias
  if (tendenciasChart) {
    const labels = [];
    const datos = [];

    for (let i = 6; i >= 0; i--) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - i);
      const fechaStr = fecha.toISOString().slice(0, 10);
      labels.push(fechaStr.slice(5, 10));

      const pedidosDia = pedidos.filter(
        (p) => p.createdAt && p.createdAt.slice(0, 10) === fechaStr,
      );
      datos.push(pedidosDia.length);
    }

    tendenciasChart.data.labels = labels;
    tendenciasChart.data.datasets[0].data = datos;
    tendenciasChart.update();
  }
}

// Función para forzar actualización de gráficos (llamar después de cambios)
function refreshCharts() {
  if (chartsInitialized) {
    updateChartsData();
  }
}

export function renderDashboard() {
  const state = getState();
  const pedidos = state.pedidos;
  const activos = pedidos.filter((p) => p.estado !== "finalizado").length;
  const reprog = pedidos.filter(
    (p) => p.reprogramaciones && p.reprogramaciones.length > 0,
  ).length;

  const invProm = calcularTiempoPromedio(pedidos, "inventario");
  const recProm = calcularTiempoPromedio(pedidos, "recibo");

  document.getElementById("kpiActivos").textContent = activos;
  document.getElementById("kpiReprog").textContent = reprog;
  document.getElementById("kpiInv").textContent = invProm;
  document.getElementById("kpiRec").textContent = recProm;

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

function calcularTiempoPromedio(pedidos, tipo) {
  let suma = 0;
  let count = 0;

  pedidos.forEach((p) => {
    if (p.estado === "finalizado") {
      let tiempo = null;
      if (tipo === "inventario") {
        tiempo = diffMinutes(p.inventarioInicio, p.inventarioFin);
      } else {
        tiempo = diffMinutes(p.reciboInicio, p.reciboFin);
      }
      if (tiempo && tiempo > 0) {
        suma += tiempo;
        count++;
      }
    }
  });

  return count > 0 ? Math.round(suma / count) : 0;
}

// El resto de tus funciones (renderPedidos, renderOperacion, etc.) permanecen igual...
export function renderPedidos() {
  const box = document.getElementById("listaPedidos");
  if (!box) return;

  const state = getState();
  if (!state.pedidos || state.pedidos.length === 0) {
    box.innerHTML = '<div class="empty">Aún no hay pedidos registrados.</div>';
    return;
  }

  // Aplicar filtros - USAR UNA SOLA VARIABLE
  let pedidosMostrados = [...state.pedidos];

  // Filtro por búsqueda (proveedor, factura, comprador)
  if (filtroBuscar && filtroBuscar.trim() !== "") {
    const busqueda = filtroBuscar.toLowerCase().trim();
    pedidosMostrados = pedidosMostrados.filter(
      (p) =>
        (p.proveedor && p.proveedor.toLowerCase().includes(busqueda)) ||
        (p.factura && p.factura.toLowerCase().includes(busqueda)) ||
        (p.comprador && p.comprador.toLowerCase().includes(busqueda)),
    );
  }

  // Filtro por estado
  if (filtroEstado && filtroEstado !== "todos") {
    pedidosMostrados = pedidosMostrados.filter(
      (p) => p.estado === filtroEstado,
    );
  }

  // Filtro por bodeguero
  if (filtroBodeguero && filtroBodeguero !== "todos") {
    pedidosMostrados = pedidosMostrados.filter(
      (p) => p.bodegueroId === filtroBodeguero,
    );
  }

  if (pedidosMostrados.length === 0) {
    box.innerHTML =
      '<div class="empty">No hay pedidos que coincidan con los filtros.</div>';
    return;
  }

  box.innerHTML = pedidosMostrados
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

// Función para actualizar gráficos cuando se cambia de vista
function mostrarVista(nombre) {
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
          "pausas",
          "personal",
          "reporte",
          "trazabilidad",
        ]
      : ["operacion", "dashboard", "historial", "pausas", "reporte"];

  if (!allowed.includes(nombre)) return;

  const views = [
    "pedidos",
    "operacion",
    "dashboard",
    "historial",
    "pausas",
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

  // Si es dashboard, inicializar o actualizar gráficos
  if (nombre === "dashboard") {
    setTimeout(() => {
      if (!chartsInitialized) {
        initCharts();
      } else {
        refreshCharts();
      }
    }, 200);
  }
}

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

export function renderPausas() {
  const state = getState();
  const pausas = state.pausas || [];

  // Separar por tipo
  const desayunosActivos = pausas.filter(
    (p) => p.tipo === "desayuno" && !p.regreso,
  );
  const almuerzosActivos = pausas.filter(
    (p) => p.tipo === "almuerzo" && !p.regreso,
  );
  const historial = pausas.filter((p) => p.regreso);

  // Renderizar desayunos activos
  const desayunosDiv = document.getElementById("listaDesayunoActivos");
  if (desayunosDiv) {
    desayunosDiv.innerHTML = desayunosActivos.length
      ? desayunosActivos
          .map(
            (p) => `
        <div class="order">
          <h3>🍳 ${p.nombre}</h3>
          <div class="meta">Salida: ${fmtDateTime(p.salida)}</div>
          <button class="btn-primary" onclick="window.registrarRegresoDesayuno('${p.id}')">Regresar</button>
        </div>
      `,
          )
          .join("")
      : '<div class="empty">Nadie en desayuno</div>';
  }

  // Renderizar almuerzos activos
  const almuerzosDiv = document.getElementById("listaAlmuerzoActivos");
  if (almuerzosDiv) {
    almuerzosDiv.innerHTML = almuerzosActivos.length
      ? almuerzosActivos
          .map(
            (p) => `
        <div class="order">
          <h3>🍽️ ${p.nombre}</h3>
          <div class="meta">Salida: ${fmtDateTime(p.salida)}</div>
          <button class="btn-primary" onclick="window.registrarRegresoAlmuerzo('${p.id}')">Regresar</button>
        </div>
      `,
          )
          .join("")
      : '<div class="empty">Nadie en almuerzo</div>';
  }

  // Renderizar historial
  const historialDiv = document.getElementById("listaPausasHistorial");
  if (historialDiv) {
    historialDiv.innerHTML = historial.length
      ? historial
          .map(
            (p) => `
        <div class="order">
          <h3>${p.tipo === "desayuno" ? "🍳" : "🍽️"} ${p.nombre}</h3>
          <div class="meta">
            ${p.tipo === "desayuno" ? "Desayuno" : "Almuerzo"}: 
            Salida ${fmtDateTime(p.salida)} | Regreso ${fmtDateTime(p.regreso)}
          </div>
        </div>
      `,
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

  if (trazabilidadSearchTerm && trazabilidadSearchTerm.trim() !== "") {
    const searchTerm = trazabilidadSearchTerm.toLowerCase().trim();
    filteredLogs = state.trazabilidad.filter(
      (log) =>
        (log.tipo && log.tipo.toLowerCase().includes(searchTerm)) ||
        (log.detalle && log.detalle.toLowerCase().includes(searchTerm)) ||
        (log.usuario && log.usuario.toLowerCase().includes(searchTerm)) ||
        (log.rol && log.rol.toLowerCase().includes(searchTerm)),
    );
  }

  if (filteredLogs.length === 0) {
    box.innerHTML = `<div class="empty">No hay resultados para "${trazabilidadSearchTerm}"</div>`;
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

// ========== FUNCIONES PARA FILTROS DE PEDIDOS ==========
let filtroBuscar = "";
let filtroEstado = "todos";
let filtroBodeguero = "todos";

function actualizarFiltros() {
  const inputBuscar = document.getElementById("filtroBuscar");
  const selectEstado = document.getElementById("filtroEstado");
  const selectBodeguero = document.getElementById("filtroBodeguero");

  if (inputBuscar) filtroBuscar = inputBuscar.value;
  if (selectEstado) filtroEstado = selectEstado.value;
  if (selectBodeguero) filtroBodeguero = selectBodeguero.value;

  renderPedidos();
}

function limpiarFiltros() {
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

function cargarBodeguerosEnFiltro() {
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

export {
  render,
  mostrarVista,
  initCharts,
  refreshCharts,
  actualizarFiltros,
  limpiarFiltros,
  cargarBodeguerosEnFiltro,
  setTrazabilidadSearch,
};
