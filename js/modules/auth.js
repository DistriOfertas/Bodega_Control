import { getState } from "../services/state.js";
import { logAction } from "../services/logger.js";
import { persist } from "../services/storage.js";
import { render, mostrarVista } from "../ui/render.js";
import { applyRoleVisibility, initTabs } from "../ui/tabs.js";
import { cleanupInactivityMonitor } from "../services/inactivity.js";
import { STORAGE_KEY } from "../utils/constants.js";
import {
  requestNotificationPermission,
  notifyUsuarioLogueado,
} from "../services/notifications.js";

export async function login() {
  const username = document.getElementById("loginUser").value;
  const pin = document.getElementById("loginPin").value;
  const state = getState();

  const user = state.users[username];

  if (!user || user.pin !== pin) {
    alert("Usuario o PIN incorrecto.");
    return;
  }

  const currentUser = {
    username: user.username,
    nombre: user.nombre,
    role: user.role,
  };

  const role = user.role === "admin" ? "Administrador" : "Coordinador";

  // Actualizar estado
  state.currentUser = currentUser;
  state.role = role;

  document.getElementById("loginPin").value = "";
  await logAction("LOGIN", "Ingreso al sistema");

  // Guardar en localStorage y Firebase (solo datos)
  await persist();

  applyRoleVisibility();
  initTabs();
  render();

  const { initInactivityMonitor } = await import("../services/inactivity.js");
  initInactivityMonitor();

  const vistaInicial = user.role === "coordinador" ? "operacion" : "pedidos";
  mostrarVista(vistaInicial);

  await requestNotificationPermission();
  notifyUsuarioLogueado(currentUser);
}

export async function logout() {
  const state = getState();
  if (!state.currentUser) return;

  console.log("🚪 Cerrando sesión para:", state.currentUser.nombre);

  cleanupInactivityMonitor();
  await logAction("LOGOUT", "Cierre de sesión");

  // Limpiar sesión localmente
  state.currentUser = null;
  state.role = "Sin sesión";

  // Guardar estado SIN sesión
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

  // Los datos ya están en Firebase, no los borramos
  // Solo actualizamos la UI
  applyRoleVisibility();
  render();
  mostrarVista("login");
}
