import { logout } from "../modules/auth.js";

let inactivityTimer = null;
const INACTIVITY_LIMIT = 20 * 1000; // 20 segundos (ajusta según necesites)

export function initInactivityMonitor() {
  // Resetear timer cuando hay actividad
  const resetTimer = () => {
    resetInactivityTimer();
  };

  // Eventos que indican actividad del usuario
  const events = [
    "mousedown",
    "mousemove",
    "keypress",
    "scroll",
    "touchstart",
    "click",
    "input",
  ];

  events.forEach((event) => {
    document.addEventListener(event, resetTimer);
  });

  // Iniciar el timer
  resetInactivityTimer();

  console.log(
    "✅ Monitor de inactividad iniciado (20 segundos) - Modo directo",
  );
}

function resetInactivityTimer() {
  // Limpiar timer existente
  if (inactivityTimer) clearTimeout(inactivityTimer);

  // Iniciar nuevo timer
  inactivityTimer = setTimeout(closeSession, INACTIVITY_LIMIT);
}

async function closeSession() {
  // Limpiar timer antes de cerrar
  if (inactivityTimer) clearTimeout(inactivityTimer);

  // Mostrar mensaje al usuario
  alert("⏰ Sesión cerrada por inactividad.");

  // Cerrar sesión
  await logout();

  // Recargar la página para mostrar login
  window.location.reload();
}

// Limpiar eventos al cerrar sesión
export function cleanupInactivityMonitor() {
  if (inactivityTimer) clearTimeout(inactivityTimer);

  const events = [
    "mousedown",
    "mousemove",
    "keypress",
    "scroll",
    "touchstart",
    "click",
    "input",
  ];
  events.forEach((event) => {
    document.removeEventListener(event, resetInactivityTimer);
  });
}
