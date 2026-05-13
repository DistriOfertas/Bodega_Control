import { getState, updateState } from "../services/state.js";
import { logAction } from "../services/logger.js";
import { persist } from "../services/storage.js";
import { render, mostrarVista } from "../ui/render.js";
import { applyRoleVisibility, initTabs } from "../ui/tabs.js";
import { cleanupInactivityMonitor } from "../services/inactivity.js"; // ← IMPORTAR

export async function login() {
  const username = document.getElementById("loginUser").value;
  const pin = document.getElementById("loginPin").value;
  const state = getState();

  console.log("=== DEPURACIÓN LOGIN ===");
  console.log("Username ingresado:", username);
  console.log("PIN ingresado:", pin);
  console.log("Todos los usuarios:", state.users);
  console.log("Usuario encontrado:", state.users[username]);

  const user = state.users[username];

  if (!user || user.pin !== pin) {
    alert("Usuario o PIN incorrecto.");
    return;
  }

  //if (!user) {
  //console.log("❌ Usuario no existe");
  //alert("Usuario o PIN incorrecto.");
  //return;
  //}

  const currentUser = {
    username: user.username,
    nombre: user.nombre,
    role: user.role,
  };

  const role = user.role === "admin" ? "Administrador" : "Coordinador";

  updateState("currentUser", currentUser);
  updateState("role", role);

  document.getElementById("loginPin").value = "";
  await logAction("login", "Ingreso al sistema");
  applyRoleVisibility();
  initTabs();
  render();

  const { initInactivityMonitor } = await import("../services/inactivity.js");
  initInactivityMonitor();

  const vistaInicial = user.role === "coordinador" ? "operacion" : "pedidos";
  mostrarVista(vistaInicial);
}

export async function logout() {
  const state = getState();
  if (!state.currentUser) return;

  cleanupInactivityMonitor(); // Limpiar monitor de inactividad al cerrar sesión

  await logAction("logout", "Cierre de sesión");
  updateState("currentUser", null);
  updateState("role", "Sin sesión");
  await persist();
  applyRoleVisibility();
  initTabs();
  render();
  mostrarVista("login");
}
