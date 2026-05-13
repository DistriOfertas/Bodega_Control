import { getState, updateState } from "./state.js";
import { uid } from "../utils/helpers.js";
import { persist } from "./storage.js";

export async function logAction(tipo, detalle, extra = {}) {
  const state = getState();
  if (!state.currentUser) return;

  const newLog = {
    id: uid(),
    tipo,
    detalle,
    usuario: state.currentUser.nombre,
    rol: state.currentUser.role,
    fecha: new Date().toISOString(),
    ...extra,
  };

  const trazabilidad = [newLog, ...state.trazabilidad];
  updateState("trazabilidad", trazabilidad);
  await persist();
}
