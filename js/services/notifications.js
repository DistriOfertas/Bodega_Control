// Servicio de notificaciones en tiempo real
let notificationPermission = false;
let lastNotification = {};
let notificationSound = null;

// Pedir permiso para notificaciones
export async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    console.log("Este navegador no soporta notificaciones");
    return false;
  }

  const permission = await Notification.requestPermission();
  notificationPermission = permission === "granted";

  if (notificationPermission) {
    console.log("✅ Notificaciones permitidas");
  }

  return notificationPermission;
}

// Mostrar notificación
export function showNotification(title, body, options = {}) {
  if (!notificationPermission) return;

  // Evitar notificaciones duplicadas en menos de 3 segundos
  const key = `${title}-${body}`;
  const now = Date.now();
  if (lastNotification[key] && now - lastNotification[key] < 3000) {
    return;
  }
  lastNotification[key] = now;

  // Crear notificación
  const notification = new Notification(title, {
    body: body,
    icon: "/assets/logo.png",
    silent: options.silent || false,
    ...options,
  });

  // Al hacer click en la notificación
  notification.onclick = () => {
    window.focus();
    if (options.onClick) options.onClick();
    notification.close();
  };

  // Cerrar automáticamente después de 5 segundos
  setTimeout(() => notification.close(), 5000);
}

// Notificaciones específicas
export function notifyPedidoCreado(pedido, usuario) {
  showNotification(
    "📦 Nuevo Pedido",
    `${usuario} creó pedido para ${pedido.proveedor} (Factura: ${pedido.factura})`,
    {
      onClick: () => {
        // Cambiar a la vista de pedidos
        const event = new CustomEvent("changeView", {
          detail: { view: "pedidos" },
        });
        document.dispatchEvent(event);
      },
    },
  );
}

export function notifyPedidoReprogramado(pedido, usuario) {
  showNotification(
    "🔄 Pedido Reprogramado",
    `${usuario} reprogramó pedido de ${pedido.proveedor} para ${pedido.fechaProgramada}`,
    {
      onClick: () => {
        const event = new CustomEvent("changeView", {
          detail: { view: "operacion" },
        });
        document.dispatchEvent(event);
      },
    },
  );
}

export function notifyPedidoFinalizado(pedido, usuario) {
  showNotification(
    "✅ Pedido Finalizado",
    `${usuario} finalizó pedido de ${pedido.proveedor} (Factura: ${pedido.factura})`,
    {
      onClick: () => {
        const event = new CustomEvent("changeView", {
          detail: { view: "historial" },
        });
        document.dispatchEvent(event);
      },
    },
  );
}

export function notifyInventarioIniciado(pedido, usuario) {
  showNotification(
    "⏱️ Inventario Iniciado",
    `${usuario} inició inventario de ${pedido.proveedor}`,
    { silent: true },
  );
}

export function notifyReciboIniciado(pedido, usuario) {
  showNotification(
    "📋 Recibo Iniciado",
    `${usuario} inició recibo de ${pedido.proveedor}`,
    { silent: true },
  );
}

export function notifyUsuarioLogueado(usuario) {
  showNotification(
    "👋 Bienvenido",
    `Has iniciado sesión como ${usuario.nombre}`,
    { silent: true },
  );
}
