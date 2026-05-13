import { getState, updateState, canOperate } from "../services/state.js";
import { logAction } from "../services/logger.js";
import { persist } from "../services/storage.js";
import { render } from "../ui/render.js";

export async function asignarBodegueroOperacion(id) {
  if (!canOperate()) return alert("No tienes permiso para esta acción.");

  const state = getState();
  const p = state.pedidos.find((x) => x.id === id);
  if (!p) return;

  if (!state.personal.length) return alert("No hay personal registrado.");

  const select = document.getElementById(`assign-bodeguero-${id}`);
  if (!select || !select.value) return alert("Selecciona un bodeguero.");

  const emp = state.personal.find((e) => e.id === select.value);
  if (!emp) return alert("Bodeguero no válido.");

  p.bodegueroId = emp.id;
  p.bodeguero = emp.nombre;

  const pedidos = state.pedidos.map((ped) => (ped.id === id ? p : ped));
  updateState("pedidos", pedidos);

  await logAction(
    "asignar_bodeguero",
    `Pedido ${p.factura}: bodeguero asignado ${emp.nombre}`,
  );
  await persist();
  render();
}

export async function iniciarInventario(id) {
  if (!canOperate()) return alert("No tienes permiso para esta acción.");

  const state = getState();
  const p = state.pedidos.find((x) => x.id === id);
  if (!p) return;

  if (pedidoBloqueadoParaEdwin(p))
    return alert("Edwin no puede modificar pedidos finalizados.");

  if (!p.bodegueroId || !p.bodeguero)
    return alert("Primero asigna un bodeguero.");

  if (!p.personasDescarga) {
    const n = prompt("¿Cuántas personas trajo el transportador?", "2");
    if (!n) return;
    p.personasDescarga = Number(n);
  }

  p.inventarioInicio = new Date().toISOString();
  p.estado = "inventario";

  const pedidos = state.pedidos.map((ped) => (ped.id === id ? p : ped));
  updateState("pedidos", pedidos);

  await logAction(
    "inicio_inventario",
    `Pedido ${p.factura}: inició inventario`,
  );
  await persist();
  render();
}

export async function finalizarInventario(id) {
  if (!canOperate()) return alert("No tienes permiso para esta acción.");

  const state = getState();
  const p = state.pedidos.find((x) => x.id === id);
  if (!p || !p.inventarioInicio) return;

  if (pedidoBloqueadoParaEdwin(p))
    return alert("Edwin no puede modificar pedidos finalizados.");

  p.inventarioFin = new Date().toISOString();
  p.estado = "programado";

  const pedidos = state.pedidos.map((ped) => (ped.id === id ? p : ped));
  updateState("pedidos", pedidos);

  await logAction("fin_inventario", `Pedido ${p.factura}: finalizó inventario`);
  await persist();
  render();
}

export async function iniciarRecibo(id) {
  if (!canOperate()) return alert("No tienes permiso para esta acción.");

  const state = getState();
  const p = state.pedidos.find((x) => x.id === id);
  if (!p) return;

  if (pedidoBloqueadoParaEdwin(p))
    return alert("Edwin no puede modificar pedidos finalizados.");

  if (!p.inventarioFin) return alert("Primero debes finalizar inventario.");

  p.reciboInicio = new Date().toISOString();
  p.estado = "recibo";

  const pedidos = state.pedidos.map((ped) => (ped.id === id ? p : ped));
  updateState("pedidos", pedidos);

  await logAction("inicio_recibo", `Pedido ${p.factura}: inició recibo`);
  await persist();
  render();
}

export async function finalizarRecibo(id) {
  if (!canOperate()) return alert("No tienes permiso para esta acción.");

  const state = getState();
  const p = state.pedidos.find((x) => x.id === id);
  if (!p || !p.reciboInicio) return;

  if (pedidoBloqueadoParaEdwin(p))
    return alert("Edwin no puede modificar pedidos finalizados.");

  p.reciboFin = new Date().toISOString();
  p.estado = "finalizado";

  const pedidos = state.pedidos.map((ped) => (ped.id === id ? p : ped));
  updateState("pedidos", pedidos);

  await logAction("fin_recibo", `Pedido ${p.factura}: finalizó recibo`);
  await persist();
  render();
  alert(`Pedido ${p.factura} finalizado.`);
}

function pedidoBloqueadoParaEdwin(p) {
  const state = getState();
  return !!(
    state.currentUser &&
    state.currentUser.role === "coordinador" &&
    p.estado === "finalizado"
  );
}
