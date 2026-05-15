import { getState } from "./state.js";

let charts = {};

// Inicializar gráficos
export function initCharts() {
  // Gráfico de pedidos por estado
  const ctxPedidos = document.getElementById("chartPedidosEstado");
  if (ctxPedidos) {
    charts.pedidosEstado = new Chart(ctxPedidos, {
      type: "doughnut",
      data: {
        labels: [
          "Programado",
          "Reprogramado",
          "Inventario",
          "Recibo",
          "Finalizado",
        ],
        datasets: [
          {
            data: [0, 0, 0, 0, 0],
            backgroundColor: [
              "#ffc107",
              "#fd7e14",
              "#17a2b8",
              "#007bff",
              "#28a745",
            ],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { position: "bottom" },
        },
      },
    });
  }

  // Gráfico de personal por estado
  const ctxPersonal = document.getElementById("chartPersonalEstado");
  if (ctxPersonal) {
    charts.personalEstado = new Chart(ctxPersonal, {
      type: "pie",
      data: {
        labels: ["Disponible", "Almuerzo", "Inventario", "Recibo"],
        datasets: [
          {
            data: [0, 0, 0, 0],
            backgroundColor: ["#28a745", "#ffc107", "#17a2b8", "#007bff"],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { position: "bottom" },
        },
      },
    });
  }

  // Gráfico de tendencias (últimos 7 días)
  const ctxTendencias = document.getElementById("chartTendencias");
  if (ctxTendencias) {
    charts.tendencias = new Chart(ctxTendencias, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "Pedidos creados",
            data: [],
            borderColor: "#007bff",
            backgroundColor: "rgba(0, 123, 255, 0.1)",
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { position: "top" },
        },
      },
    });
  }
}

// Actualizar todos los gráficos
export function updateCharts() {
  const state = getState();
  const pedidos = state.pedidos || [];
  const personal = state.personal || [];

  // 1. Actualizar gráfico de pedidos por estado
  if (charts.pedidosEstado) {
    const estados = [
      "programado",
      "reprogramado",
      "inventario",
      "recibo",
      "finalizado",
    ];
    const conteos = estados.map(
      (e) => pedidos.filter((p) => p.estado === e).length,
    );
    charts.pedidosEstado.data.datasets[0].data = conteos;
    charts.pedidosEstado.update();
  }

  // 2. Actualizar gráfico de personal por estado
  if (charts.personalEstado) {
    let disponibles = 0,
      almuerzo = 0,
      inventario = 0,
      recibo = 0;

    personal.forEach((emp) => {
      // Verificar si está en almuerzo
      const enAlmuerzo = state.almuerzos.some(
        (a) => a.empleadoId === emp.id && !a.regreso,
      );
      // Verificar si está en inventario
      const enInventario = pedidos.some(
        (p) =>
          p.bodegueroId === emp.id && p.inventarioInicio && !p.inventarioFin,
      );
      // Verificar si está en recibo
      const enRecibo = pedidos.some(
        (p) => p.bodegueroId === emp.id && p.reciboInicio && !p.reciboFin,
      );

      if (enAlmuerzo) almuerzo++;
      else if (enInventario) inventario++;
      else if (enRecibo) recibo++;
      else disponibles++;
    });

    charts.personalEstado.data.datasets[0].data = [
      disponibles,
      almuerzo,
      inventario,
      recibo,
    ];
    charts.personalEstado.update();
  }

  // 3. Actualizar gráfico de tendencias (últimos 7 días)
  if (charts.tendencias) {
    const ultimos7Dias = [];
    const labels = [];
    const datos = [];

    for (let i = 6; i >= 0; i--) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - i);
      const fechaStr = fecha.toISOString().slice(0, 10);
      labels.push(fechaStr.slice(5, 10)); // Formato MM-DD

      const pedidosDia = pedidos.filter(
        (p) => p.createdAt && p.createdAt.slice(0, 10) === fechaStr,
      );
      datos.push(pedidosDia.length);
    }

    charts.tendencias.data.labels = labels;
    charts.tendencias.data.datasets[0].data = datos;
    charts.tendencias.update();
  }
}

// Destruir gráficos (útil para recargar)
export function destroyCharts() {
  Object.values(charts).forEach((chart) => {
    if (chart) chart.destroy();
  });
  charts = {};
}
