import { getState } from "../services/state.js";
import { mostrarVista } from "./render.js";

export function applyRoleVisibility() {
  const state = getState();
  const logged = !!state.currentUser;
  const tabs = document.getElementById("mainTabs");
  if (tabs) tabs.style.display = logged ? "flex" : "none";

  const loginView = document.getElementById("view-login");
  if (loginView) loginView.classList.toggle("hidden", logged);

  const all = [
    "pedidos",
    "operacion",
    "dashboard",
    "historial",
    "almuerzo",
    "personal",
    "reporte",
    "trazabilidad",
  ];

  if (!logged) {
    all.forEach((v) => {
      const el = document.getElementById(`view-${v}`);
      if (el) el.classList.add("hidden");
    });
    return;
  }

  document.querySelectorAll(".tab").forEach((tab) => {
    const v = tab.dataset.view;
    let visible = true;
    if (state.currentUser.role === "coordinador") {
      visible = [
        "operacion",
        "dashboard",
        "historial",
        "almuerzo",
        "reporte",
      ].includes(v);
    }
    tab.style.display = visible ? "block" : "none";
  });
}

export function initTabs() {
  //console.log("Inicializando tabs..."); // Para depuración
  const tabs = document.querySelectorAll(".tab");
  //console.log("Tabs encontrados:", tabs.length); // Para depuración

  tabs.forEach((tab) => {
    // Remover event listeners anteriores para evitar duplicados
    tab.removeEventListener("click", tab._handler);

    // Crear el handler
    const handler = () => {
      const view = tab.dataset.view;
      //console.log("Tab clickeada:", view); // Para depuración
      if (view) mostrarVista(view);
    };

    // Guardar referencia y agregar evento
    tab._handler = handler;
    tab.addEventListener("click", handler);
  });
}
