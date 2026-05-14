import { getState, asegurarState } from "./state.js";
import { db, firebaseReady, syncingFromCloud } from "../config/firebase.js";
import {
  ref,
  set,
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";
import { STORAGE_KEY } from "../utils/constants.js";

export async function persist() {
  if (syncingFromCloud) return;

  const state = getState();
  asegurarState();

  try {
    // Guardar TODO en localStorage (incluyendo sesión)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

    // Guardar SOLO DATOS en Firebase (NO la sesión)
    if (firebaseReady && db) {
      const rootRef = ref(db, "bodegaControl");
      await set(rootRef, {
        pedidos: state.pedidos,
        almuerzos: state.almuerzos,
        personal: state.personal,
        trazabilidad: state.trazabilidad,
        users: state.users,
        // currentUser y role NO se guardan en Firebase
      });
      console.log("✅ Datos guardados en Firebase");
    }
  } catch (error) {
    console.error("Error saving:", error);
  }
}

export function loadLocal() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      const state = getState();
      state.pedidos = parsed.pedidos || [];
      state.almuerzos = parsed.almuerzos || [];
      state.personal = parsed.personal || [];
      state.trazabilidad = parsed.trazabilidad || [];
      state.users = parsed.users || {};
      state.currentUser = parsed.currentUser || null;
      state.role = parsed.role || "Sin sesión";
      asegurarState();
      console.log("✅ Datos cargados desde localStorage");
    } catch (e) {
      console.error("Error loading localStorage:", e);
    }
  }
}
