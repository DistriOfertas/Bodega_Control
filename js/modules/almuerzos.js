import { getState, updateState, canOperate } from "../services/state.js";
import { logAction } from "../services/logger.js";
import { persist } from "../services/storage.js";
import { uid, fmtDateTime } from "../utils/helpers.js";
import { render } from "../ui/render.js";

export async function registrarSalidaAlmuerzo() {
  if (!canOperate()) return alert("No tienes permiso para esta acción.");

  const empleadoId = document.getElementById("almuerzoEmpleado").value;
  const state = getState();
  const emp = state.personal.find((e) => e.id === empleadoId);
  if (!emp) return alert("Selecciona un colaborador.");

  const nuevoAlmuerzo = {
    id: uid(),
    empleadoId,
    nombre: emp.nombre,
    cargo: emp.cargo || "",
    salida: new Date().toISOString(),
    regreso: null,
  };

  const almuerzos = [nuevoAlmuerzo, ...state.almuerzos];
  updateState("almuerzos", almuerzos);

  document.getElementById("almuerzoEmpleado").value = "";
  await logAction("salida_almuerzo", `${emp.nombre} salió a almuerzo`);
  await persist();
  render();
}

export async function registrarRegresoAlmuerzo(id) {
  if (!canOperate()) return alert("No tienes permiso para esta acción.");

  const state = getState();
  const almuerzo = state.almuerzos.find((x) => x.id === id);
  if (!almuerzo || almuerzo.regreso) return;

  almuerzo.regreso = new Date().toISOString();
  const almuerzos = state.almuerzos.map((a) => (a.id === id ? almuerzo : a));
  updateState("almuerzos", almuerzos);

  await logAction("regreso_almuerzo", `${almuerzo.nombre} regresó de almuerzo`);
  await persist();
  render();
}
