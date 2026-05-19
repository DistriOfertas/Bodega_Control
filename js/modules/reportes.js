import { getState } from "../services/state.js";
import { sameDay, diffMinutes, fmtDateTime } from "../utils/helpers.js";

// Función para generar el reporte diario
export function generarReporte() {
  const fecha = document.getElementById("fechaReporte").value;
  if (!fecha) {
    alert("Selecciona una fecha");
    return;
  }

  const state = getState();

  // Filtrar pedidos por fecha
  const pedidosDelDia = state.pedidos.filter((p) =>
    sameDay(p.createdAt, fecha),
  );

  const pedidosFinalizadosDelDia = state.pedidos.filter((p) =>
    sameDay(p.reciboFin, fecha),
  );

  // Calcular promedios
  let sumaInventario = 0;
  let sumaRecibo = 0;
  let countInventario = 0;
  let countRecibo = 0;

  pedidosFinalizadosDelDia.forEach((p) => {
    const invMin = diffMinutes(p.inventarioInicio, p.inventarioFin);
    const recMin = diffMinutes(p.reciboInicio, p.reciboFin);

    if (invMin) {
      sumaInventario += invMin;
      countInventario++;
    }
    if (recMin) {
      sumaRecibo += recMin;
      countRecibo++;
    }
  });

  const invPromedio =
    countInventario > 0 ? Math.round(sumaInventario / countInventario) : 0;
  const recPromedio =
    countRecibo > 0 ? Math.round(sumaRecibo / countRecibo) : 0;

  // Actualizar KPIs
  document.getElementById("repPedidosCreados").textContent =
    pedidosDelDia.length;
  document.getElementById("repPedidosFinalizados").textContent =
    pedidosFinalizadosDelDia.length;
  document.getElementById("repInvProm").textContent = invPromedio;
  document.getElementById("repRecProm").textContent = recPromedio;

  // Renderizar lista de pedidos del día
  renderReportePedidos(pedidosDelDia);

  // Renderizar lista de pausas del día
  renderReportePausas(fecha);
}

// Renderizar pedidos del día
function renderReportePedidos(pedidos) {
  const container = document.getElementById("reportePedidos");
  if (!container) return;

  if (pedidos.length === 0) {
    container.innerHTML =
      '<div class="empty">No hay pedidos en esta fecha</div>';
    return;
  }

  container.innerHTML = pedidos
    .map(
      (p) => `
    <div class="order">
      <div class="order-top">
        <div>
          <h3>${p.proveedor}</h3>
          <div class="muted small">Factura: ${p.factura}</div>
        </div>
        <div class="status ${p.estado}">${p.estado}</div>
      </div>
      <div class="meta">
        <span>👷 ${p.bodeguero || "Sin asignar"}</span>
        <span>🕒 ${p.horaProgramada || "Sin hora"}</span>
      </div>
    </div>
  `,
    )
    .join("");
}

// Renderizar pausas del día (desayunos y almuerzos)
function renderReportePausas(fecha) {
  const container = document.getElementById("reportePausas");
  if (!container) return;

  const state = getState();
  const pausasDelDia = (state.pausas || []).filter((a) =>
    sameDay(a.salida, fecha),
  );

  if (pausasDelDia.length === 0) {
    container.innerHTML =
      '<div class="empty">No hay pausas registradas en esta fecha</div>';
    return;
  }

  container.innerHTML = pausasDelDia
    .map(
      (a) => `
    <div class="order">
      <div class="order-top">
        <div>
          <h3>${a.tipo === "desayuno" ? "🍳" : "🍽️"} ${a.nombre}</h3>
          <div class="muted small">${a.cargo || "Sin cargo"} - ${a.tipo === "desayuno" ? "Desayuno" : "Almuerzo"}</div>
        </div>
      </div>
      <div class="meta">
        <span>${a.tipo === "desayuno" ? "🍳 Salida:" : "🍽️ Salida:"} ${fmtDateTime(a.salida)}</span>
        <span>✅ Regreso: ${a.regreso ? fmtDateTime(a.regreso) : "Pendiente"}</span>
      </div>
    </div>
  `,
    )
    .join("");
}

// ========== FUNCIONES DE EXPORTACIÓN A EXCEL ==========

// Exportar reporte del día a Excel
export function exportarReporteDiarioExcel() {
  const fecha = document.getElementById("fechaReporte").value;
  if (!fecha) {
    alert("Selecciona una fecha primero");
    return;
  }

  const state = getState();

  // Filtrar datos por fecha
  const pedidosDelDia = state.pedidos.filter((p) =>
    sameDay(p.createdAt, fecha),
  );
  const pedidosFinalizados = state.pedidos.filter((p) =>
    sameDay(p.reciboFin, fecha),
  );
  const almuerzosDelDia = state.almuerzos.filter((a) =>
    sameDay(a.salida, fecha),
  );

  // Calcular promedios
  let sumaInventario = 0,
    sumaRecibo = 0;
  let countInv = 0,
    countRec = 0;

  pedidosFinalizados.forEach((p) => {
    const inv = diffMinutes(p.inventarioInicio, p.inventarioFin);
    const rec = diffMinutes(p.reciboInicio, p.reciboFin);
    if (inv) {
      sumaInventario += inv;
      countInv++;
    }
    if (rec) {
      sumaRecibo += rec;
      countRec++;
    }
  });

  // Crear datos para Excel
  const resumen = [
    {
      Fecha: fecha,
      "Pedidos Creados": pedidosDelDia.length,
      "Pedidos Finalizados": pedidosFinalizados.length,
      "Inventario Promedio (min)":
        countInv > 0 ? Math.round(sumaInventario / countInv) : 0,
      "Recibo Promedio (min)":
        countRec > 0 ? Math.round(sumaRecibo / countRec) : 0,
    },
  ];

  const pedidosData = pedidosDelDia.map((p) => ({
    Factura: p.factura,
    Proveedor: p.proveedor,
    Estado: p.estado,
    Bodeguero: p.bodeguero || "Sin asignar",
    "Hora Programada": p.horaProgramada,
    "Inicio Inventario": fmtDateTime(p.inventarioInicio),
    "Fin Inventario": fmtDateTime(p.inventarioFin),
    "Inicio Recibo": fmtDateTime(p.reciboInicio),
    "Fin Recibo": fmtDateTime(p.reciboFin),
  }));

  const almuerzosData = almuerzosDelDia.map((a) => ({
    Empleado: a.nombre,
    Cargo: a.cargo || "Sin cargo",
    Salida: fmtDateTime(a.salida),
    Regreso: a.regreso ? fmtDateTime(a.regreso) : "Pendiente",
  }));

  // Crear libro de Excel con múltiples hojas
  const wb = XLSX.utils.book_new();

  const wsResumen = XLSX.utils.json_to_sheet(resumen);
  const wsPedidos = XLSX.utils.json_to_sheet(pedidosData);
  const wsAlmuerzos = XLSX.utils.json_to_sheet(almuerzosData);

  XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");
  XLSX.utils.book_append_sheet(wb, wsPedidos, "Pedidos");
  XLSX.utils.book_append_sheet(wb, wsAlmuerzos, "Almuerzos");

  // Descargar
  XLSX.writeFile(wb, `reporte_diario_${fecha}.xlsx`);
  alert(`✅ Reporte del día ${fecha} exportado a Excel`);
}

// Exportar todos los pedidos
export function exportarTodosPedidosExcel() {
  const state = getState();
  const pedidos = state.pedidos;

  if (!pedidos.length) {
    alert("No hay pedidos para exportar");
    return;
  }

  const data = pedidos.map((p) => ({
    Factura: p.factura,
    Proveedor: p.proveedor,
    Comprador: p.comprador,
    Bodeguero: p.bodeguero || "Sin asignar",
    "Fecha Programada": p.fechaProgramada,
    "Hora Programada": p.horaProgramada,
    Estado: p.estado,
    "Personas Descarga": p.personasDescarga ?? "",
    "Tiempo Inventario (min)":
      diffMinutes(p.inventarioInicio, p.inventarioFin) ?? "",
    "Tiempo Recibo (min)": diffMinutes(p.reciboInicio, p.reciboFin) ?? "",
    "Fecha Creación": fmtDateTime(p.createdAt),
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Todos los Pedidos");

  const fecha = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `todos_los_pedidos_${fecha}.xlsx`);
  alert(`✅ Exportados ${pedidos.length} pedidos`);
}
