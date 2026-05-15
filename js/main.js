import { initFirebase, migrarUsuariosAFirebase } from "./config/firebase.js";
import { loadLocal } from "./services/storage.js";
import { bindEvents } from "./ui/events.js";
import { render, mostrarVista } from "./ui/render.js";
import { applyRoleVisibility, initTabs } from "./ui/tabs.js";
import { getState } from "./services/state.js";
import { requestNotificationPermission } from "./services/notifications.js";
import {
  setTrazabilidadSearch,
  actualizarFiltros,
  limpiarFiltros,
} from "./ui/render.js";
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

// ========== LISTENER PARA CAMBIO DE VISTA DESDE NOTIFICACIONES ==========
document.addEventListener("changeView", (e) => {
  const { view } = e.detail;
  console.log("📢 Cambiando vista desde notificación:", view);
  mostrarVista(view);
});

// ========== INICIALIZACIÓN ==========
(async function init() {
  // Cargar datos locales primero
  loadLocal();

  // Bindear eventos de UI
  bindEvents();

  // Inicializar tabs
  initTabs();

  // Inicializar Firebase
  await initFirebase();

  // Migrar usuarios a Firebase (asegura que todos los usuarios existan)
  const migrado = await migrarUsuariosAFirebase();
  if (migrado) {
    console.log("✅ Usuarios verificados en Firebase");
  }

  // Aplicar visibilidad según rol
  applyRoleVisibility();

  // Renderizar UI
  render();

  // Obtener estado actual
  const state = getState();

  // Si no hay usuario logueado, mostrar login
  if (!state.currentUser) {
    mostrarVista("login");
  } else {
    // Mostrar vista inicial según rol
    const vistaInicial =
      state.currentUser.role === "coordinador" ? "operacion" : "pedidos";
    mostrarVista(vistaInicial);

    // Pedir permiso para notificaciones (solo si hay usuario)
    await requestNotificationPermission();
  }
})();

// Función para manejar la búsqueda en trazabilidad
window.handleTrazabilidadSearch = (event) => {
  const searchTerm = event.target.value;
  setTrazabilidadSearch(searchTerm);
};
