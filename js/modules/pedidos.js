import { getState, updateState, isAdmin } from "../services/state.js";
import { logAction } from "../services/logger.js";
import { persist } from "../services/storage.js";
import { uid } from "../utils/helpers.js";
import { render } from "../ui/render.js";
import {
  notifyPedidoCreado,
  notifyPedidoFinalizado,
  notifyPedidoReprogramado,
} from "../services/notifications.js";

export async function crearPedido() {
  if (!isAdmin())
    return alert("Solo Elmer o Paola pueden crear programación de pedidos.");

  const proveedor = document.getElementById("proveedor").value.trim();
  const factura = document.getElementById("factura").value.trim();
  const fechaProgramada = document.getElementById("fechaProgramada").value;
  const horaProgramada = document.getElementById("horaProgramada").value;
  const comprador = document.getElementById("comprador").value.trim();
  const bodegueroId = document.getElementById("bodegueroSelect").value;
  const observaciones = document.getElementById("observaciones").value.trim();

  const state = getState();
  const emp = state.personal.find((e) => e.id === bodegueroId);

  if (!proveedor || !factura || !fechaProgramada || !horaProgramada) {
    return alert("Completa proveedor, factura, fecha y hora programada.");
  }

  const nuevoPedido = {
    id: uid(),
    proveedor,
    factura,
    comprador,
    bodegueroId: emp ? emp.id : null,
    bodeguero: emp ? emp.nombre : "",
    observaciones,
    fechaProgramada,
    horaProgramada,
    estado: "programado",
    personasDescarga: null,
    inventarioInicio: null,
    inventarioFin: null,
    reciboInicio: null,
    reciboFin: null,
    reprogramaciones: [],
    cambiosManuales: [],
    createdAt: new Date().toISOString(),
  };

  const pedidos = [nuevoPedido, ...state.pedidos];
  updateState("pedidos", pedidos);

  await logAction(
    "CREACIÓN DE PEDIDO",
    `Pedido ${factura} creado para ${proveedor}`,
  );
  limpiarFormularioPedido();
  await persist();
  render();

  notifyPedidoCreado(nuevoPedido, state.currentUser?.nombre);

  alert("Pedido guardado correctamente.");
}

export async function reprogramarPedido(id) {
  if (!isAdmin())
    return alert("Solo Elmer o Paola pueden reprogramar pedidos.");

  const state = getState();
  const pedido = state.pedidos.find((p) => p.id === id);
  if (!pedido) return;

  if (pedido.estado === "finalizado" || pedido.reciboFin) {
    return alert("Este pedido ya fue recibido. No se puede reprogramar.");
  }

  const fechaNueva = prompt(
    "Nueva fecha (YYYY-MM-DD):",
    pedido.fechaProgramada,
  );
  if (!fechaNueva) return;

  const horaNueva = prompt("Nueva hora (HH:MM):", pedido.horaProgramada);
  if (!horaNueva) return;

  const motivo = prompt("Motivo de reprogramación:", "Proveedor no llegó");
  if (!motivo) return;

  // ========== CORRECCIÓN: Asegurar que reprogramaciones existe ==========
  if (!pedido.reprogramaciones) {
    pedido.reprogramaciones = [];
  }

  pedido.reprogramaciones.unshift({
    fechaAnterior: pedido.fechaProgramada,
    horaAnterior: pedido.horaProgramada,
    fechaNueva,
    horaNueva,
    motivo,
    at: new Date().toISOString(),
  });

  pedido.fechaProgramada = fechaNueva;
  pedido.horaProgramada = horaNueva;
  pedido.estado = "reprogramado";

  const pedidos = state.pedidos.map((p) => (p.id === id ? pedido : p));
  updateState("pedidos", pedidos);

  await logAction(
    "PEDIDO REPROGRAMADO",
    `Pedido ${pedido.factura} reprogramado`,
  );
  await persist();
  render();

  notifyPedidoReprogramado(pedido, state.currentUser?.nombre);

  alert(`✅ Pedido reprogramado para el ${fechaNueva} a las ${horaNueva}`);
}

export async function editarPersonas(id) {
  const state = getState();
  const p = state.pedidos.find((x) => x.id === id);
  if (!p) return;

  if (pedidoBloqueadoParaEdwin(p))
    return alert("Edwin no puede modificar pedidos finalizados.");

  const n = prompt(
    "Número de personas que trajo el transportador:",
    p.personasDescarga || "2",
  );
  if (!n) return;

  p.personasDescarga = Number(n);
  const pedidos = state.pedidos.map((ped) => (ped.id === id ? p : ped));
  updateState("pedidos", pedidos);

  await logAction(
    "EDICIÓN DE PERSONAL DE DESCARGA",
    `Pedido ${p.factura}: personas descarga ${p.personasDescarga}`,
  );
  await persist();
  render();
}

export async function corregirPedido(id, campo) {
  if (!isAdmin())
    return alert("Solo Elmer o Paola pueden corregir datos manualmente.");

  const state = getState();
  const p = state.pedidos.find((x) => x.id === id);
  if (!p) return;

  if (campo === "bodeguero") {
    alert("El bodeguero se corrige desde Operación con el selector visible.");
    return;
  }

  const etiquetas = {
    inventarioInicio: "Inicio de inventario",
    inventarioFin: "Fin de inventario",
    reciboInicio: "Inicio de recibo",
    reciboFin: "Fin de recibo",
  };

  const valorActual = p[campo] ?? "";
  const nuevoValor = prompt(
    `Nuevo valor para ${etiquetas[campo] || campo}:`,
    valorActual,
  );
  if (nuevoValor === null) return;

  const motivo = prompt(
    "Motivo obligatorio de la corrección manual:",
    "Corrección por error de registro",
  );
  if (!motivo || !motivo.trim())
    return alert("Debes escribir un motivo para la corrección.");

  const valorAnterior = p[campo];
  p[campo] = nuevoValor;
  if (!p.cambiosManuales) p.cambiosManuales = [];
  p.cambiosManuales.unshift({
    campo,
    valorAnterior,
    valorNuevo: p[campo],
    motivo,
    usuario: state.currentUser.nombre,
    fecha: new Date().toISOString(),
  });

  const pedidos = state.pedidos.map((ped) => (ped.id === id ? p : ped));
  updateState("pedidos", pedidos);

  await logAction(
    "CORRECCIÓN MANUAL",
    `Pedido ${p.factura}: ${etiquetas[campo] || campo} cambiado`,
  );
  await persist();
  render();
}

export async function cargarDemo() {
  const state = getState();
  if (state.pedidos.length || state.almuerzos.length || state.personal.length) {
    return alert("Ya tienes datos registrados.");
  }

  const c1 = {
    id: uid(),
    nombre: "Carlos",
    cargo: "Bodega",
    createdAt: new Date().toISOString(),
  };
  const c2 = {
    id: uid(),
    nombre: "Luis",
    cargo: "Bodega",
    createdAt: new Date().toISOString(),
  };

  const personal = [c1, c2];
  const pedidos = [
    {
      id: uid(),
      proveedor: "DIANA",
      factura: "121212",
      comprador: "ELMER",
      bodegueroId: null,
      bodeguero: "",
      observaciones: "",
      fechaProgramada: "2026-04-25",
      horaProgramada: "05:55",
      estado: "programado",
      personasDescarga: null,
      inventarioInicio: null,
      inventarioFin: null,
      reciboInicio: null,
      reciboFin: null,
      reprogramaciones: [],
      cambiosManuales: [],
      createdAt: new Date().toISOString(),
    },
  ];

  updateState("personal", personal);
  updateState("pedidos", pedidos);

  await persist();
  render();
  alert("Datos de demo cargados.");
}

export async function borrarTodo() {
  const state = getState();
  const currentUser = state.currentUser;

  if (!currentUser || currentUser.username !== "mateo") {
    alert("⚠️ Solo Mateo puede borrar todos los datos.");
    return;
  }

  // Confirmación adicional
  if (
    !confirm(
      "⚠️ ¿Seguro que quieres borrar TODOS los datos? Esta acción NO se puede deshacer.",
    )
  )
    return;

  updateState("pedidos", []);
  updateState("almuerzos", []);
  updateState("personal", []);
  updateState("trazabilidad", []);

  await persist();
  render();
  alert("🗑️ Todos los datos han sido borrados.");
}

function pedidoBloqueadoParaEdwin(p) {
  const state = getState();
  return !!(
    state.currentUser &&
    state.currentUser.role === "coordinador" &&
    p.estado === "finalizado"
  );
}

function limpiarFormularioPedido() {
  const ids = [
    "proveedor",
    "factura",
    "fechaProgramada",
    "horaProgramada",
    "comprador",
    "observaciones",
  ];
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  const b = document.getElementById("bodegueroSelect");
  if (b) b.value = "";
}
