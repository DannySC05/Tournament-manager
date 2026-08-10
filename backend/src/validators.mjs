import { ESTADOS_PARTIDO, ESTADOS_TORNEO, FORMATOS_TORNEO, ROLES } from "./config.mjs";
import { assertValid } from "./errors.mjs";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function requiredText(value, label) {
  assertValid(typeof value === "string" && value.trim().length >= 2, `El campo ${label} es obligatorio.`);
}

export function validateUserInput(body) {
  requiredText(body.nombre, "nombre");
  assertValid(emailPattern.test(String(body.email ?? "")), "El email debe tener un formato valido.");
  assertValid(typeof body.password === "string" && body.password.length >= 8, "El password debe tener minimo 8 caracteres.");
  if (body.rol !== undefined) assertValid(Object.values(ROLES).includes(body.rol), "Rol invalido. Use ADMIN o CONSULTA.");
}

export function validateTorneoInput(body, { partial = false } = {}) {
  for (const field of ["nombre", "deporte", "formato", "fecha_inicio"]) {
    if (!partial || body[field] !== undefined) requiredText(body[field], field);
  }
  if (body.formato !== undefined) assertValid(FORMATOS_TORNEO.includes(body.formato), "Formato invalido. Use LIGA, ELIMINACION o MIXTO.");
  if (body.estado !== undefined) assertValid(ESTADOS_TORNEO.includes(body.estado), "Estado de torneo invalido.");
}

export function validateEquipoInput(body, { partial = false } = {}) {
  if (!partial || body.nombre !== undefined) requiredText(body.nombre, "nombre");
  if (body.grupo !== undefined && body.grupo !== null) {
    assertValid(typeof body.grupo === "string" && body.grupo.trim().length <= 30, "El grupo debe tener hasta 30 caracteres.");
  }
}

export function validatePartidoInput(body, { partial = false, resultado = false } = {}) {
  const required = resultado ? ["marcador_local", "marcador_visitante"] : ["equipo_local_id", "equipo_visitante_id", "fecha", "sede", "ronda"];
  for (const field of required) {
    if (!partial || body[field] !== undefined) {
      const value = body[field];
      assertValid(value !== undefined && value !== null && String(value).trim() !== "", `El campo ${field} es obligatorio.`);
    }
  }
  for (const field of ["equipo_local_id", "equipo_visitante_id"]) {
    if (body[field] !== undefined) assertValid(Number.isInteger(Number(body[field])) && Number(body[field]) > 0, `${field} debe ser un id valido.`);
  }
  for (const field of ["marcador_local", "marcador_visitante"]) {
    if (body[field] !== undefined && body[field] !== null) assertValid(Number.isInteger(Number(body[field])) && Number(body[field]) >= 0, "Los marcadores no pueden ser negativos.");
  }
  if (body.equipo_local_id !== undefined && body.equipo_visitante_id !== undefined) {
    assertValid(Number(body.equipo_local_id) !== Number(body.equipo_visitante_id), "Un equipo no puede jugar contra si mismo.");
  }
  if (body.estado !== undefined) assertValid(ESTADOS_PARTIDO.includes(body.estado), "Estado invalido. Use PROGRAMADO, EN_JUEGO o FINALIZADO.");
}
