import { getState, updateState, isAdmin } from "../services/state.js";
import { logAction } from "../services/logger.js";
import { persist } from "../services/storage.js";
import { uid } from "../utils/helpers.js";
import { render } from "../ui/render.js";

export async function guardarEmpleado() {
  if (!isAdmin()) return alert("Solo Elmer o Paola pueden gestionar personal.");

  const nombre = document.getElementById("personalNombre").value.trim();
  const cargo = document.getElementById("personalCargo").value.trim();
  if (!nombre) return alert("Escribe el nombre del empleado.");

  const nuevoEmpleado = {
    id: uid(),
    nombre,
    cargo,
    createdAt: new Date().toISOString(),
  };

  const state = getState();
  const personal = [nuevoEmpleado, ...state.personal];
  updateState("personal", personal);

  document.getElementById("personalNombre").value = "";
  document.getElementById("personalCargo").value = "";

  await logAction("crear_empleado", `Empleado creado: ${nombre}`);
  await persist();
  render();
  alert("Empleado guardado correctamente.");
}

export async function eliminarEmpleado(id) {
  if (!isAdmin()) return alert("Solo Elmer o Paola pueden eliminar empleados.");

  const state = getState();
  const empleado = state.personal.find((e) => e.id === id);
  if (!confirm("¿Eliminar este empleado?")) return;

  const personal = state.personal.filter((e) => e.id !== id);
  updateState("personal", personal);

  // Actualizar pedidos que tenían este bodeguero
  const pedidos = state.pedidos.map((p) =>
    p.bodegueroId === id ? { ...p, bodegueroId: null, bodeguero: "" } : p,
  );
  updateState("pedidos", pedidos);

  await logAction(
    "eliminar_empleado",
    `Empleado eliminado: ${empleado ? empleado.nombre : id}`,
  );
  await persist();
  render();
}
