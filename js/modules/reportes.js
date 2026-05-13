import { getState } from "../services/state.js";
import { sameDay } from "../utils/helpers.js";

export function generarReporte() {
  const fecha = document.getElementById("fechaReporte").value;
  if (!fecha) return;

  const state = getState();
  const pedidosCreados = state.pedidos.filter((p) =>
    sameDay(p.createdAt, fecha),
  );

  document.getElementById("repPedidosCreados").textContent =
    pedidosCreados.length;
}
