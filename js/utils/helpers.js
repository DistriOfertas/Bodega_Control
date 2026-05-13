import { getState } from "../services/state.js";

// Generar ID único
export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// Formatear fecha/hora
export function fmtDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

// Calcular diferencia en minutos
export function diffMinutes(a, b) {
  if (!a || !b) return null;
  return Math.round((new Date(b) - new Date(a)) / 60000);
}

// Segundos desde una fecha
export function secondsSince(iso) {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso)) / 1000);
}

// Formatear duración
export function fmtDuration(secs) {
  const h = String(Math.floor(secs / 3600)).padStart(2, "0");
  const m = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
  const s = String(secs % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

// Obtener etiqueta de estado
export function labelEstado(e) {
  const estados = {
    programado: "Programado",
    reprogramado: "Reprogramado",
    inventario: "En inventario",
    recibo: "En recibo",
    finalizado: "Finalizado",
  };
  return estados[e] || e;
}

// Clase CSS según tiempo
export function timerClass(secs) {
  const mins = secs / 60;
  if (mins >= 60) return "danger";
  if (mins >= 30) return "warn";
  return "";
}

// Verificar misma fecha
export function sameDay(iso, dateStr) {
  if (!iso || !dateStr) return false;
  return new Date(iso).toISOString().slice(0, 10) === dateStr;
}

export function estadoEmpleado(emp) {
  const state = getState();
  const almuerzoActivo = state.almuerzos.find(
    (a) => a.empleadoId === emp.id && !a.regreso,
  );

  if (almuerzoActivo) return { texto: "En almuerzo", clase: "almuerzo" };

  const pedidoRecibo = state.pedidos.find(
    (p) => p.bodegueroId === emp.id && p.reciboInicio && !p.reciboFin,
  );
  if (pedidoRecibo) return { texto: "En recibo", clase: "recibo" };

  const pedidoInventario = state.pedidos.find(
    (p) => p.bodegueroId === emp.id && p.inventarioInicio && !p.inventarioFin,
  );
  if (pedidoInventario) return { texto: "En inventario", clase: "inventario" };

  return { texto: "Disponible", clase: "programado" };
}
