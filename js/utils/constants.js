// Constantes de la aplicación
export const STORAGE_KEY = "bodega_control_v8_local";

// Estados posibles
export const ESTADOS = {
  programado: "Programado",
  reprogramado: "Reprogramado",
  inventario: "En inventario",
  recibo: "En recibo",
  finalizado: "Finalizado",
};

// Usuarios por defecto
export const DEFAULT_USERS = {
  elmer: {
    username: "elmer",
    nombre: "Elmer Cagüeñas",
    role: "admin",
    pin: "1111",
  },
  paola: {
    username: "paola",
    nombre: "Paola",
    role: "admin",
    pin: "2222",
  },
  juan: {
    username: "juan",
    nombre: "Juanito",
    role: "coordinador",
    pin: "3333",
  },
  mateo: {
    username: "mateo",
    nombre: "Mateo",
    role: "admin",
    pin: "pruebas",
  },
};
