import { getState, setState, asegurarState } from "./state.js";
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

    if (firebaseReady && db) {
      const rootRef = ref(db, "bodegaControl");
      await set(rootRef, {
        pedidos: state.pedidos,
        almuerzos: state.almuerzos,
        personal: state.personal,
        trazabilidad: state.trazabilidad,
        users: state.users,
        currentUser: state.currentUser,
        role: state.role,
      });
    }
  } catch (error) {
    console.error("Error saving:", error);
  }
}

export function loadLocal() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw && !firebaseReady) {
    try {
      const parsed = JSON.parse(raw);
      setState(parsed);
      asegurarState();
    } catch (e) {
      console.error("Error loading localStorage:", e);
    }
  }
}
