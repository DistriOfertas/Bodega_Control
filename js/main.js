import { initFirebase, migrarUsuariosAFirebase } from "./config/firebase.js";
import { loadLocal } from "./services/storage.js";
import { bindEvents } from "./ui/events.js";
import { render, mostrarVista } from "./ui/render.js";
import { applyRoleVisibility, initTabs } from "./ui/tabs.js";
import { getState } from "./services/state.js";

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
import { initInactivityMonitor } from "./services/inactivity.js";

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

// Inicialización
(async function init() {
  loadLocal();
  bindEvents();
  initTabs();
  await initFirebase();

  // Migrar usuarios a Firebase (asegura que mateo exista)
  const migrado = await migrarUsuariosAFirebase();
  if (migrado) {
    console.log("✅ Usuarios verificados en Firebase");
  }

  applyRoleVisibility();
  render();
  const state = getState();
  if (!state.currentUser) {
    mostrarVista("login");
  } else {
    const vistaInicial =
      state.currentUser.role === "coordinador" ? "operacion" : "pedidos";
    mostrarVista(vistaInicial);

    // Iniciar monitor de inactividad para cerrar sesión automáticamente
    initInactivityMonitor();
  }
})();
