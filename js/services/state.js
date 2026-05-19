import { DEFAULT_USERS } from "../utils/constants.js";

// Estado inicial
let state = {
  role: "Sin sesión",
  currentUser: null,
  deviceId: null,
  pedidos: [],
  pausas: [],
  personal: [],
  trazabilidad: [],
  users: { ...DEFAULT_USERS },
};

// Función para obtener deviceId
export function getDeviceId() {
  let deviceId = localStorage.getItem("device_id");
  if (!deviceId) {
    deviceId =
      "device_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
    localStorage.setItem("device_id", deviceId);
  }
  return deviceId;
}

// Getters
export function getState() {
  return state;
}

// Setters con validación
export function setState(newState) {
  state = { ...state, ...newState };
  asegurarState();
}

// Actualizar parte del estado
export function updateState(key, value) {
  state[key] = value;
  asegurarState();
}

// Función de seguridad - CORREGIDA
export function asegurarState() {
  // Verificar que state existe
  if (!state) {
    state = {
      role: "Sin sesión",
      currentUser: null,
      deviceId: null,
      pedidos: [],
      almuerzos: [],
      personal: [],
      trazabilidad: [],
      users: { ...DEFAULT_USERS },
    };
  }

  // Asegurar cada propiedad
  if (!state.pedidos) state.pedidos = [];
  if (!state.almuerzos) state.almuerzos = [];
  if (!state.personal) state.personal = [];
  if (!state.trazabilidad) state.trazabilidad = [];
  if (!state.users) state.users = { ...DEFAULT_USERS };
  if (!state.role) state.role = "Sin sesión";
  if (!state.currentUser) state.currentUser = null;
  if (!state.deviceId) state.deviceId = null;
}

// Verificaciones de permisos
export function isAdmin() {
  return !!(state.currentUser && state.currentUser.role === "admin");
}

export function canOperate() {
  return !!(
    state.currentUser &&
    (state.currentUser.role === "admin" ||
      state.currentUser.role === "coordinador")
  );
}

// Inicializar asegurarState al cargar
asegurarState();
