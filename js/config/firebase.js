import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  get,
  onValue,
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";
import { DEFAULT_USERS, STORAGE_KEY } from "../utils/constants.js";
import { getState, asegurarState } from "../services/state.js";
import { render } from "../ui/render.js";

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyD-X-B73dJJ0lmw_zakg-MWL_E6jgWQbv4",
  authDomain: "bodega-control-v3.firebaseapp.com",
  databaseURL: "https://bodega-control-v3-default-rtdb.firebaseio.com",
  projectId: "bodega-control-v3",
  storageBucket: "bodega-control-v3.firebasestorage.app",
  messagingSenderId: "362741672531",
  appId: "1:362741672531:web:b3d6bedf83747f8bf774a6",
  measurementId: "G-HHVTWP173E",
};

export let db = null;
export let firebaseReady = false;
export let syncingFromCloud = false;

export function hasFirebaseConfig() {
  return (
    FIREBASE_CONFIG.apiKey && !FIREBASE_CONFIG.apiKey.startsWith("PEGA_AQUI")
  );
}

export async function initFirebase() {
  if (!hasFirebaseConfig()) {
    console.log("Firebase no configurado, usando solo localStorage");
    return;
  }

  try {
    const app = initializeApp(FIREBASE_CONFIG);
    db = getDatabase(app);
    firebaseReady = true;
    const rootRef = ref(db, "bodegaControl");

    const snapshot = await get(rootRef);
    const state = getState();

    if (snapshot.exists()) {
      const data = snapshot.val();

      // Combinar usuarios
      const existingUsers = data.users || {};
      const mergedUsers = { ...DEFAULT_USERS, ...existingUsers };

      // Cargar datos desde Firebase
      state.pedidos = Array.isArray(data.pedidos) ? data.pedidos : [];
      state.almuerzos = Array.isArray(data.almuerzos) ? data.almuerzos : [];
      state.personal = Array.isArray(data.personal) ? data.personal : [];
      state.trazabilidad = Array.isArray(data.trazabilidad)
        ? data.trazabilidad
        : [];
      state.users = mergedUsers;

      // Restaurar sesión desde localStorage (NO desde Firebase)
      const localData = localStorage.getItem(STORAGE_KEY);
      if (localData) {
        try {
          const parsed = JSON.parse(localData);
          state.currentUser = parsed.currentUser || null;
          state.role = parsed.role || "Sin sesión";
          console.log("✅ Sesión restaurada desde localStorage");
        } catch (e) {
          state.currentUser = null;
          state.role = "Sin sesión";
        }
      } else {
        state.currentUser = null;
        state.role = "Sin sesión";
      }

      console.log(
        `📦 Datos cargados: ${state.pedidos.length} pedidos, ${state.personal.length} empleados`,
      );
    } else {
      // Crear estructura inicial
      await set(rootRef, {
        pedidos: [],
        almuerzos: [],
        personal: [],
        trazabilidad: [],
        users: DEFAULT_USERS,
      });
      state.users = { ...DEFAULT_USERS };
      state.currentUser = null;
      state.role = "Sin sesión";
      console.log("✅ Firebase inicializado");
    }

    asegurarState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

    // Escuchar cambios en Firebase y sincronizar SOLO datos
    onValue(rootRef, (snapshot) => {
      if (syncingFromCloud) return;

      const data = snapshot.val();
      if (!data) return;

      console.log("🔄 Sincronizando datos desde Firebase");
      syncingFromCloud = true;
      const currentState = getState();

      // Sincronizar SOLO datos, NO la sesión
      const remoteUsers = data.users || {};
      const mergedRemoteUsers = { ...DEFAULT_USERS, ...remoteUsers };

      currentState.pedidos = Array.isArray(data.pedidos) ? data.pedidos : [];
      currentState.almuerzos = Array.isArray(data.almuerzos)
        ? data.almuerzos
        : [];
      currentState.personal = Array.isArray(data.personal) ? data.personal : [];
      currentState.trazabilidad = Array.isArray(data.trazabilidad)
        ? data.trazabilidad
        : [];
      currentState.users = mergedRemoteUsers;

      // Conservar la sesión actual (NO se sobrescribe)
      console.log(
        `📦 Datos sincronizados: ${currentState.pedidos.length} pedidos`,
      );

      // Guardar en localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentState));

      asegurarState();
      syncingFromCloud = false;
      render();
    });

    render();
  } catch (error) {
    console.error("Error initializing Firebase:", error);
    firebaseReady = false;
  }
}

export async function migrarUsuariosAFirebase() {
  if (!firebaseReady || !db) {
    console.log("Firebase no está listo para migración");
    return false;
  }

  try {
    const rootRef = ref(db, "bodegaControl");
    const snapshot = await get(rootRef);
    const state = getState();

    if (snapshot.exists()) {
      const data = snapshot.val();
      const existingUsers = data.users || {};
      const mergedUsers = { ...DEFAULT_USERS, ...existingUsers };

      await set(rootRef, {
        pedidos: state.pedidos || [],
        almuerzos: state.almuerzos || [],
        personal: state.personal || [],
        trazabilidad: state.trazabilidad || [],
        users: mergedUsers,
      });

      console.log("✅ Datos migrados a Firebase");
      return true;
    } else {
      await set(rootRef, {
        pedidos: state.pedidos || [],
        almuerzos: state.almuerzos || [],
        personal: state.personal || [],
        trazabilidad: state.trazabilidad || [],
        users: DEFAULT_USERS,
      });
      console.log("✅ Firebase inicializado");
      return true;
    }
  } catch (error) {
    console.error("❌ Error:", error);
    return false;
  }
}
