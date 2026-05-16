import { initFirebase, migrarUsuariosAFirebase } from "./config/firebase.js";
import { loadLocal } from "./services/storage.js";
import { bindEvents } from "./ui/events.js";
import {
  render,
  mostrarVista,
  initCharts,
  refreshCharts,
  actualizarFiltros,
  limpiarFiltros,
  cargarBodeguerosEnFiltro,
  setTrazabilidadSearch,
} from "./ui/render.js";
import { applyRoleVisibility, initTabs } from "./ui/tabs.js";
import { getState } from "./services/state.js";
import { requestNotificationPermission } from "./services/notifications.js";
import {
  exportarReporteDiarioExcel,
  exportarTodosPedidosExcel,
} from "./modules/reportes.js";

// Importar funciones globales necesarias
import { eliminarEmpleado } from "./modules/personal.js";
import {
  reprogramarPedido,
  editarPersonas,
  corregirPedido,
  borrarTodo,
} from "./modules/pedidos.js";
import {
  asignarBodegueroOperacion,
  iniciarInventario,
  finalizarInventario,
  iniciarRecibo,
  finalizarRecibo,
} from "./modules/operaciones.js";
import { registrarRegresoAlmuerzo } from "./modules/almuerzos.js";

let currentTrazabilidadSearch = "";

// Exponer funciones globales
window.eliminarEmpleado = eliminarEmpleado;
window.reprogramarPedido = reprogramarPedido;
window.editarPersonas = editarPersonas;
window.corregirPedido = corregirPedido;
window.asignarBodegueroOperacion = asignarBodegueroOperacion;
window.iniciarInventario = iniciarInventario;
window.finalizarInventario = finalizarInventario;
window.iniciarRecibo = iniciarRecibo;
window.finalizarRecibo = finalizarRecibo;
window.registrarRegresoAlmuerzo = registrarRegresoAlmuerzo;
window.borrarTodo = borrarTodo;
window.setTrazabilidadSearch = setTrazabilidadSearch;
window.exportarReporteDiarioExcel = exportarReporteDiarioExcel;
window.exportarTodosPedidosExcel = exportarTodosPedidosExcel;
window.actualizarFiltros = actualizarFiltros;
window.limpiarFiltros = limpiarFiltros;

// ========== FUNCIÓN PARA BÚSQUEDA EN TRAZABILIDAD ==========
window.handleTrazabilidadSearch = (event) => {
  const searchTerm = event.target.value;
  console.log("Buscando en trazabilidad:", searchTerm);
  setTrazabilidadSearch(searchTerm);
};

// ========== LISTENER PARA CAMBIO DE VISTA DESDE NOTIFICACIONES ==========
document.addEventListener("changeView", (e) => {
  const { view } = e.detail;
  console.log("📢 Cambiando vista desde notificación:", view);
  mostrarVista(view);
});

// ========== INICIALIZACIÓN ==========
(async function init() {
  loadLocal();

  bindEvents();

  initTabs();

  await initFirebase();

  const migrado = await migrarUsuariosAFirebase();
  if (migrado) {
    console.log("✅ Usuarios verificados en Firebase");
  }

  applyRoleVisibility();

  render();

  const state = getState();

  // Si no hay usuario logueado, mostrar login
  if (!state.currentUser) {
    mostrarVista("login");
  } else {
    // Mostrar vista inicial según rol
    const vistaInicial =
      state.currentUser.role === "coordinador" ? "operacion" : "pedidos";
    mostrarVista(vistaInicial);

    setTimeout(() => {
      initCharts();
    }, 500);

    // Pedir permiso para notificaciones (solo si hay usuario)
    await requestNotificationPermission();
  }

  setTimeout(() => {
    const state = getState();
    if (state.currentUser) {
      initCharts();
    }
  }, 500);
})();
