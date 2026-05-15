import { login, logout } from "../modules/auth.js";
import { crearPedido, cargarDemo, borrarTodo } from "../modules/pedidos.js";
import { guardarEmpleado } from "../modules/personal.js";
import { registrarSalidaAlmuerzo } from "../modules/almuerzos.js";
import { getState } from "../services/state.js";
import { isAdmin } from "../services/state.js";
import { render } from "./render.js";
import {
  generarReporte,
  exportarReporteDiarioExcel,
  exportarTodosPedidosExcel,
} from "../modules/reportes.js";

export function bindEvents() {
  // Login/Logout
  const btnLogin = document.getElementById("btnLogin");
  if (btnLogin) btnLogin.addEventListener("click", login);

  const roleBadge = document.getElementById("roleBadge");
  if (roleBadge) roleBadge.addEventListener("click", logout);

  // Pedidos
  const btnGuardarPedido = document.getElementById("btnGuardarPedido");
  if (btnGuardarPedido) btnGuardarPedido.addEventListener("click", crearPedido);

  const btnDemo = document.getElementById("btnDemo");
  if (btnDemo) btnDemo.addEventListener("click", cargarDemo);

  const btnBorrarTodo = document.getElementById("btnBorrarTodo");
  if (btnBorrarTodo) btnBorrarTodo.addEventListener("click", borrarTodo);

  // Almuerzos
  const btnSalidaAlmuerzo = document.getElementById("btnSalidaAlmuerzo");
  if (btnSalidaAlmuerzo)
    btnSalidaAlmuerzo.addEventListener("click", registrarSalidaAlmuerzo);

  // Personal
  const btnGuardarPersonal = document.getElementById("btnGuardarPersonal");
  if (btnGuardarPersonal)
    btnGuardarPersonal.addEventListener("click", guardarEmpleado);

  // Enter en login
  const loginPin = document.getElementById("loginPin");
  if (loginPin) {
    loginPin.addEventListener("keydown", (e) => {
      if (e.key === "Enter") login();
    });
  }

  // Exportar Excel
  const btnGenerarReporte = document.getElementById("btnGenerarReporte");
  if (btnGenerarReporte) {
    btnGenerarReporte.addEventListener("click", generarReporte);
  }

  // Botones de exportación (agrega estos botones en tu HTML)
  const btnExportarDiario = document.getElementById("btnExportarDiario");
  if (btnExportarDiario) {
    btnExportarDiario.addEventListener("click", exportarReporteDiarioExcel);
  }

  const btnExportarTodos = document.getElementById("btnExportarTodos");
  if (btnExportarTodos) {
    btnExportarTodos.addEventListener("click", exportarTodosPedidosExcel);
  }

  const filtroBuscar = document.getElementById("filtroBuscar");
  if (filtroBuscar) {
    filtroBuscar.addEventListener("keyup", () => {
      window.actualizarFiltros();
    });
  }

  const filtroEstado = document.getElementById("filtroEstado");
  if (filtroEstado) {
    filtroEstado.addEventListener("change", () => {
      window.actualizarFiltros();
    });
  }

  const filtroBodeguero = document.getElementById("filtroBodeguero");
  if (filtroBodeguero) {
    filtroBodeguero.addEventListener("change", () => {
      window.actualizarFiltros();
    });
  }

  const btnLimpiarFiltros = document.getElementById("btnLimpiarFiltros");
  if (btnLimpiarFiltros) {
    btnLimpiarFiltros.addEventListener("click", () => {
      window.limpiarFiltros();
    });
  }

  // Actualizar botones según permisos
  updateButtonsByRole();
}

export function llenarSelects() {
  const state = getState();
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

function updateButtonsByRole() {
  const admin = isAdmin();
  const state = getState();
  const currentUser = state.currentUser;

  const btnPersonal = document.getElementById("btnGuardarPersonal");
  if (btnPersonal) btnPersonal.disabled = !admin;

  const btnPedido = document.getElementById("btnGuardarPedido");
  if (btnPedido) btnPedido.disabled = !admin;

  const btnBorrar = document.getElementById("btnBorrarTodo");
  if (btnBorrar) {
    const esMateo = currentUser && currentUser.username === "mateo";
    btnBorrar.disabled = !esMateo;

    // Opcional: Cambiar texto o estilo
    if (esMateo) {
      btnBorrar.title = "Tienes permiso para borrar todos los datos";
      btnBorrar.classList.add("btn-danger");
    } else {
      btnBorrar.title = "Solo Mateo puede borrar todos los datos";
      btnBorrar.classList.add("btn-disabled");
    }
  }

  const fechaInput = document.getElementById("fechaReporte");
  if (fechaInput && !fechaInput.value) {
    fechaInput.value = new Date().toISOString().slice(0, 10);
  }
  if (fechaInput && fechaInput.value) generarReporte();
}
