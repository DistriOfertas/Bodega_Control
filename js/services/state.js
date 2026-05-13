import { DEFAULT_USERS } from "../utils/constants.js";

// Estado inicial
let state = {
  role: "Sin sesión",
  currentUser: null,
  pedidos: [],
  almuerzos: [],
  personal: [],
  trazabilidad: [],
  users: { ...DEFAULT_USERS },
};

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

// Función de seguridad
export function asegurarState() {
  if (!state.pedidos) state.pedidos = [];
  if (!state.almuerzos) state.almuerzos = [];
  if (!state.personal) state.personal = [];
  if (!state.trazabilidad) state.trazabilidad = [];
  if (!state.users) state.users = {};
  if (!state.role) state.role = "Sin sesión";
  if (!state.currentUser) state.currentUser = null;
}

// Verificaciones de permisos
export function isAdmin() {
  const state = getState();
  return !!state.currentUser && state.currentUser.role === "admin";
}

export function canOperate() {
  const state = getState();
  return (
    !!state.currentUser &&
    (state.currentUser.role === "admin" ||
      state.currentUser.role === "coordinador")
  );
}
