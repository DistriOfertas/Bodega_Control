import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  get,
  onValue,
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyD-X-B73dJJ0lmw_zakg-MWL_E6jgWQbv4",
  authDomain: "bodega-control-v3.firebaseapp.com",
  databaseURL: "https://bodega-control-v3-default-rtdb.firebaseio.com",
  projectId: "bodega-control-v3",
  storageBucket: "bodega-control-v3.firebasestorage.app",
  messagingSenderId: "362741672531",
  appId: "1:362741672531:web:b3d6bedf83747f8bf774a6",
  measurementId: "G-HHVTWP173E",
};

const STORAGE_KEY = "bodega_control_v8_local";
let firebaseReady = false;
let db = null;
let syncingFromCloud = false;

let state = {
  role: "Sin sesión",
  currentUser: null,
  pedidos: [],
  almuerzos: [],
  personal: [],
  trazabilidad: [],
  users: {
    elmer: {
      username: "elmer",
      nombre: "Elmer Cagüeñas",
      role: "admin",
      pin: "1111",
    },
    paola: { username: "paola", nombre: "Paola", role: "admin", pin: "2222" },
    edwin: {
      username: "edwin",
      nombre: "Edwin",
      role: "coordinador",
      pin: "3333",
    },
  },
};

// ========== FUNCIONES DE SEGURIDAD ==========
function asegurarState() {
  if (!state.pedidos) state.pedidos = [];
  if (!state.almuerzos) state.almuerzos = [];
  if (!state.personal) state.personal = [];
  if (!state.trazabilidad) state.trazabilidad = [];
  if (!state.users) state.users = {};
  if (!state.role) state.role = "Sin sesión";
  if (!state.currentUser) state.currentUser = null;
}

function hasFirebaseConfig() {
  return (
    FIREBASE_CONFIG.apiKey && !FIREBASE_CONFIG.apiKey.startsWith("PEGA_AQUI")
  );
}

// ========== FIREBASE ==========
async function initFirebase() {
  if (!hasFirebaseConfig()) {
    console.log("Firebase no configurado, usando solo localStorage");
    return;
  }

  try {
    const app = initializeApp(FIREBASE_CONFIG);
    db = getDatabase(app);
    firebaseReady = true;
    const rootRef = ref(db, "bodegaControl");

    onValue(rootRef, (snapshot) => {
      if (syncingFromCloud) return;

      const data = snapshot.val();
      if (!data) return;

      console.log("Firebase sync recibido");
      syncingFromCloud = true;

      // Asegurar que los datos sean arrays
      state.pedidos = Array.isArray(data.pedidos) ? data.pedidos : [];
      state.almuerzos = Array.isArray(data.almuerzos) ? data.almuerzos : [];
      state.personal = Array.isArray(data.personal) ? data.personal : [];
      state.trazabilidad = Array.isArray(data.trazabilidad)
        ? data.trazabilidad
        : [];
      state.users = data.users || state.users;

      if (!state.currentUser) {
        state.currentUser = data.currentUser || null;
        state.role = data.role || "Sin sesión";
      }

      asegurarState();
      syncingFromCloud = false;
      render();
    });

    const snapshot = await get(rootRef);

    if (snapshot.exists()) {
      const data = snapshot.val();

      state.pedidos = Array.isArray(data.pedidos) ? data.pedidos : [];
      state.almuerzos = Array.isArray(data.almuerzos) ? data.almuerzos : [];
      state.personal = Array.isArray(data.personal) ? data.personal : [];
      state.trazabilidad = Array.isArray(data.trazabilidad)
        ? data.trazabilidad
        : [];
      state.users = data.users || state.users;
      state.currentUser = data.currentUser || null;
      state.role = data.role || "Sin sesión";

      asegurarState();
    } else {
      await set(rootRef, {
        pedidos: [],
        almuerzos: [],
        personal: [],
        trazabilidad: [],
        users: state.users,
        currentUser: null,
        role: "Sin sesión",
      });
    }

    render();
  } catch (error) {
    console.error("Error initializing Firebase:", error);
    firebaseReady = false;
  }
}

async function persist() {
  if (syncingFromCloud) return;

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

function loadLocal() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw && !firebaseReady) {
    try {
      const parsed = JSON.parse(raw);
      state = parsed;
      asegurarState();
    } catch (e) {
      console.error("Error loading localStorage:", e);
    }
  }
}

// ========== UTILIDADES ==========
function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function fmtDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function diffMinutes(a, b) {
  if (!a || !b) return null;
  return Math.round((new Date(b) - new Date(a)) / 60000);
}

function secondsSince(iso) {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso)) / 1000);
}

function fmtDuration(secs) {
  const h = String(Math.floor(secs / 3600)).padStart(2, "0");
  const m = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
  const s = String(secs % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function labelEstado(e) {
  const estados = {
    programado: "Programado",
    reprogramado: "Reprogramado",
    inventario: "En inventario",
    recibo: "En recibo",
    finalizado: "Finalizado",
  };
  return estados[e] || e;
}

function timerClass(secs) {
  const mins = secs / 60;
  if (mins >= 60) return "danger";
  if (mins >= 30) return "warn";
  return "";
}

function isAdmin() {
  return !!state.currentUser && state.currentUser.role === "admin";
}

function canOperate() {
  return (
    !!state.currentUser &&
    (state.currentUser.role === "admin" ||
      state.currentUser.role === "coordinador")
  );
}

// ========== LOGS ==========
async function logAction(tipo, detalle, extra = {}) {
  if (!state.currentUser) return;
  state.trazabilidad.unshift({
    id: uid(),
    tipo,
    detalle,
    usuario: state.currentUser.nombre,
    rol: state.currentUser.role,
    fecha: new Date().toISOString(),
    ...extra,
  });
  await persist();
}

// ========== LOGIN/LOGOUT ==========
async function login() {
  const username = document.getElementById("loginUser").value;
  const pin = document.getElementById("loginPin").value;
  const user = state.users[username];
  if (!user || user.pin !== pin) {
    alert("Usuario o PIN incorrecto.");
    return;
  }
  state.currentUser = {
    username: user.username,
    nombre: user.nombre,
    role: user.role,
  };
  state.role = user.role === "admin" ? "Administrador" : "Coordinador";
  document.getElementById("loginPin").value = "";
  await logAction("login", "Ingreso al sistema");
  applyRoleVisibility();
  render();
  mostrarVista(user.role === "coordinador" ? "operacion" : "pedidos");
}

async function logout() {
  if (!state.currentUser) return;
  await logAction("logout", "Cierre de sesión");
  state.currentUser = null;
  state.role = "Sin sesión";
  await persist();
  applyRoleVisibility();
  render();
  mostrarVista("login");
}

// ========== UI ==========
function applyRoleVisibility() {
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

function mostrarVista(nombre) {
  if (!state.currentUser) {
    const loginView = document.getElementById("view-login");
    if (loginView) loginView.classList.remove("hidden");
    return;
  }

  const allowed =
    state.currentUser.role === "admin"
      ? [
          "pedidos",
          "operacion",
          "dashboard",
          "historial",
          "almuerzo",
          "personal",
          "reporte",
          "trazabilidad",
        ]
      : ["operacion", "dashboard", "historial", "almuerzo", "reporte"];

  if (!allowed.includes(nombre)) return;

  const views = [
    "pedidos",
    "operacion",
    "dashboard",
    "historial",
    "almuerzo",
    "personal",
    "reporte",
    "trazabilidad",
  ];
  views.forEach((v) => {
    const el = document.getElementById(`view-${v}`);
    if (el) el.classList.toggle("hidden", v !== nombre);
  });

  document.querySelectorAll(".tab").forEach((t) => {
    t.classList.toggle("active", t.dataset.view === nombre);
  });
}

function llenarSelects() {
  asegurarState();
  const options =
    state.personal && state.personal.length
      ? '<option value="">Selecciona</option>' +
        state.personal
          .map((e) => `<option value="${e.id}">${e.nombre}</option>`)
          .join("")
      : '<option value="">No hay empleados registrados</option>';

  const b = document.getElementById("bodegueroSelect");
  const a = document.getElementById("almuerzoEmpleado");
  if (b) b.innerHTML = options;
  if (a) a.innerHTML = options;
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

// ========== CRUD PERSONAL ==========
async function guardarEmpleado() {
  if (!isAdmin()) return alert("Solo Elmer o Paola pueden gestionar personal.");

  const nombre = document.getElementById("personalNombre").value.trim();
  const cargo = document.getElementById("personalCargo").value.trim();
  if (!nombre) return alert("Escribe el nombre del empleado.");

  const nuevoEmpleado = {
    id: uid(),
    nombre,
    cargo,
    createdAt: new Date().toISOString(),
  };

  state.personal.unshift(nuevoEmpleado);
  document.getElementById("personalNombre").value = "";
  document.getElementById("personalCargo").value = "";

  await logAction("crear_empleado", `Empleado creado: ${nombre}`);
  await persist();
  render();
  alert("Empleado guardado correctamente.");
}

async function eliminarEmpleado(id) {
  if (!isAdmin()) return alert("Solo Elmer o Paola pueden eliminar empleados.");
  const empleado = state.personal.find((e) => e.id === id);
  if (!confirm("¿Eliminar este empleado?")) return;
  state.personal = state.personal.filter((e) => e.id !== id);
  state.pedidos = state.pedidos.map((p) =>
    p.bodegueroId === id ? { ...p, bodegueroId: null, bodeguero: "" } : p,
  );
  await logAction(
    "eliminar_empleado",
    `Empleado eliminado: ${empleado ? empleado.nombre : id}`,
  );
  await persist();
  render();
}

// ========== CRUD PEDIDOS ==========
async function crearPedido() {
  if (!isAdmin())
    return alert("Solo Elmer o Paola pueden crear programación de pedidos.");

  const proveedor = document.getElementById("proveedor").value.trim();
  const factura = document.getElementById("factura").value.trim();
  const fechaProgramada = document.getElementById("fechaProgramada").value;
  const horaProgramada = document.getElementById("horaProgramada").value;
  const comprador = document.getElementById("comprador").value.trim();
  const bodegueroId = document.getElementById("bodegueroSelect").value;
  const observaciones = document.getElementById("observaciones").value.trim();
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

  state.pedidos.unshift(nuevoPedido);
  await logAction("crear_pedido", `Pedido ${factura} creado para ${proveedor}`);
  limpiarFormularioPedido();
  await persist();
  render();
  alert("Pedido guardado correctamente.");
}

async function cargarDemo() {
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
  state.personal = [c1, c2];
  state.pedidos = [
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
  await persist();
  render();
  alert("Datos de demo cargados.");
}

async function borrarTodo() {
  if (!isAdmin()) return alert("Solo Elmer o Paola pueden borrar datos.");
  if (!confirm("¿Seguro que quieres borrar todos los datos?")) return;

  state.pedidos = [];
  state.almuerzos = [];
  state.personal = [];
  state.trazabilidad = [];
  await persist();
  render();
  alert("Todos los datos han sido borrados.");
}

// ========== OPERACIONES ==========
async function reprogramarPedido(id) {
  if (!isAdmin())
    return alert("Solo Elmer o Paola pueden reprogramar pedidos.");
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
  await logAction(
    "reprogramar_pedido",
    `Pedido ${pedido.factura} reprogramado`,
  );
  await persist();
  render();
}

function pedidoBloqueadoParaEdwin(p) {
  return !!(
    state.currentUser &&
    state.currentUser.role === "coordinador" &&
    p.estado === "finalizado"
  );
}

async function editarPersonas(id) {
  if (!canOperate()) return alert("No tienes permiso para esta acción.");
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
  await logAction(
    "editar_descarga",
    `Pedido ${p.factura}: personas descarga ${p.personasDescarga}`,
  );
  await persist();
  render();
}

async function corregirPedido(id, campo) {
  if (!isAdmin())
    return alert("Solo Elmer o Paola pueden corregir datos manualmente.");
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
  await logAction(
    "correccion_manual",
    `Pedido ${p.factura}: ${etiquetas[campo] || campo} cambiado`,
  );
  await persist();
  render();
}

async function asignarBodegueroOperacion(id) {
  if (!canOperate()) return alert("No tienes permiso para esta acción.");
  const p = state.pedidos.find((x) => x.id === id);
  if (!p) return;
  if (!state.personal.length) return alert("No hay personal registrado.");

  const select = document.getElementById(`assign-bodeguero-${id}`);
  if (!select || !select.value) return alert("Selecciona un bodeguero.");

  const emp = state.personal.find((e) => e.id === select.value);
  if (!emp) return alert("Bodeguero no válido.");

  p.bodegueroId = emp.id;
  p.bodeguero = emp.nombre;
  await logAction(
    "asignar_bodeguero",
    `Pedido ${p.factura}: bodeguero asignado ${emp.nombre}`,
  );
  await persist();
  render();
}

async function iniciarInventario(id) {
  if (!canOperate()) return alert("No tienes permiso para esta acción.");
  const p = state.pedidos.find((x) => x.id === id);
  if (!p) return;
  if (pedidoBloqueadoParaEdwin(p))
    return alert("Edwin no puede modificar pedidos finalizados.");
  if (!p.bodegueroId || !p.bodeguero)
    return alert("Primero asigna un bodeguero.");
  if (!p.personasDescarga) {
    const n = prompt("¿Cuántas personas trajo el transportador?", "2");
    if (!n) return;
    p.personasDescarga = Number(n);
  }
  p.inventarioInicio = new Date().toISOString();
  p.estado = "inventario";
  await logAction(
    "inicio_inventario",
    `Pedido ${p.factura}: inició inventario`,
  );
  await persist();
  render();
}

async function finalizarInventario(id) {
  if (!canOperate()) return alert("No tienes permiso para esta acción.");
  const p = state.pedidos.find((x) => x.id === id);
  if (!p || !p.inventarioInicio) return;
  if (pedidoBloqueadoParaEdwin(p))
    return alert("Edwin no puede modificar pedidos finalizados.");

  p.inventarioFin = new Date().toISOString();
  p.estado = "programado";
  await logAction("fin_inventario", `Pedido ${p.factura}: finalizó inventario`);
  await persist();
  render();
}

async function iniciarRecibo(id) {
  if (!canOperate()) return alert("No tienes permiso para esta acción.");
  const p = state.pedidos.find((x) => x.id === id);
  if (!p) return;
  if (pedidoBloqueadoParaEdwin(p))
    return alert("Edwin no puede modificar pedidos finalizados.");
  if (!p.inventarioFin) return alert("Primero debes finalizar inventario.");

  p.reciboInicio = new Date().toISOString();
  p.estado = "recibo";
  await logAction("inicio_recibo", `Pedido ${p.factura}: inició recibo`);
  await persist();
  render();
}

async function finalizarRecibo(id) {
  if (!canOperate()) return alert("No tienes permiso para esta acción.");
  const p = state.pedidos.find((x) => x.id === id);
  if (!p || !p.reciboInicio) return;
  if (pedidoBloqueadoParaEdwin(p))
    return alert("Edwin no puede modificar pedidos finalizados.");

  p.reciboFin = new Date().toISOString();
  p.estado = "finalizado";
  await logAction("fin_recibo", `Pedido ${p.factura}: finalizó recibo`);
  await persist();
  render();
  alert(`Pedido ${p.factura} finalizado.`);
}

// ========== ALMUERZOS ==========
async function registrarSalidaAlmuerzo() {
  if (!canOperate()) return alert("No tienes permiso para esta acción.");
  const empleadoId = document.getElementById("almuerzoEmpleado").value;
  const emp = state.personal.find((e) => e.id === empleadoId);
  if (!emp) return alert("Selecciona un colaborador.");

  state.almuerzos.unshift({
    id: uid(),
    empleadoId,
    nombre: emp.nombre,
    cargo: emp.cargo || "",
    salida: new Date().toISOString(),
    regreso: null,
  });
  document.getElementById("almuerzoEmpleado").value = "";
  await logAction("salida_almuerzo", `${emp.nombre} salió a almuerzo`);
  await persist();
  render();
}

async function registrarRegresoAlmuerzo(id) {
  if (!canOperate()) return alert("No tienes permiso para esta acción.");
  const a = state.almuerzos.find((x) => x.id === id);
  if (!a || a.regreso) return;

  a.regreso = new Date().toISOString();
  await logAction("regreso_almuerzo", `${a.nombre} regresó de almuerzo`);
  await persist();
  render();
}

function estadoEmpleado(emp) {
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

// ========== RENDERIZADO ==========
function renderPedidos() {
  const box = document.getElementById("listaPedidos");
  if (!box) return;

  asegurarState();
  if (!state.pedidos || state.pedidos.length === 0) {
    box.innerHTML = '<div class="empty">Aún no hay pedidos registrados.</div>';
    return;
  }

  box.innerHTML = state.pedidos
    .map((p) => {
      const noReprogramar = p.estado === "finalizado" || !!p.reciboFin;
      return `<div class="order">
      <div class="order-top">
        <div>
          <h3>${p.proveedor || "Sin proveedor"}</h3>
          <div class="muted small">Factura: ${p.factura || "Sin factura"}</div>
        </div>
        <div class="status ${p.estado}">${labelEstado(p.estado)}</div>
      </div>
      <div class="meta">
        <span>📅 ${p.fechaProgramada || "Sin fecha"}</span>
        <span>🕒 ${p.horaProgramada || "Sin hora"}</span>
        <span>👷 ${p.bodeguero || "Sin asignar"}</span>
        <span>🛒 ${p.comprador || "Sin comprador"}</span>
      </div>
      ${p.observaciones ? `<div class="muted small">${p.observaciones}</div>` : ""}
      <div class="btns">
        <button class="btn-warn" onclick="reprogramarPedido('${p.id}')" ${noReprogramar ? "disabled" : ""}>Reprogramar</button>
        <button class="btn-soft" onclick="editarPersonas('${p.id}')">Personas descarga</button>
      </div>
    </div>`;
    })
    .join("");
}

function renderOperacion() {
  const box = document.getElementById("listaOperacion");
  if (!box) return;

  asegurarState();
  const activos = state.pedidos.filter((p) => p.estado !== "finalizado");
  if (!activos.length) {
    box.innerHTML = '<div class="card empty">No hay operaciones activas.</div>';
    return;
  }

  box.innerHTML = activos
    .map((p) => {
      const sinBodeguero = !p.bodegueroId || !p.bodeguero;
      const optionsCurrent =
        state.personal && state.personal.length
          ? '<option value="">Selecciona bodeguero</option>' +
            state.personal
              .map(
                (e) =>
                  `<option value="${e.id}" ${p.bodegueroId === e.id ? "selected" : ""}>${e.nombre}</option>`,
              )
              .join("")
          : '<option value="">No hay empleados</option>';

      return `<div class="card">
      <div class="order-top">
        <div>
          <h3>${p.proveedor}</h3>
          <div class="muted small">Factura ${p.factura}</div>
        </div>
        <div class="status ${p.estado}">${labelEstado(p.estado)}</div>
      </div>
      <div class="meta">
        <span>📅 ${p.fechaProgramada}</span>
        <span>🕒 ${p.horaProgramada}</span>
        <span>👷 ${p.bodeguero || "Sin asignar"}</span>
        <span>🚚 Personas: ${p.personasDescarga ?? "No registrado"}</span>
      </div>
      <div class="order inline-assign">
        <div class="grid grid-2">
          <div><select id="assign-bodeguero-${p.id}">${optionsCurrent}</select></div>
          <div><button class="btn-blue" onclick="asignarBodegueroOperacion('${p.id}')">${sinBodeguero ? "Asignar" : "Actualizar"}</button></div>
        </div>
      </div>
      <div class="btns">
        <button class="btn-violet" onclick="iniciarInventario('${p.id}')" ${p.inventarioInicio ? "disabled" : ""}>Iniciar inventario</button>
        <button class="btn-soft" onclick="finalizarInventario('${p.id}')" ${!p.inventarioInicio || p.inventarioFin ? "disabled" : ""}>Finalizar inventario</button>
        <button class="btn-blue" onclick="iniciarRecibo('${p.id}')" ${!p.inventarioFin || p.reciboInicio ? "disabled" : ""}>Iniciar recibo</button>
        <button class="btn-primary" onclick="finalizarRecibo('${p.id}')" ${!p.reciboInicio || p.reciboFin ? "disabled" : ""}>Finalizar recibo</button>
      </div>
    </div>`;
    })
    .join("");
}

function renderDashboard() {
  asegurarState();
  const pedidos = state.pedidos;
  const activos = pedidos.filter((p) => p.estado !== "finalizado").length;
  const reprog = pedidos.filter(
    (p) => p.reprogramaciones && p.reprogramaciones.length > 0,
  ).length;

  document.getElementById("kpiActivos").textContent = activos;
  document.getElementById("kpiReprog").textContent = reprog;

  const resumen = { disponibles: 0, almuerzo: 0, inventario: 0, recibo: 0 };
  state.personal.forEach((emp) => {
    const est = estadoEmpleado(emp);
    if (est.clase === "almuerzo") resumen.almuerzo++;
    else if (est.clase === "inventario") resumen.inventario++;
    else if (est.clase === "recibo") resumen.recibo++;
    else resumen.disponibles++;
  });

  document.getElementById("kpiDisponibles").textContent = resumen.disponibles;
  document.getElementById("kpiAlmuerzo").textContent = resumen.almuerzo;
  document.getElementById("kpiInventarioPersonal").textContent =
    resumen.inventario;
  document.getElementById("kpiReciboPersonal").textContent = resumen.recibo;

  const alerts = [];
  pedidos.forEach((p) => {
    if (
      p.personasDescarga !== null &&
      p.personasDescarga < 2 &&
      p.estado !== "finalizado"
    ) {
      alerts.push(
        `Pedido ${p.factura} tiene pocas personas (${p.personasDescarga})`,
      );
    }
  });
  document.getElementById("listaAlertas").innerHTML = alerts.length
    ? alerts.map((a) => `<div class="alert">${a}</div>`).join("")
    : '<div class="empty">Sin alertas</div>';
}

function renderHistorial() {
  const box = document.getElementById("listaHistorial");
  if (!box) return;

  asegurarState();
  const fin = state.pedidos.filter((p) => p.estado === "finalizado");
  if (!fin.length) {
    box.innerHTML = '<div class="empty">No hay pedidos finalizados.</div>';
    return;
  }

  box.innerHTML = fin
    .map(
      (p) => `<div class="order">
    <div class="order-top">
      <div>
        <h3>${p.proveedor}</h3>
        <div class="muted small">Factura ${p.factura}</div>
      </div>
      <div class="status finalizado">Finalizado</div>
    </div>
    <div class="meta">
      <span>Inventario: ${diffMinutes(p.inventarioInicio, p.inventarioFin) ?? "—"} min</span>
      <span>Recibo: ${diffMinutes(p.reciboInicio, p.reciboFin) ?? "—"} min</span>
    </div>
  </div>`,
    )
    .join("");
}

function renderAlmuerzos() {
  asegurarState();
  const activos = state.almuerzos.filter((a) => !a.regreso);

  const activosDiv = document.getElementById("listaAlmuerzoActivos");
  if (activosDiv) {
    activosDiv.innerHTML = activos.length
      ? activos
          .map(
            (a) => `<div class="order">
        <h3>${a.nombre}</h3>
        <div class="meta">Salida: ${fmtDateTime(a.salida)}</div>
        <button class="btn-primary" onclick="registrarRegresoAlmuerzo('${a.id}')">Regresar</button>
      </div>`,
          )
          .join("")
      : '<div class="empty">Nadie en almuerzo</div>';
  }

  const historialDiv = document.getElementById("listaAlmuerzoHistorial");
  if (historialDiv) {
    historialDiv.innerHTML = state.almuerzos.length
      ? state.almuerzos
          .map(
            (a) => `<div class="order">
        <h3>${a.nombre}</h3>
        <div class="meta">Salida: ${fmtDateTime(a.salida)} | Regreso: ${fmtDateTime(a.regreso)}</div>
      </div>`,
          )
          .join("")
      : '<div class="empty">Sin historial</div>';
  }
}

function renderPersonal() {
  const box = document.getElementById("listaPersonal");
  if (!box) return;

  asegurarState();
  if (!state.personal || state.personal.length === 0) {
    box.innerHTML =
      '<div class="empty">Aún no hay empleados registrados.</div>';
    return;
  }

  box.innerHTML = state.personal
    .map((emp) => {
      const est = estadoEmpleado(emp);
      const disableDelete = !isAdmin() ? "disabled" : "";
      return `<div class="order">
      <div class="order-top">
        <div>
          <h3>${emp.nombre}</h3>
          <div class="muted small">${emp.cargo || "Sin cargo"}</div>
        </div>
        <div class="status ${est.clase}">${est.texto}</div>
      </div>
      <div class="btns"><button class="btn-danger" onclick="eliminarEmpleado('${emp.id}')" ${disableDelete}>Eliminar</button></div>
    </div>`;
    })
    .join("");
}

function renderTrazabilidad() {
  const box = document.getElementById("listaTrazabilidad");
  if (!box) return;

  asegurarState();
  if (!state.trazabilidad || state.trazabilidad.length === 0) {
    box.innerHTML =
      '<div class="empty">Aún no hay movimientos registrados.</div>';
    return;
  }

  box.innerHTML = state.trazabilidad
    .map(
      (t) => `<div class="order">
    <div class="order-top">
      <div>
        <h3>${t.tipo}</h3>
        <div class="muted small">${t.detalle}</div>
      </div>
      <div class="status">${t.usuario}</div>
    </div>
    <div class="meta">
      <span>Rol: ${t.rol}</span>
      <span>Fecha: ${fmtDateTime(t.fecha)}</span>
    </div>
  </div>`,
    )
    .join("");
}

function generarReporte() {
  const fecha = document.getElementById("fechaReporte").value;
  if (!fecha) return;

  asegurarState();
  const pedidosCreados = state.pedidos.filter((p) =>
    sameDay(p.createdAt, fecha),
  );
  document.getElementById("repPedidosCreados").textContent =
    pedidosCreados.length;
}

function sameDay(iso, dateStr) {
  if (!iso || !dateStr) return false;
  return new Date(iso).toISOString().slice(0, 10) === dateStr;
}

function render() {
  asegurarState();

  const roleBadge = document.getElementById("roleBadge");
  if (roleBadge) roleBadge.textContent = `Rol: ${state.role}`;

  const userNameElement = document.getElementById("userName");
  if (userNameElement) {
    userNameElement.textContent = state.currentUser
      ? state.currentUser.nombre
      : "Sin sesión";
  }

  llenarSelects();
  renderPedidos();
  renderOperacion();
  renderDashboard();
  renderHistorial();
  renderAlmuerzos();
  renderPersonal();
  renderTrazabilidad();

  const fechaInput = document.getElementById("fechaReporte");
  if (fechaInput && !fechaInput.value) {
    fechaInput.value = new Date().toISOString().slice(0, 10);
  }
  if (fechaInput && fechaInput.value) generarReporte();

  const btnPersonal = document.getElementById("btnGuardarPersonal");
  if (btnPersonal) btnPersonal.disabled = !isAdmin();

  const btnPedido = document.getElementById("btnGuardarPedido");
  if (btnPedido) btnPedido.disabled = !isAdmin();

  const btnBorrar = document.getElementById("btnBorrarTodo");
  if (btnBorrar) btnBorrar.disabled = !isAdmin();

  persist();
}

// ========== EVENTOS ==========
function bindEvents() {
  const btnLogin = document.getElementById("btnLogin");
  if (btnLogin) btnLogin.addEventListener("click", login);

  const btnGuardarPedido = document.getElementById("btnGuardarPedido");
  if (btnGuardarPedido) btnGuardarPedido.addEventListener("click", crearPedido);

  const btnDemo = document.getElementById("btnDemo");
  if (btnDemo) btnDemo.addEventListener("click", cargarDemo);

  const btnBorrarTodo = document.getElementById("btnBorrarTodo");
  if (btnBorrarTodo) btnBorrarTodo.addEventListener("click", borrarTodo);

  const btnSalidaAlmuerzo = document.getElementById("btnSalidaAlmuerzo");
  if (btnSalidaAlmuerzo)
    btnSalidaAlmuerzo.addEventListener("click", registrarSalidaAlmuerzo);

  const btnGuardarPersonal = document.getElementById("btnGuardarPersonal");
  if (btnGuardarPersonal)
    btnGuardarPersonal.addEventListener("click", guardarEmpleado);

  const btnGenerarReporte = document.getElementById("btnGenerarReporte");
  if (btnGenerarReporte)
    btnGenerarReporte.addEventListener("click", generarReporte);

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => mostrarVista(tab.dataset.view));
  });

  const roleBadge = document.getElementById("roleBadge");
  if (roleBadge) roleBadge.addEventListener("click", logout);

  const loginPin = document.getElementById("loginPin");
  if (loginPin) {
    loginPin.addEventListener("keydown", (e) => {
      if (e.key === "Enter") login();
    });
  }
}

// ========== EXPORTAR FUNCIONES GLOBALES ==========
window.eliminarEmpleado = eliminarEmpleado;
window.reprogramarPedido = reprogramarPedido;
window.editarPersonas = editarPersonas;
window.corregirPedido = corregirPedido;
window.asignarBodegueroOperacion = asignarBodegueroOperacion;
window.iniciarInventario = iniciarInventario;
window.finalizarInventario = finalizarInventario;
window.iniciarRecibo = iniciarRecibo;
window.finalizarRecibo = finalizarRecibo;
window.registrarRegresoAlmuerzo = registrarRegresoAlmuerzo;

// ========== INICIALIZACIÓN ==========
(async function init() {
  loadLocal();
  bindEvents();
  await initFirebase();
  applyRoleVisibility();
  render();
  if (!state.currentUser) mostrarVista("login");
})();
