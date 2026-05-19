import { getState, updateState, canOperate } from "../services/state.js";
import { logAction } from "../services/logger.js";
import { persist } from "../services/storage.js";
import { uid } from "../utils/helpers.js";
import { render } from "../ui/render.js";

// Registrar salida a pausa (desayuno o almuerzo)
export async function registrarSalidaPausa(tipo) {
  if (!canOperate()) return alert("No tienes permiso para esta acción.");

  const empleadoId = document.getElementById("pausaEmpleado").value;
  const tipoPausa = tipo; // "desayuno" o "almuerzo"

  const state = getState();
  const emp = state.personal.find((e) => e.id === empleadoId);
  if (!emp) return alert("Selecciona un colaborador.");

  // Verificar si ya tiene una pausa activa del mismo tipo
  const pausaActiva = state.pausas?.find(
    (p) => p.empleadoId === empleadoId && p.tipo === tipoPausa && !p.regreso,
  );

  if (pausaActiva) {
    return alert(
      `${emp.nombre} ya está en ${tipoPausa === "desayuno" ? "desayuno" : "almuerzo"}`,
    );
  }

  const nuevaPausa = {
    id: uid(),
    empleadoId,
    tipo: tipoPausa,
    nombre: emp.nombre,
    cargo: emp.cargo || "",
    salida: new Date().toISOString(),
    regreso: null,
  };

  const pausas = [nuevaPausa, ...(state.pausas || [])];
  updateState("pausas", pausas);

  document.getElementById("pausaEmpleado").value = "";

  const tipoTexto = tipoPausa === "desayuno" ? "DESAYUNO" : "ALMUERZO";
  await logAction(
    `INICIO DE ${tipoTexto}`,
    `${emp.nombre} salió a ${tipoTexto.toLowerCase()}`,
  );
  await persist();
  render();

  alert(
    `${emp.nombre} registró salida a ${tipoPausa === "desayuno" ? "desayuno" : "almuerzo"}`,
  );
}

// Registrar regreso de pausa
export async function registrarRegresoPausa(id) {
  if (!canOperate()) return alert("No tienes permiso para esta acción.");

  const state = getState();
  const pausa = (state.pausas || []).find((x) => x.id === id);
  if (!pausa || pausa.regreso) return;

  pausa.regreso = new Date().toISOString();
  const pausas = (state.pausas || []).map((p) => (p.id === id ? pausa : p));
  updateState("pausas", pausas);

  const tipoTexto = pausa.tipo === "desayuno" ? "DESAYUNO" : "ALMUERZO";
  await logAction(
    `FIN DE ${tipoTexto}`,
    `${pausa.nombre} regresó de ${pausa.tipo}`,
  );
  await persist();
  render();
}

// Funciones de conveniencia (mantienen compatibilidad)
export async function registrarSalidaDesayuno() {
  return registrarSalidaPausa("desayuno");
}

export async function registrarSalidaAlmuerzo() {
  return registrarSalidaPausa("almuerzo");
}

export async function registrarRegresoDesayuno(id) {
  return registrarRegresoPausa(id);
}

export async function registrarRegresoAlmuerzo(id) {
  return registrarRegresoPausa(id);
}
