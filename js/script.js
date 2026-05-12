import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import { getDatabase, ref, set, get, onValue } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js';

const FIREBASE_CONFIG = {
  apiKey: 'PEGA_AQUI_TU_API_KEY',
  authDomain: 'PEGA_AQUI_TU_AUTH_DOMAIN',
  databaseURL: 'PEGA_AQUI_TU_DATABASE_URL',
  projectId: 'PEGA_AQUI_TU_PROJECT_ID',
  storageBucket: 'PEGA_AQUI_TU_STORAGE_BUCKET',
  messagingSenderId: 'PEGA_AQUI_TU_MESSAGING_SENDER_ID',
  appId: 'PEGA_AQUI_TU_APP_ID'
};

const STORAGE_KEY = 'bodega_control_v8_local';
let firebaseReady = false;
let db = null;
let syncingFromCloud = false;

let state = {
  role: 'Sin sesión',
  currentUser: null,
  pedidos: [],
  almuerzos: [],
  personal: [],
  trazabilidad: [],
  users: {
    elmer: { username: 'elmer', nombre: 'Elmer Cagüeñas', role: 'admin', pin: '1111' },
    paola: { username: 'paola', nombre: 'Paola', role: 'admin', pin: '2222' },
    edwin: { username: 'edwin', nombre: 'Edwin', role: 'coordinador', pin: '3333' }
  }
};

function hasFirebaseConfig() {
  return FIREBASE_CONFIG.apiKey && !FIREBASE_CONFIG.apiKey.startsWith('PEGA_AQUI');
}

async function initFirebase() {
  if (!hasFirebaseConfig()) return;
  const app = initializeApp(FIREBASE_CONFIG);
  db = getDatabase(app);
  firebaseReady = true;
  const rootRef = ref(db, 'bodegaControl');
  onValue(rootRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) return;
    syncingFromCloud = true;
    state = data;
    render();
    syncingFromCloud = false;
  });
  const first = await get(rootRef);
  if (first.exists()) {
    state = first.val();
  } else {
    await set(rootRef, state);
  }
}

async function persist() {
  if (syncingFromCloud) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (firebaseReady && db) {
    await set(ref(db, 'bodegaControl'), state);
  }
}

function loadLocal() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) state = JSON.parse(raw);
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function fmtDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
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
  const h = String(Math.floor(secs / 3600)).padStart(2, '0');
  const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function labelEstado(e) {
  const estados = {
    programado: 'Programado',
    reprogramado: 'Reprogramado',
    inventario: 'En inventario',
    recibo: 'En recibo',
    finalizado: 'Finalizado'
  };
  return estados[e] || e;
}

function timerClass(secs) {
  const mins = secs / 60;
  if (mins >= 60) return 'danger';
  if (mins >= 30) return 'warn';
  return '';
}

function isAdmin() {
  return !!state.currentUser && state.currentUser.role === 'admin';
}

function canOperate() {
  return !!state.currentUser && (state.currentUser.role === 'admin' || state.currentUser.role === 'coordinador');
}

async function logAction(tipo, detalle, extra = {}) {
  if (!state.currentUser) return;
  state.trazabilidad.unshift({
    id: uid(),
    tipo,
    detalle,
    usuario: state.currentUser.nombre,
    rol: state.currentUser.role,
    fecha: new Date().toISOString(),
    ...extra
  });
  await persist();
}

async function login() {
  const username = document.getElementById('loginUser').value;
  const pin = document.getElementById('loginPin').value;
  const user = state.users[username];
  if (!user || user.pin !== pin) {
    alert('Usuario o PIN incorrecto.');
    return;
  }
  state.currentUser = {
    username: user.username,
    nombre: user.nombre,
    role: user.role
  };
  state.role = user.role === 'admin' ? 'Administrador' : 'Coordinador';
  document.getElementById('loginPin').value = '';
  await logAction('login', 'Ingreso al sistema');
  applyRoleVisibility();
  render();
  mostrarVista(user.role === 'coordinador' ? 'operacion' : 'pedidos');
}

async function logout() {
  if (!state.currentUser) return;
  await logAction('logout', 'Cierre de sesión');
  state.currentUser = null;
  state.role = 'Sin sesión';
  await persist();
  applyRoleVisibility();
  render();
  mostrarVista('login');
}

const userNameElement = document.getElementById('userName');
  if (userNameElement) {
    userNameElement.textContent = 'Sin sesión';
  }

function applyRoleVisibility() {
  const logged = !!state.currentUser;
  document.getElementById('mainTabs').style.display = logged ? 'grid' : 'none';
  document.getElementById('view-login').classList.toggle('hidden', logged);
  const all = ['pedidos', 'operacion', 'dashboard', 'historial', 'almuerzo', 'personal', 'reporte', 'trazabilidad'];
  if (!logged) {
    all.forEach(v => document.getElementById(`view-${v}`).classList.add('hidden'));
    return;
  }
  document.querySelectorAll('.tab').forEach(tab => {
    const v = tab.dataset.view;
    let visible = true;
    if (state.currentUser.role === 'coordinador') {
      visible = ['operacion', 'dashboard', 'historial', 'almuerzo', 'reporte'].includes(v);
    }
    tab.style.display = visible ? 'block' : 'none';
  });
}

function mostrarVista(nombre) {
  if (!state.currentUser) {
    document.getElementById('view-login').classList.remove('hidden');
    return;
  }
  const allowed = state.currentUser.role === 'admin'
    ? ['pedidos', 'operacion', 'dashboard', 'historial', 'almuerzo', 'personal', 'reporte', 'trazabilidad']
    : ['operacion', 'dashboard', 'historial', 'almuerzo', 'reporte'];
  if (!allowed.includes(nombre)) return;
  const views = ['pedidos', 'operacion', 'dashboard', 'historial', 'almuerzo', 'personal', 'reporte', 'trazabilidad'];
  views.forEach(v => {
    const el = document.getElementById(`view-${v}`);
    if (el) el.classList.toggle('hidden', v !== nombre);
  });
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.view === nombre));
}

function llenarSelects() {
  const options = state.personal.length
    ? '<option value="">Selecciona</option>' + state.personal.map(e => `<option value="${e.id}">${e.nombre}</option>`).join('')
    : '<option value="">No hay empleados registrados</option>';
  const b = document.getElementById('bodegueroSelect');
  const a = document.getElementById('almuerzoEmpleado');
  if (b) b.innerHTML = options;
  if (a) a.innerHTML = options;
}

function limpiarFormularioPedido() {
  const ids = ['proveedor', 'factura', 'fechaProgramada', 'horaProgramada', 'comprador', 'observaciones'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const b = document.getElementById('bodegueroSelect');
  if (b) b.value = '';
}

async function guardarEmpleado() {
  if (!isAdmin()) return alert('Solo Elmer o Paola pueden gestionar personal.');
  const nombre = document.getElementById('personalNombre').value.trim();
  const cargo = document.getElementById('personalCargo').value.trim();
  if (!nombre) return alert('Escribe el nombre del empleado.');
  state.personal.unshift({
    id: uid(),
    nombre,
    cargo,
    createdAt: new Date().toISOString()
  });
  document.getElementById('personalNombre').value = '';
  document.getElementById('personalCargo').value = '';
  await logAction('crear_empleado', `Empleado creado: ${nombre}`);
  render();
}

async function eliminarEmpleado(id) {
  if (!isAdmin()) return alert('Solo Elmer o Paola pueden eliminar empleados.');
  const empleado = state.personal.find(e => e.id === id);
  if (!confirm('¿Eliminar este empleado?')) return;
  state.personal = state.personal.filter(e => e.id !== id);
  state.pedidos = state.pedidos.map(p => p.bodegueroId === id ? { ...p, bodegueroId: null, bodeguero: '' } : p);
  await logAction('eliminar_empleado', `Empleado eliminado: ${empleado ? empleado.nombre : id}`);
  render();
}

async function crearPedido() {
  if (!isAdmin()) return alert('Solo Elmer o Paola pueden crear programación de pedidos.');
  const proveedor = document.getElementById('proveedor').value.trim();
  const factura = document.getElementById('factura').value.trim();
  const fechaProgramada = document.getElementById('fechaProgramada').value;
  const horaProgramada = document.getElementById('horaProgramada').value;
  const comprador = document.getElementById('comprador').value.trim();
  const bodegueroId = document.getElementById('bodegueroSelect').value;
  const observaciones = document.getElementById('observaciones').value.trim();
  const emp = state.personal.find(e => e.id === bodegueroId);
  if (!proveedor || !factura || !fechaProgramada || !horaProgramada) {
    return alert('Completa proveedor, factura, fecha y hora programada.');
  }
  state.pedidos.unshift({
    id: uid(),
    proveedor,
    factura,
    comprador,
    bodegueroId: emp ? emp.id : null,
    bodeguero: emp ? emp.nombre : '',
    observaciones,
    fechaProgramada,
    horaProgramada,
    estado: 'programado',
    personasDescarga: null,
    inventarioInicio: null,
    inventarioFin: null,
    reciboInicio: null,
    reciboFin: null,
    reprogramaciones: [],
    cambiosManuales: [],
    createdAt: new Date().toISOString()
  });
  await logAction('crear_pedido', `Pedido ${factura} creado para ${proveedor}`);
  limpiarFormularioPedido();
  render();
  alert('Pedido guardado correctamente.');
}

async function cargarDemo() {
  if (state.pedidos.length || state.almuerzos.length || state.personal.length) {
    return alert('Ya tienes datos registrados.');
  }
  const c1 = { id: uid(), nombre: 'Carlos', cargo: 'Bodega', createdAt: new Date().toISOString() };
  const c2 = { id: uid(), nombre: 'Luis', cargo: 'Bodega', createdAt: new Date().toISOString() };
  state.personal = [c1, c2];
  state.pedidos = [{
    id: uid(),
    proveedor: 'DIANA',
    factura: '121212',
    comprador: 'ELMER',
    bodegueroId: null,
    bodeguero: '',
    observaciones: '',
    fechaProgramada: '2026-04-25',
    horaProgramada: '05:55',
    estado: 'programado',
    personasDescarga: null,
    inventarioInicio: null,
    inventarioFin: null,
    reciboInicio: null,
    reciboFin: null,
    reprogramaciones: [],
    cambiosManuales: [],
    createdAt: new Date().toISOString()
  }];
  await persist();
  render();
}

async function borrarTodo() {
  if (!isAdmin()) return alert('Solo Elmer o Paola pueden borrar datos.');
  if (!confirm('¿Seguro que quieres borrar todos los datos?')) return;
  state.pedidos = [];
  state.almuerzos = [];
  state.personal = [];
  state.trazabilidad = [];
  await persist();
  render();
}

async function reprogramarPedido(id) {
  if (!isAdmin()) return alert('Solo Elmer o Paola pueden reprogramar pedidos.');
  const pedido = state.pedidos.find(p => p.id === id);
  if (!pedido) return;
  if (pedido.estado === 'finalizado' || pedido.reciboFin) {
    return alert('Este pedido ya fue recibido. No se puede reprogramar.');
  }
  const fechaNueva = prompt('Nueva fecha (YYYY-MM-DD):', pedido.fechaProgramada);
  if (!fechaNueva) return;
  const horaNueva = prompt('Nueva hora (HH:MM):', pedido.horaProgramada);
  if (!horaNueva) return;
  const motivo = prompt('Motivo de reprogramación:', 'Proveedor no llegó');
  if (!motivo) return;
  pedido.reprogramaciones.unshift({
    fechaAnterior: pedido.fechaProgramada,
    horaAnterior: pedido.horaProgramada,
    fechaNueva,
    horaNueva,
    motivo,
    at: new Date().toISOString()
  });
  pedido.fechaProgramada = fechaNueva;
  pedido.horaProgramada = horaNueva;
  pedido.estado = 'reprogramado';
  await logAction('reprogramar_pedido', `Pedido ${pedido.factura} reprogramado para ${fechaNueva} ${horaNueva}`);
  render();
}

function pedidoBloqueadoParaEdwin(p) {
  return !!(state.currentUser && state.currentUser.role === 'coordinador' && p.estado === 'finalizado');
}

async function editarPersonas(id) {
  if (!canOperate()) return alert('No tienes permiso para esta acción.');
  const p = state.pedidos.find(x => x.id === id);
  if (!p) return;
  if (pedidoBloqueadoParaEdwin(p)) return alert('Edwin no puede modificar pedidos finalizados.');
  const n = prompt('Número de personas que trajo el transportador:', p.personasDescarga || '2');
  if (!n) return;
  p.personasDescarga = Number(n);
  await logAction('editar_descarga', `Pedido ${p.factura}: personas descarga ${p.personasDescarga}`);
  render();
}

async function corregirPedido(id, campo) {
  if (!isAdmin()) return alert('Solo Elmer o Paola pueden corregir datos manualmente.');
  const p = state.pedidos.find(x => x.id === id);
  if (!p) return;
  if (campo === 'bodeguero') {
    alert('El bodeguero se corrige desde Operación con el selector visible.');
    return;
  }
  const etiquetas = {
    inventarioInicio: 'Inicio de inventario',
    inventarioFin: 'Fin de inventario',
    reciboInicio: 'Inicio de recibo',
    reciboFin: 'Fin de recibo'
  };
  const valorActual = p[campo] ?? '';
  const nuevoValor = prompt(`Nuevo valor para ${etiquetas[campo] || campo}:`, valorActual);
  if (nuevoValor === null) return;
  const motivo = prompt('Motivo obligatorio de la corrección manual:', 'Corrección por error de registro');
  if (!motivo || !motivo.trim()) return alert('Debes escribir un motivo para la corrección.');
  const valorAnterior = p[campo];
  p[campo] = nuevoValor;
  if (!p.cambiosManuales) p.cambiosManuales = [];
  p.cambiosManuales.unshift({
    campo,
    valorAnterior,
    valorNuevo: p[campo],
    motivo,
    usuario: state.currentUser.nombre,
    fecha: new Date().toISOString()
  });
  await logAction('correccion_manual', `Pedido ${p.factura}: ${etiquetas[campo] || campo} cambiado. Motivo: ${motivo}`, {
    valorAnterior,
    valorNuevo: p[campo]
  });
  render();
}

async function asignarBodegueroOperacion(id) {
  if (!canOperate()) return alert('No tienes permiso para esta acción.');
  const p = state.pedidos.find(x => x.id === id);
  if (!p) return;
  if (!state.personal.length) return alert('No hay personal registrado. Primero debes crear empleados en Personal.');
  const select = document.getElementById(`assign-bodeguero-${id}`);
  if (!select || !select.value) return alert('Selecciona un bodeguero.');
  const emp = state.personal.find(e => e.id === select.value);
  if (!emp) return alert('Bodeguero no válido.');
  const anterior = p.bodeguero || 'Sin asignar';
  if (isAdmin() && anterior !== emp.nombre) {
    const motivo = prompt('Motivo obligatorio para cambiar el bodeguero:', 'Ajuste operativo');
    if (!motivo || !motivo.trim()) return alert('Debes escribir un motivo para cambiar el bodeguero.');
    if (!p.cambiosManuales) p.cambiosManuales = [];
    p.cambiosManuales.unshift({
      campo: 'bodeguero',
      valorAnterior: anterior,
      valorNuevo: emp.nombre,
      motivo,
      usuario: state.currentUser.nombre,
      fecha: new Date().toISOString()
    });
    await logAction('correccion_manual', `Pedido ${p.factura}: bodeguero cambiado de ${anterior} a ${emp.nombre}. Motivo: ${motivo}`, {
      valorAnterior: anterior,
      valorNuevo: emp.nombre
    });
  } else {
    await logAction('asignar_bodeguero', `Pedido ${p.factura}: bodeguero asignado ${emp.nombre}`);
  }
  p.bodegueroId = emp.id;
  p.bodeguero = emp.nombre;
  render();
}

async function iniciarInventario(id) {
  if (!canOperate()) return alert('No tienes permiso para esta acción.');
  const p = state.pedidos.find(x => x.id === id);
  if (!p) return;
  if (pedidoBloqueadoParaEdwin(p)) return alert('Edwin no puede modificar pedidos finalizados.');
  if (!p.bodegueroId || !p.bodeguero) return alert('Primero asigna un bodeguero en esta misma tarjeta del pedido.');
  if (!p.personasDescarga) {
    const n = prompt('¿Cuántas personas trajo el transportador?', '2');
    if (!n) return;
    p.personasDescarga = Number(n);
  }
  p.inventarioInicio = new Date().toISOString();
  p.estado = 'inventario';
  await logAction('inicio_inventario', `Pedido ${p.factura}: inició inventario`);
  render();
}

async function finalizarInventario(id) {
  if (!canOperate()) return alert('No tienes permiso para esta acción.');
  const p = state.pedidos.find(x => x.id === id);
  if (!p || !p.inventarioInicio) return;
  if (pedidoBloqueadoParaEdwin(p)) return alert('Edwin no puede modificar pedidos finalizados.');
  p.inventarioFin = new Date().toISOString();
  p.estado = 'programado';
  await logAction('fin_inventario', `Pedido ${p.factura}: finalizó inventario`);
  render();
}

async function iniciarRecibo(id) {
  if (!canOperate()) return alert('No tienes permiso para esta acción.');
  const p = state.pedidos.find(x => x.id === id);
  if (!p) return;
  if (pedidoBloqueadoParaEdwin(p)) return alert('Edwin no puede modificar pedidos finalizados.');
  if (!p.inventarioFin) return alert('Primero debes finalizar inventario.');
  p.reciboInicio = new Date().toISOString();
  p.estado = 'recibo';
  await logAction('inicio_recibo', `Pedido ${p.factura}: inició recibo`);
  render();
}

async function finalizarRecibo(id) {
  if (!canOperate()) return alert('No tienes permiso para esta acción.');
  const p = state.pedidos.find(x => x.id === id);
  if (!p || !p.reciboInicio) return;
  if (pedidoBloqueadoParaEdwin(p)) return alert('Edwin no puede modificar pedidos finalizados.');
  p.reciboFin = new Date().toISOString();
  p.estado = 'finalizado';
  await logAction('fin_recibo', `Pedido ${p.factura}: finalizó recibo`);
  render();
  alert(`Pedido ${p.factura} finalizado.`);
}

async function registrarSalidaAlmuerzo() {
  if (!canOperate()) return alert('No tienes permiso para esta acción.');
  const empleadoId = document.getElementById('almuerzoEmpleado').value;
  const emp = state.personal.find(e => e.id === empleadoId);
  if (!emp) return alert('Selecciona un colaborador.');
  state.almuerzos.unshift({
    id: uid(),
    empleadoId,
    nombre: emp.nombre,
    cargo: emp.cargo || '',
    salida: new Date().toISOString(),
    regreso: null
  });
  document.getElementById('almuerzoEmpleado').value = '';
  await logAction('salida_almuerzo', `${emp.nombre} salió a almuerzo`);
  render();
}

async function registrarRegresoAlmuerzo(id) {
  if (!canOperate()) return alert('No tienes permiso para esta acción.');
  const a = state.almuerzos.find(x => x.id === id);
  if (!a || a.regreso) return;
  a.regreso = new Date().toISOString();
  await logAction('regreso_almuerzo', `${a.nombre} regresó de almuerzo`);
  render();
}

function estadoEmpleado(emp) {
  const almuerzoActivo = state.almuerzos.find(a => a.empleadoId === emp.id && !a.regreso);
  if (almuerzoActivo) return { texto: 'En almuerzo', clase: 'almuerzo' };
  const pedidoRecibo = state.pedidos.find(p => p.bodegueroId === emp.id && p.reciboInicio && !p.reciboFin);
  if (pedidoRecibo) return { texto: 'En recibo', clase: 'recibo' };
  const pedidoInventario = state.pedidos.find(p => p.bodegueroId === emp.id && p.inventarioInicio && !p.inventarioFin);
  if (pedidoInventario) return { texto: 'En inventario', clase: 'inventario' };
  return { texto: 'Disponible', clase: 'programado' };
}

function renderPedidos() {
  const box = document.getElementById('listaPedidos');
  if (!state.pedidos.length) {
    box.innerHTML = '<div class="empty">Aún no hay pedidos registrados.</div>';
    return;
  }
  box.innerHTML = state.pedidos.map(p => {
    const noReprogramar = p.estado === 'finalizado' || !!p.reciboFin;
    return `<div class="order">
      <div class="order-top">
        <div>
          <h3>${p.proveedor}</h3>
          <div class="muted small">Factura: ${p.factura}</div>
        </div>
        <div class="status ${p.estado}">${labelEstado(p.estado)}</div>
      </div>
      <div class="meta">
        <span>📅 ${p.fechaProgramada}</span>
        <span>🕒 ${p.horaProgramada}</span>
        <span>👷 ${p.bodeguero || 'Sin asignar'}</span>
        <span>🛒 ${p.comprador || 'Sin comprador'}</span>
      </div>
      ${p.observaciones ? `<div class="muted small" style="margin-bottom:10px">${p.observaciones}</div>` : ''}
      ${p.reprogramaciones.length ? `<div class="muted small" style="margin-bottom:10px">Última reprogramación: ${p.reprogramaciones[0].fechaAnterior} ${p.reprogramaciones[0].horaAnterior} → ${p.reprogramaciones[0].fechaNueva} ${p.reprogramaciones[0].horaNueva}</div>` : ''}
      <div class="btns">
        <button class="btn-warn" type="button" onclick="reprogramarPedido('${p.id}')" ${noReprogramar ? 'disabled' : ''}>Reprogramar</button>
        <button class="btn-soft" type="button" onclick="editarPersonas('${p.id}')">Personas descarga</button>
      </div>
    </div>`;
  }).join('');
}

function renderOperacion() {
  const box = document.getElementById('listaOperacion');
  const activos = state.pedidos.filter(p => p.estado !== 'finalizado');
  if (!activos.length) {
    box.innerHTML = '<div class="card empty">No hay operaciones activas.</div>';
    return;
  }
  box.innerHTML = activos.map(p => {
    const invSecs = p.inventarioInicio && !p.inventarioFin ? secondsSince(p.inventarioInicio) : 0;
    const recSecs = p.reciboInicio && !p.reciboFin ? secondsSince(p.reciboInicio) : 0;
    const invDone = diffMinutes(p.inventarioInicio, p.inventarioFin);
    const recDone = diffMinutes(p.reciboInicio, p.reciboFin);
    const sinBodeguero = !p.bodegueroId || !p.bodeguero;
    const optionsCurrent = state.personal.length
      ? '<option value="">Selecciona bodeguero</option>' + state.personal.map(e => `<option value="${e.id}" ${p.bodegueroId === e.id ? 'selected' : ''}>${e.nombre}</option>`).join('')
      : '<option value="">No hay empleados registrados</option>';
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
        <span>👷 ${p.bodeguero || 'Sin asignar'}</span>
        <span>🚚 Personas descarga: ${p.personasDescarga ?? 'No registrado'}</span>
      </div>
      <div class="order inline-assign">
        <div class="muted small" style="margin-bottom:8px">${sinBodeguero ? 'Este pedido no tiene bodeguero asignado. Asígnalo aquí antes de iniciar inventario.' : 'Si necesitas ajustar el bodeguero, hazlo aquí con el selector.'}</div>
        <div class="grid grid-2">
          <div><select id="assign-bodeguero-${p.id}">${optionsCurrent}</select></div>
          <div class="btns"><button class="btn-blue" type="button" onclick="asignarBodegueroOperacion('${p.id}')">${sinBodeguero ? 'Asignar bodeguero' : 'Actualizar bodeguero'}</button></div>
        </div>
      </div>
      ${p.inventarioInicio && !p.inventarioFin ? `<div class="timer ${timerClass(invSecs)}">Inventario en curso: ${fmtDuration(invSecs)}</div>` : ''}
      ${p.reciboInicio && !p.reciboFin ? `<div class="timer ${timerClass(recSecs)}">Recibo en curso: ${fmtDuration(recSecs)}</div>` : ''}
      ${invDone !== null ? `<div class="muted small" style="margin-bottom:8px">Inventario terminado en ${invDone} min</div>` : ''}
      ${recDone !== null ? `<div class="muted small" style="margin-bottom:8px">Recibo terminado en ${recDone} min</div>` : ''}
      <div class="btns">
        <button class="btn-violet" type="button" onclick="iniciarInventario('${p.id}')" ${p.inventarioInicio ? 'disabled' : ''}>Iniciar inventario</button>
        <button class="btn-soft" type="button" onclick="finalizarInventario('${p.id}')" ${!p.inventarioInicio || p.inventarioFin ? 'disabled' : ''}>Finalizar inventario</button>
        <button class="btn-blue" type="button" onclick="iniciarRecibo('${p.id}')" ${!p.inventarioFin || p.reciboInicio ? 'disabled' : ''}>Iniciar recibo</button>
        <button class="btn-primary" type="button" onclick="finalizarRecibo('${p.id}')" ${!p.reciboInicio || p.reciboFin ? 'disabled' : ''}>Finalizar recibo</button>
        <button class="btn-warn" type="button" onclick="editarPersonas('${p.id}')">Editar personas</button>
        ${isAdmin() ? `<button class="btn-blue" type="button" onclick="corregirPedido('${p.id}','inventarioInicio')">Corregir inicio inv.</button>
        <button class="btn-blue" type="button" onclick="corregirPedido('${p.id}','inventarioFin')">Corregir fin inv.</button>
        <button class="btn-blue" type="button" onclick="corregirPedido('${p.id}','reciboInicio')">Corregir inicio recibo</button>
        <button class="btn-blue" type="button" onclick="corregirPedido('${p.id}','reciboFin')">Corregir fin recibo</button>` : ''}
      </div>
    </div>`;
  }).join('');
}

function renderDashboard() {
  const pedidos = state.pedidos;
  const activos = pedidos.filter(p => p.estado !== 'finalizado').length;
  const reprog = pedidos.filter(p => p.reprogramaciones.length > 0).length;
  const invs = pedidos.map(p => diffMinutes(p.inventarioInicio, p.inventarioFin)).filter(x => x !== null);
  const recs = pedidos.map(p => diffMinutes(p.reciboInicio, p.reciboFin)).filter(x => x !== null);
  document.getElementById('kpiActivos').textContent = activos;
  document.getElementById('kpiReprog').textContent = reprog;
  document.getElementById('kpiInv').textContent = invs.length ? Math.round(invs.reduce((a, b) => a + b, 0) / invs.length) : 0;
  document.getElementById('kpiRec').textContent = recs.length ? Math.round(recs.reduce((a, b) => a + b, 0) / recs.length) : 0;
  const resumen = { disponibles: 0, almuerzo: 0, inventario: 0, recibo: 0 };
  state.personal.forEach(emp => {
    const est = estadoEmpleado(emp);
    if (est.clase === 'almuerzo') resumen.almuerzo++;
    else if (est.clase === 'inventario') resumen.inventario++;
    else if (est.clase === 'recibo') resumen.recibo++;
    else resumen.disponibles++;
  });
  document.getElementById('kpiDisponibles').textContent = resumen.disponibles;
  document.getElementById('kpiAlmuerzo').textContent = resumen.almuerzo;
  document.getElementById('kpiInventarioPersonal').textContent = resumen.inventario;
  document.getElementById('kpiReciboPersonal').textContent = resumen.recibo;
  const alerts = [];
  pedidos.forEach(p => {
    if (p.personasDescarga !== null && p.personasDescarga < 2 && p.estado !== 'finalizado') {
      alerts.push(`El pedido ${p.factura} de ${p.proveedor} tiene pocas personas de descarga (${p.personasDescarga}).`);
    }
    if (p.inventarioInicio && !p.inventarioFin && secondsSince(p.inventarioInicio) / 60 > 45) {
      alerts.push(`El inventario del pedido ${p.factura} supera 45 minutos.`);
    }
    if (p.reciboInicio && !p.reciboFin && secondsSince(p.reciboInicio) / 60 > 45) {
      alerts.push(`El recibo del pedido ${p.factura} supera 45 minutos.`);
    }
  });
  document.getElementById('listaAlertas').innerHTML = alerts.length
    ? alerts.map(a => `<div class="alert">${a}</div>`).join('')
    : '<div class="empty">Sin alertas por ahora.</div>';
}

function renderHistorial() {
  const box = document.getElementById('listaHistorial');
  const fin = state.pedidos.filter(p => p.estado === 'finalizado');
  if (!fin.length) {
    box.innerHTML = '<div class="empty">No hay pedidos finalizados todavía.</div>';
    return;
  }
  box.innerHTML = fin.map(p => `<div class="order">
    ${p.cambiosManuales && p.cambiosManuales.length ? '<div class="alert">Este pedido tuvo correcciones manuales.</div>' : ''}
    <div class="order-top">
      <div>
        <h3>${p.proveedor}</h3>
        <div class="muted small">Factura ${p.factura}</div>
      </div>
      <div class="status finalizado">Finalizado</div>
    </div>
    <div class="meta">
      <span>Inventario: ${diffMinutes(p.inventarioInicio, p.inventarioFin) ?? '—'} min</span>
      <span>Recibo: ${diffMinutes(p.reciboInicio, p.reciboFin) ?? '—'} min</span>
      <span>Personas descarga: ${p.personasDescarga ?? '—'}</span>
    </div>
    <div class="muted small">Inicio inventario: ${fmtDateTime(p.inventarioInicio)}</div>
    <div class="muted small">Fin inventario: ${fmtDateTime(p.inventarioFin)}</div>
    <div class="muted small">Inicio recibo: ${fmtDateTime(p.reciboInicio)}</div>
    <div class="muted small">Fin recibo: ${fmtDateTime(p.reciboFin)}</div>
  </div>`).join('');
}

function renderAlmuerzos() {
  const activos = state.almuerzos.filter(a => !a.regreso);
  const historial = state.almuerzos;
  document.getElementById('listaAlmuerzoActivos').innerHTML = activos.length
    ? activos.map(a => `<div class="order">
      <div class="order-top">
        <div>
          <h3>${a.nombre}</h3>
          <div class="muted small">${a.cargo || 'Sin cargo'}</div>
        </div>
        <div class="status almuerzo">En almuerzo</div>
      </div>
      <div class="meta">
        <span>Salida: ${fmtDateTime(a.salida)}</span>
        <span>Tiempo fuera: ${fmtDuration(secondsSince(a.salida))}</span>
      </div>
      <div class="btns"><button class="btn-primary" type="button" onclick="registrarRegresoAlmuerzo('${a.id}')">Registrar regreso</button></div>
    </div>`).join('')
    : '<div class="empty">En este momento nadie está en almuerzo.</div>';
  document.getElementById('listaAlmuerzoHistorial').innerHTML = historial.length
    ? historial.map(a => `<div class="order">
      <div class="order-top">
        <div>
          <h3>${a.nombre}</h3>
          <div class="muted small">${a.cargo || 'Sin cargo'}</div>
        </div>
        <div class="status ${a.regreso ? 'finalizado' : 'almuerzo'}">${a.regreso ? 'Regresó' : 'En almuerzo'}</div>
      </div>
      <div class="meta">
        <span>Salida: ${fmtDateTime(a.salida)}</span>
        <span>Regreso: ${fmtDateTime(a.regreso)}</span>
        <span>Duración: ${diffMinutes(a.salida, a.regreso) ?? '—'} min</span>
      </div>
    </div>`).join('')
    : '<div class="empty">Aún no hay almuerzos registrados.</div>';
}

function renderPersonal() {
  const box = document.getElementById('listaPersonal');
  if (!state.personal.length) {
    box.innerHTML = '<div class="empty">Aún no hay empleados registrados.</div>';
    return;
  }
  box.innerHTML = state.personal.map(emp => {
    const est = estadoEmpleado(emp);
    const disableDelete = !isAdmin() ? 'disabled' : '';
    return `<div class="order">
      <div class="order-top">
        <div>
          <h3>${emp.nombre}</h3>
          <div class="muted small">${emp.cargo || 'Sin cargo'}</div>
        </div>
        <div class="status ${est.clase}">${est.texto}</div>
      </div>
      <div class="btns"><button class="btn-danger" type="button" onclick="eliminarEmpleado('${emp.id}')" ${disableDelete}>Eliminar</button></div>
    </div>`;
  }).join('');
}

function sameDay(iso, dateStr) {
  if (!iso || !dateStr) return false;
  return new Date(iso).toISOString().slice(0, 10) === dateStr;
}

function generarReporte() {
  const fecha = document.getElementById('fechaReporte').value;
  if (!fecha) return;
  const pedidosCreados = state.pedidos.filter(p => sameDay(p.createdAt, fecha));
  const pedidosFinalizados = state.pedidos.filter(p => p.reciboFin && sameDay(p.reciboFin, fecha));
  const invs = pedidosFinalizados.map(p => diffMinutes(p.inventarioInicio, p.inventarioFin)).filter(x => x !== null);
  const recs = pedidosFinalizados.map(p => diffMinutes(p.reciboInicio, p.reciboFin)).filter(x => x !== null);
  document.getElementById('repPedidosCreados').textContent = pedidosCreados.length;
  document.getElementById('repPedidosFinalizados').textContent = pedidosFinalizados.length;
  document.getElementById('repInvProm').textContent = invs.length ? Math.round(invs.reduce((a, b) => a + b, 0) / invs.length) + ' min' : '0';
  document.getElementById('repRecProm').textContent = recs.length ? Math.round(recs.reduce((a, b) => a + b, 0) / recs.length) + ' min' : '0';
  document.getElementById('reportePedidos').innerHTML = pedidosCreados.length
    ? pedidosCreados.map(p => `<div class="order">
      <div class="order-top">
        <div>
          <h3>${p.proveedor}</h3>
          <div class="muted small">Factura ${p.factura}</div>
        </div>
        <div class="status ${p.estado}">${labelEstado(p.estado)}</div>
      </div>
      <div class="meta">
        <span>👷 ${p.bodeguero || 'Sin asignar'}</span>
        <span>Inventario: ${diffMinutes(p.inventarioInicio, p.inventarioFin) ?? '—'} min</span>
        <span>Recibo: ${diffMinutes(p.reciboInicio, p.reciboFin) ?? '—'} min</span>
        <span>Finalizó: ${fmtDateTime(p.reciboFin)}</span>
      </div>
    </div>`).join('')
    : '<div class="empty">No hay pedidos creados ese día.</div>';
  const almuerzos = state.almuerzos.filter(a => sameDay(a.salida, fecha));
  const resumenPorEmpleado = {};
  almuerzos.forEach(a => {
    const dur = diffMinutes(a.salida, a.regreso) || 0;
    if (!resumenPorEmpleado[a.nombre]) {
      resumenPorEmpleado[a.nombre] = { cargo: a.cargo || '', veces: 0, minutos: 0 };
    }
    resumenPorEmpleado[a.nombre].veces += 1;
    resumenPorEmpleado[a.nombre].minutos += dur;
  });
  const entries = Object.entries(resumenPorEmpleado);
  document.getElementById('reporteAlmuerzos').innerHTML = entries.length
    ? entries.map(([nombre, info]) => `<div class="order">
      <div class="order-top">
        <div>
          <h3>${nombre}</h3>
          <div class="muted small">${info.cargo || 'Sin cargo'}</div>
        </div>
        <div class="status finalizado">${info.veces} salida(s)</div>
      </div>
      <div class="meta"><span>Total almuerzo: ${info.minutos} min</span></div>
    </div>`).join('')
    : '<div class="empty">No hay almuerzos registrados ese día.</div>';
}

function renderTrazabilidad() {
  const box = document.getElementById('listaTrazabilidad');
  if (!state.trazabilidad.length) {
    box.innerHTML = '<div class="empty">Aún no hay movimientos registrados.</div>';
    return;
  }
  box.innerHTML = state.trazabilidad.map(t => `<div class="order">
    <div class="order-top">
      <div>
        <h3>${t.tipo}</h3>
        <div class="muted small">${t.detalle}</div>
      </div>
      <div class="status finalizado">${t.usuario}</div>
    </div>
    <div class="meta">
      <span>Rol: ${t.rol}</span>
      <span>Fecha: ${fmtDateTime(t.fecha)}</span>
    </div>
    ${t.valorAnterior !== undefined ? `<div class="muted small">Antes: ${t.valorAnterior}</div>` : ''}
    ${t.valorNuevo !== undefined ? `<div class="muted small">Ahora: ${t.valorNuevo}</div>` : ''}
  </div>`).join('');
}

function render() {
  document.getElementById('roleBadge').textContent = `Rol: ${state.role}`;

  const userNameElement = document.getElementById('userName');
  if (userNameElement && state.currentUser) {
    userNameElement.textContent = state.currentUser.nombre;
  } else if (userNameElement && !state.currentUser) {
    userNameElement.textContent = 'Sin sesión';
  }

  llenarSelects();
  renderPedidos();
  renderOperacion();
  renderDashboard();
  renderHistorial();
  renderAlmuerzos();
  renderPersonal();
  renderTrazabilidad();
  const fechaInput = document.getElementById('fechaReporte');
  if (fechaInput && !fechaInput.value) fechaInput.value = new Date().toISOString().slice(0, 10);
  if (fechaInput && fechaInput.value) generarReporte();
  const btnPersonal = document.getElementById('btnGuardarPersonal');
  if (btnPersonal) btnPersonal.disabled = !isAdmin();
  const btnPedido = document.getElementById('btnGuardarPedido');
  if (btnPedido) btnPedido.disabled = !isAdmin();
  const btnBorrar = document.getElementById('btnBorrarTodo');
  if (btnBorrar) btnBorrar.disabled = !isAdmin();
  persist();
}

function bindEvents() {
  document.getElementById('btnLogin').addEventListener('click', login);
  document.getElementById('btnGuardarPedido').addEventListener('click', crearPedido);
  document.getElementById('btnDemo').addEventListener('click', cargarDemo);
  document.getElementById('btnBorrarTodo').addEventListener('click', borrarTodo);
  document.getElementById('btnSalidaAlmuerzo').addEventListener('click', registrarSalidaAlmuerzo);
  document.getElementById('btnGuardarPersonal').addEventListener('click', guardarEmpleado);
  document.getElementById('btnGenerarReporte').addEventListener('click', generarReporte);
  document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => mostrarVista(tab.dataset.view)));
  document.getElementById('roleBadge').addEventListener('click', logout);
  document.getElementById('loginPin').addEventListener('keydown', e => {
    if (e.key === 'Enter') login();
  });
}

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

loadLocal();
bindEvents();
await initFirebase();
applyRoleVisibility();
render();
if (!state.currentUser) mostrarVista('login');