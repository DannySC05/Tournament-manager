import { ESTADOS_PARTIDO, FASES_PARTIDO, ROLES } from "./config.mjs";
import { assertValid } from "./errors.mjs";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateUserInput(body, { requirePassword = true } = {}) {
  assertValid(typeof body.nombre === "string" && body.nombre.trim().length >= 2, "El nombre es obligatorio.");
  assertValid(emailPattern.test(String(body.email ?? "")), "El email debe tener un formato valido.");
  if (requirePassword) {
    assertValid(typeof body.password === "string" && body.password.length >= 8, "El password debe tener minimo 8 caracteres.");
  }
  if (body.rol !== undefined) {
    assertValid(Object.values(ROLES).includes(body.rol), "Rol invalido. Use ADMIN o CONSULTA.");
  }
}

export function validateSeleccionInput(body, { partial = false } = {}) {
  const required = ["nombre", "continente", "grupo", "ranking_fifa", "entrenador"];
  for (const field of required) {
    if (!partial || body[field] !== undefined) {
      assertValid(body[field] !== undefined && body[field] !== null && String(body[field]).trim() !== "", `El campo ${field} es obligatorio.`);
    }
  }
  if (body.ranking_fifa !== undefined) {
    assertValid(Number.isInteger(Number(body.ranking_fifa)) && Number(body.ranking_fifa) >= 1, "ranking_fifa debe ser numerico y mayor o igual a 1.");
  }
}

export function validatePartidoInput(body, { partial = false, resultado = false } = {}) {
  const required = resultado
    ? ["goles_local", "goles_visitante"]
    : ["seleccion_local_id", "seleccion_visitante_id", "fecha", "estadio", "fase"];
  for (const field of required) {
    if (!partial || body[field] !== undefined) {
      assertValid(body[field] !== undefined && body[field] !== null && String(body[field]).trim() !== "", `El campo ${field} es obligatorio.`);
    }
  }
  for (const field of ["seleccion_local_id", "seleccion_visitante_id"]) {
    if (body[field] !== undefined) {
      assertValid(Number.isInteger(Number(body[field])), `${field} debe ser numerico.`);
    }
  }
  for (const field of ["goles_local", "goles_visitante"]) {
    if (body[field] !== undefined && body[field] !== null) {
      assertValid(Number.isInteger(Number(body[field])) && Number(body[field]) >= 0, "Los goles no pueden ser negativos.");
    }
  }
  if (body.seleccion_local_id !== undefined && body.seleccion_visitante_id !== undefined) {
    assertValid(Number(body.seleccion_local_id) !== Number(body.seleccion_visitante_id), "Una seleccion no puede jugar contra si misma.");
  }
  if (body.fase !== undefined) {
    assertValid(FASES_PARTIDO.includes(body.fase), "Fase invalida. Use GRUPOS, OCTAVOS, CUARTOS, SEMIFINAL o FINAL.");
  }
  if (body.estado !== undefined) {
    assertValid(ESTADOS_PARTIDO.includes(body.estado), "Estado invalido. Use PROGRAMADO, EN_JUEGO o FINALIZADO.");
  }
}
