import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  get,
  onValue,
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";
import { DEFAULT_USERS, STORAGE_KEY } from "../utils/constants.js"; // ← IMPORTAR CONSTANTES
import { getState, setState, asegurarState } from "../services/state.js"; // ← IMPORTAR STATE
import { render } from "../ui/render.js"; // ← IMPORTAR RENDER

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

    // Primero, obtener datos actuales
    const snapshot = await get(rootRef);
    const state = getState(); // ← OBTENER STATE ACTUAL

    if (snapshot.exists()) {
      const data = snapshot.val();

      // IMPORTANTE: Combinar usuarios existentes con los defaults
      const existingUsers = data.users || {};
      const mergedUsers = { ...DEFAULT_USERS, ...existingUsers };

      //console.log("Usuarios en Firebase:", Object.keys(existingUsers));
      //console.log("Usuarios combinados:", Object.keys(mergedUsers));

      // Si falta mateo, mostramos advertencia
      if (!existingUsers.mateo) {
        console.warn(
          "⚠️ Mateo no está en Firebase, se agregará automáticamente",
        );
      }

      state.pedidos = Array.isArray(data.pedidos) ? data.pedidos : [];
      state.almuerzos = Array.isArray(data.almuerzos) ? data.almuerzos : [];
      state.personal = Array.isArray(data.personal) ? data.personal : [];
      state.trazabilidad = Array.isArray(data.trazabilidad)
        ? data.trazabilidad
        : [];
      state.users = mergedUsers;
      state.currentUser = data.currentUser || null;
      state.role = data.role || "Sin sesión";

      // Actualizar Firebase con los usuarios combinados
      await set(rootRef, {
        pedidos: state.pedidos,
        almuerzos: state.almuerzos,
        personal: state.personal,
        trazabilidad: state.trazabilidad,
        users: mergedUsers,
        currentUser: state.currentUser,
        role: state.role,
      });

      console.log(
        "✅ Firebase actualizado con usuarios:",
        Object.keys(mergedUsers),
      );
    } else {
      // Si no hay datos, crear con todos los usuarios por defecto
      await set(rootRef, {
        pedidos: [],
        almuerzos: [],
        personal: [],
        trazabilidad: [],
        users: DEFAULT_USERS,
        currentUser: null,
        role: "Sin sesión",
      });
      state.users = { ...DEFAULT_USERS };
      console.log(
        "✅ Firebase inicializado con todos los usuarios por defecto",
      );
    }

    asegurarState();

    // Guardar en localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

    // Configurar listener para cambios en tiempo real
    onValue(rootRef, (snapshot) => {
      if (syncingFromCloud) return;

      const data = snapshot.val();
      if (!data) return;

      //console.log("Firebase sync recibido");
      syncingFromCloud = true;

      const currentState = getState();

      // Al recibir actualizaciones, combinar usuarios
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

      if (!currentState.currentUser) {
        currentState.currentUser = data.currentUser || null;
        currentState.role = data.role || "Sin sesión";
      }

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

    if (snapshot.exists()) {
      const data = snapshot.val();

      // Combinar usuarios existentes con DEFAULT_USERS
      const existingUsers = data.users || {};
      const mergedUsers = { ...DEFAULT_USERS, ...existingUsers };

      //console.log("🔄 Migrando usuarios a Firebase:", Object.keys(mergedUsers));

      // Verificar específicamente a mateo
      if (!existingUsers.mateo) {
        console.log("➕ Agregando usuario mateo a Firebase");
      }

      // Actualizar Firebase con todos los usuarios
      await set(rootRef, {
        pedidos: data.pedidos || [],
        almuerzos: data.almuerzos || [],
        personal: data.personal || [],
        trazabilidad: data.trazabilidad || [],
        users: mergedUsers,
        currentUser: data.currentUser || null,
        role: data.role || "Sin sesión",
      });

      // Actualizar estado local
      const state = getState();
      state.users = mergedUsers;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

      console.log("✅ Usuarios migrados exitosamente a Firebase");
      return true;
    } else {
      // Si no hay datos, crear desde cero
      await set(rootRef, {
        pedidos: [],
        almuerzos: [],
        personal: [],
        trazabilidad: [],
        users: DEFAULT_USERS,
        currentUser: null,
        role: "Sin sesión",
      });
      console.log("✅ Firebase inicializado con todos los usuarios");
      return true;
    }
  } catch (error) {
    console.error("❌ Error migrando usuarios:", error);
    return false;
  }
}
