import { ESTADOS_PARTIDO, ESTADOS_TORNEO, FORMATOS_TORNEO, ROLES } from "./config.mjs";
import { assertValid } from "./errors.mjs";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PARTICIPANTES_PERMITIDOS = Object.freeze([2, 4, 8, 10, 12, 16, 24, 32, 48]);

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
  for (const field of ["nombre", "formato", "fecha_inicio", "fecha_fin"]) {
    if (!partial || body[field] !== undefined) requiredText(body[field], field);
  }
  if (!partial || body.participantes_count !== undefined) {
    assertValid(Number.isInteger(Number(body.participantes_count)), "participantes_count debe ser un numero entero.");
  }
  if (body.formato !== undefined) assertValid(FORMATOS_TORNEO.includes(body.formato), "Formato invalido. Use LIGA, ELIMINACION o MIXTO.");
  if (body.participantes_count !== undefined) assertValid(PARTICIPANTES_PERMITIDOS.includes(Number(body.participantes_count)), "Cantidad de paises invalida. Use 2, 4, 8, 10, 12, 16, 24, 32 o 48.");
  if (body.fecha_inicio !== undefined && body.fecha_fin !== undefined) assertValid(new Date(body.fecha_fin) >= new Date(body.fecha_inicio), "La fecha de finalizacion no puede ser anterior a la fecha de inicio.");
  if (body.formato === "ELIMINACION" && (!partial || body.cantidad_grupos !== undefined)) assertValid(body.cantidad_grupos === undefined || body.cantidad_grupos === null, "El formato eliminatorio no usa grupos de tabla.");
  if (body.formato && body.formato !== "ELIMINACION" && (!partial || (body.participantes_count !== undefined && body.cantidad_grupos !== undefined))) {
    const participantes = Number(body.participantes_count);
    const grupos = Number(body.cantidad_grupos);
    assertValid(Number.isInteger(grupos) && grupos >= 1 && participantes % grupos === 0 && participantes / grupos >= 2, "La cantidad de grupos debe dividir exactamente a los paises participantes, con al menos 2 paises por grupo.");
  }
  if (body.estado !== undefined) assertValid(ESTADOS_TORNEO.includes(body.estado), "Estado de torneo invalido.");
  if (body.ganador_equipo_id !== undefined && body.ganador_equipo_id !== null) assertValid(Number.isInteger(Number(body.ganador_equipo_id)) && Number(body.ganador_equipo_id) > 0, "ganador_equipo_id debe ser un id valido.");
  if (body.estado === "FINALIZADO" && (!partial || body.ganador_equipo_id !== undefined)) assertValid(Number.isInteger(Number(body.ganador_equipo_id)) && Number(body.ganador_equipo_id) > 0, "No se puede finalizar el torneo sin seleccionar un ganador.");
}

export function validateEquipoInput(body, { partial = false } = {}) {
  if (!partial || body.seleccion_catalogo_id !== undefined) {
    assertValid(Number.isInteger(Number(body.seleccion_catalogo_id)) && Number(body.seleccion_catalogo_id) > 0, "seleccion_catalogo_id debe ser un id valido.");
  }
  if (body.grupo !== undefined && body.grupo !== null) {
    assertValid(typeof body.grupo === "string" && body.grupo.trim().length <= 30, "El grupo debe tener hasta 30 caracteres.");
  }
}

export function validatePartidoInput(body, { partial = false, resultado = false } = {}) {
  const required = resultado ? ["marcador_local", "marcador_visitante"] : ["fecha", "sede", "ronda"];
  for (const field of required) {
    if (!partial || body[field] !== undefined) {
      const value = body[field];
      assertValid(value !== undefined && value !== null && String(value).trim() !== "", `El campo ${field} es obligatorio.`);
    }
  }
  if (body.ronda !== undefined) {
    assertValid(["GRUPOS", "OCTAVOS", "CUARTOS", "SEMIFINAL", "FINAL"].includes(body.ronda), "Fase invalida. Use GRUPOS, OCTAVOS, CUARTOS, SEMIFINAL o FINAL.");
  }
  for (const field of ["equipo_local_id", "equipo_visitante_id"]) {
    if (body[field] !== undefined && body[field] !== null) assertValid(Number.isInteger(Number(body[field])) && Number(body[field]) > 0, `${field} debe ser un id valido.`);
  }
  for (const field of ["marcador_local", "marcador_visitante"]) {
    if (body[field] !== undefined && body[field] !== null) assertValid(Number.isInteger(Number(body[field])) && Number(body[field]) >= 0, "Los marcadores no pueden ser negativos.");
  }
  if (body.equipo_local_id !== undefined && body.equipo_visitante_id !== undefined && body.equipo_local_id !== null && body.equipo_visitante_id !== null) {
    assertValid(Number(body.equipo_local_id) !== Number(body.equipo_visitante_id), "Un equipo no puede jugar contra si mismo.");
  }
  if (body.estado !== undefined) assertValid(ESTADOS_PARTIDO.includes(body.estado), "Estado invalido. Use PROGRAMADO, EN_JUEGO o FINALIZADO.");
}
