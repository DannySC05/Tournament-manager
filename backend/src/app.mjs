import http from "node:http";
import { getDb, rowToUser } from "./db.mjs";
import { HttpError, assertValid } from "./errors.mjs";
import { ROLES } from "./config.mjs";
import { hashPassword, signJwt, verifyJwt, verifyPassword } from "./security.mjs";
import { buildStandings } from "./standings.mjs";
import { validateEquipoInput, validatePartidoInput, validateTorneoInput, validateUserInput } from "./validators.mjs";

function json(res, status, payload) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "content-type, authorization",
    "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS"
  });
  res.end(JSON.stringify(payload, null, 2));
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1_000_000) throw new HttpError(413, "El cuerpo de la peticion es demasiado grande.");
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "JSON invalido.");
  }
}

function route(method, pattern, handler) {
  return { method, pattern, handler };
}

function parseId(value, label = "id") {
  const id = Number(value);
  assertValid(Number.isInteger(id) && id > 0, `${label} invalido.`);
  return id;
}

function isUniqueViolation(error) {
  return error?.code === "23505";
}

async function getAuthUser(req, db) {
  const [type, token] = (req.headers.authorization ?? "").split(" ");
  if (type !== "Bearer" || !token) throw new HttpError(401, "Token JWT requerido.");
  const payload = verifyJwt(token);
  if (!payload?.sub) throw new HttpError(401, "Token JWT invalido o expirado.");
  const { rows } = await db.query("SELECT * FROM users WHERE id = $1", [Number(payload.sub)]);
  const user = rows[0];
  if (!user) throw new HttpError(401, "Usuario del token no existe.");
  return user;
}

function requireAdmin(user) {
  if (user.rol !== ROLES.ADMIN) throw new HttpError(403, "El rol CONSULTA solo puede realizar consultas GET.");
}

function buildTokenResponse(user) {
  return { token: signJwt({ sub: user.id, email: user.email, rol: user.rol }), user: rowToUser(user) };
}

async function ensureTorneo(db, id) {
  const { rows } = await db.query("SELECT * FROM torneos WHERE id = $1", [id]);
  const torneo = rows[0];
  if (!torneo) throw new HttpError(404, "Torneo no encontrado.");
  return torneo;
}

async function ensureEquipo(db, id, label) {
  const { rows } = await db.query("SELECT * FROM equipos WHERE id = $1", [id]);
  const equipo = rows[0];
  if (!equipo) throw new HttpError(400, `${label} no existe.`);
  return equipo;
}

function torneoPayload(body, current = {}) {
  return {
    nombre: body.nombre ?? current.nombre,
    deporte: body.deporte ?? current.deporte,
    formato: body.formato ?? current.formato,
    fecha_inicio: body.fecha_inicio ?? current.fecha_inicio,
    fecha_fin: body.fecha_fin !== undefined ? body.fecha_fin : current.fecha_fin,
    estado: body.estado ?? current.estado ?? "BORRADOR"
  };
}

function equipoPayload(body, current = {}) {
  return {
    nombre: body.nombre ?? current.nombre,
    grupo: body.grupo !== undefined ? body.grupo : current.grupo
  };
}

function partidoPayload(body, current = {}) {
  return {
    equipo_local_id: body.equipo_local_id !== undefined ? Number(body.equipo_local_id) : current.equipo_local_id,
    equipo_visitante_id: body.equipo_visitante_id !== undefined ? Number(body.equipo_visitante_id) : current.equipo_visitante_id,
    fecha: body.fecha ?? current.fecha,
    sede: body.sede ?? current.sede,
    ronda: body.ronda ?? current.ronda,
    marcador_local: body.marcador_local !== undefined ? (body.marcador_local === null ? null : Number(body.marcador_local)) : (current.marcador_local ?? null),
    marcador_visitante: body.marcador_visitante !== undefined ? (body.marcador_visitante === null ? null : Number(body.marcador_visitante)) : (current.marcador_visitante ?? null),
    estado: body.estado ?? current.estado ?? "PROGRAMADO"
  };
}

const partidoFields = `
  SELECT p.*, local.nombre AS equipo_local, visitante.nombre AS equipo_visitante
  FROM partidos p
  JOIN equipos local ON local.id = p.equipo_local_id
  JOIN equipos visitante ON visitante.id = p.equipo_visitante_id
`;

async function getPartido(db, id) {
  const { rows } = await db.query(`${partidoFields} WHERE p.id = $1`, [id]);
  return rows[0];
}

async function ensureEquiposDelTorneo(db, torneoId, payload) {
  const [local, visitante] = await Promise.all([
    ensureEquipo(db, payload.equipo_local_id, "El equipo local"),
    ensureEquipo(db, payload.equipo_visitante_id, "El equipo visitante")
  ]);
  if (local.torneo_id !== torneoId || visitante.torneo_id !== torneoId) {
    throw new HttpError(400, "Los equipos deben pertenecer al torneo indicado.");
  }
}

function makeRoutes() {
  return [
    route("POST", /^\/api\/auth\/register$/, async ({ db, body }) => {
      validateUserInput(body);
      const { rows: totals } = await db.query("SELECT COUNT(*)::int AS total FROM users");
      const rol = body.rol === ROLES.ADMIN && totals[0].total === 0 ? ROLES.ADMIN : ROLES.CONSULTA;
      try {
        const { rows } = await db.query(
          "INSERT INTO users (nombre, email, password_hash, rol) VALUES ($1, $2, $3, $4) RETURNING *",
          [body.nombre.trim(), body.email.trim().toLowerCase(), hashPassword(body.password), rol]
        );
        return [201, buildTokenResponse(rows[0])];
      } catch (error) {
        if (isUniqueViolation(error)) throw new HttpError(409, "El email ya esta registrado.");
        throw error;
      }
    }),
    route("POST", /^\/api\/auth\/login$/, async ({ db, body }) => {
      assertValid(body.email && body.password, "Email y password son obligatorios.");
      const { rows } = await db.query("SELECT * FROM users WHERE email = $1", [String(body.email).trim().toLowerCase()]);
      const user = rows[0];
      if (!user || !verifyPassword(String(body.password), user.password_hash)) throw new HttpError(401, "Credenciales invalidas.");
      return [200, buildTokenResponse(user)];
    }),
    route("GET", /^\/api\/auth\/me$/, async ({ user }) => [200, { user: rowToUser(user) }]),
    route("POST", /^\/api\/auth\/logout$/, async () => [200, { message: "Logout correcto. El cliente debe descartar el token JWT." }]),

    route("GET", /^\/api\/torneos$/, async ({ db }) => {
      const { rows } = await db.query(`
        SELECT t.*, COUNT(e.id)::int AS equipos_count
        FROM torneos t
        LEFT JOIN equipos e ON e.torneo_id = t.id
        GROUP BY t.id
        ORDER BY t.fecha_inicio DESC, t.nombre
      `);
      return [200, { data: rows }];
    }),
    route("POST", /^\/api\/torneos$/, async ({ db, body, user }) => {
      requireAdmin(user);
      validateTorneoInput(body);
      const payload = torneoPayload(body);
      try {
        const { rows } = await db.query(
          "INSERT INTO torneos (nombre, deporte, formato, fecha_inicio, fecha_fin, estado) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
          [payload.nombre.trim(), payload.deporte.trim(), payload.formato, payload.fecha_inicio, payload.fecha_fin || null, payload.estado]
        );
        return [201, { data: rows[0] }];
      } catch (error) {
        if (isUniqueViolation(error)) throw new HttpError(409, "El nombre del torneo ya existe.");
        throw error;
      }
    }),
    route("GET", /^\/api\/torneos\/(\d+)$/, async ({ db, match }) => [200, { data: await ensureTorneo(db, parseId(match[1])) }]),
    route("PUT", /^\/api\/torneos\/(\d+)$/, async ({ db, body, match, user }) => {
      requireAdmin(user);
      const id = parseId(match[1]);
      const current = await ensureTorneo(db, id);
      validateTorneoInput(body, { partial: true });
      const payload = torneoPayload(body, current);
      try {
        const { rows } = await db.query(
          "UPDATE torneos SET nombre=$1, deporte=$2, formato=$3, fecha_inicio=$4, fecha_fin=$5, estado=$6, updated_at=CURRENT_TIMESTAMP WHERE id=$7 RETURNING *",
          [payload.nombre.trim(), payload.deporte.trim(), payload.formato, payload.fecha_inicio, payload.fecha_fin || null, payload.estado, id]
        );
        return [200, { data: rows[0] }];
      } catch (error) {
        if (isUniqueViolation(error)) throw new HttpError(409, "El nombre del torneo ya existe.");
        throw error;
      }
    }),
    route("DELETE", /^\/api\/torneos\/(\d+)$/, async ({ db, match, user }) => {
      requireAdmin(user);
      const result = await db.query("DELETE FROM torneos WHERE id = $1", [parseId(match[1])]);
      if (!result.rowCount) throw new HttpError(404, "Torneo no encontrado.");
      return [200, { message: "Torneo eliminado." }];
    }),

    route("GET", /^\/api\/torneos\/(\d+)\/equipos$/, async ({ db, match }) => {
      const torneoId = parseId(match[1], "torneo_id");
      await ensureTorneo(db, torneoId);
      const { rows } = await db.query("SELECT * FROM equipos WHERE torneo_id = $1 ORDER BY grupo NULLS LAST, nombre", [torneoId]);
      return [200, { data: rows }];
    }),
    route("GET", /^\/api\/torneos\/(\d+)\/clasificacion$/, async ({ db, match }) => {
      const torneoId = parseId(match[1], "torneo_id");
      await ensureTorneo(db, torneoId);
      const [teams, matches] = await Promise.all([
        db.query("SELECT * FROM equipos WHERE torneo_id = $1 ORDER BY grupo NULLS LAST, nombre", [torneoId]),
        db.query("SELECT * FROM partidos WHERE torneo_id = $1 AND estado = 'FINALIZADO'", [torneoId])
      ]);
      return [200, { data: { grupos: buildStandings(teams.rows, matches.rows) } }];
    }),
    route("POST", /^\/api\/torneos\/(\d+)\/equipos$/, async ({ db, body, match, user }) => {
      requireAdmin(user);
      const torneoId = parseId(match[1], "torneo_id");
      await ensureTorneo(db, torneoId);
      validateEquipoInput(body);
      try {
        const { rows } = await db.query(
          "INSERT INTO equipos (torneo_id, nombre, grupo) VALUES ($1, $2, $3) RETURNING *",
          [torneoId, body.nombre.trim(), body.grupo?.trim() || null]
        );
        return [201, { data: rows[0] }];
      } catch (error) {
        if (isUniqueViolation(error)) throw new HttpError(409, "El nombre del equipo ya existe en este torneo.");
        throw error;
      }
    }),
    route("PUT", /^\/api\/equipos\/(\d+)$/, async ({ db, body, match, user }) => {
      requireAdmin(user);
      const id = parseId(match[1]);
      const current = await ensureEquipo(db, id, "Equipo");
      validateEquipoInput(body, { partial: true });
      const payload = equipoPayload(body, current);
      try {
        const { rows } = await db.query(
          "UPDATE equipos SET nombre=$1, grupo=$2, updated_at=CURRENT_TIMESTAMP WHERE id=$3 RETURNING *",
          [payload.nombre.trim(), payload.grupo?.trim() || null, id]
        );
        return [200, { data: rows[0] }];
      } catch (error) {
        if (isUniqueViolation(error)) throw new HttpError(409, "El nombre del equipo ya existe en este torneo.");
        throw error;
      }
    }),
    route("DELETE", /^\/api\/equipos\/(\d+)$/, async ({ db, match, user }) => {
      requireAdmin(user);
      const result = await db.query("DELETE FROM equipos WHERE id = $1", [parseId(match[1])]);
      if (!result.rowCount) throw new HttpError(404, "Equipo no encontrado.");
      return [200, { message: "Equipo eliminado." }];
    }),

    route("GET", /^\/api\/torneos\/(\d+)\/partidos$/, async ({ db, match }) => {
      const torneoId = parseId(match[1], "torneo_id");
      await ensureTorneo(db, torneoId);
      const { rows } = await db.query(`${partidoFields} WHERE p.torneo_id = $1 ORDER BY p.fecha`, [torneoId]);
      return [200, { data: rows }];
    }),
    route("POST", /^\/api\/torneos\/(\d+)\/partidos$/, async ({ db, body, match, user }) => {
      requireAdmin(user);
      const torneoId = parseId(match[1], "torneo_id");
      await ensureTorneo(db, torneoId);
      validatePartidoInput(body);
      const payload = partidoPayload(body);
      await ensureEquiposDelTorneo(db, torneoId, payload);
      const { rows } = await db.query(
        "INSERT INTO partidos (torneo_id, equipo_local_id, equipo_visitante_id, fecha, sede, ronda, marcador_local, marcador_visitante, estado) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id",
        [torneoId, payload.equipo_local_id, payload.equipo_visitante_id, payload.fecha, payload.sede.trim(), payload.ronda.trim(), payload.marcador_local, payload.marcador_visitante, payload.estado]
      );
      return [201, { data: await getPartido(db, rows[0].id) }];
    }),
    route("GET", /^\/api\/partidos\/(\d+)$/, async ({ db, match }) => {
      const row = await getPartido(db, parseId(match[1]));
      if (!row) throw new HttpError(404, "Partido no encontrado.");
      return [200, { data: row }];
    }),
    route("PUT", /^\/api\/partidos\/(\d+)$/, async ({ db, body, match, user }) => {
      requireAdmin(user);
      const id = parseId(match[1]);
      const current = await getPartido(db, id);
      if (!current) throw new HttpError(404, "Partido no encontrado.");
      validatePartidoInput(body, { partial: true });
      const payload = partidoPayload(body, current);
      await ensureEquiposDelTorneo(db, current.torneo_id, payload);
      await db.query(
        "UPDATE partidos SET equipo_local_id=$1, equipo_visitante_id=$2, fecha=$3, sede=$4, ronda=$5, marcador_local=$6, marcador_visitante=$7, estado=$8, updated_at=CURRENT_TIMESTAMP WHERE id=$9",
        [payload.equipo_local_id, payload.equipo_visitante_id, payload.fecha, payload.sede.trim(), payload.ronda.trim(), payload.marcador_local, payload.marcador_visitante, payload.estado, id]
      );
      return [200, { data: await getPartido(db, id) }];
    }),
    route("PUT", /^\/api\/partidos\/(\d+)\/resultado$/, async ({ db, body, match, user }) => {
      requireAdmin(user);
      const id = parseId(match[1]);
      if (!await getPartido(db, id)) throw new HttpError(404, "Partido no encontrado.");
      validatePartidoInput(body, { resultado: true });
      await db.query(
        "UPDATE partidos SET marcador_local=$1, marcador_visitante=$2, estado='FINALIZADO', updated_at=CURRENT_TIMESTAMP WHERE id=$3",
        [Number(body.marcador_local), Number(body.marcador_visitante), id]
      );
      return [200, { data: await getPartido(db, id) }];
    }),
    route("DELETE", /^\/api\/partidos\/(\d+)$/, async ({ db, match, user }) => {
      requireAdmin(user);
      const result = await db.query("DELETE FROM partidos WHERE id = $1", [parseId(match[1])]);
      if (!result.rowCount) throw new HttpError(404, "Partido no encontrado.");
      return [200, { message: "Partido eliminado." }];
    })
  ];
}

const routes = makeRoutes();

export async function handleRequest(req, res) {
  if (req.method === "OPTIONS") return json(res, 204, {});
  try {
    const db = await getDb();
    const url = new URL(req.url, "http://localhost");
    const found = routes.find((item) => item.method === req.method && item.pattern.test(url.pathname));
    if (!found) throw new HttpError(404, "Endpoint no encontrado.");
    const publicRoute = req.method === "POST" && ["/api/auth/register", "/api/auth/login"].includes(url.pathname);
    const user = publicRoute ? null : await getAuthUser(req, db);
    const body = ["POST", "PUT", "PATCH"].includes(req.method) ? await readJson(req) : {};
    const [status, payload] = await found.handler({ db, user, body, match: url.pathname.match(found.pattern) });
    return json(res, status, payload);
  } catch (error) {
    return json(res, error instanceof HttpError ? error.status : 500, { error: error.message ?? "Error interno", details: error.details });
  }
}

export function createApp() {
  return http.createServer(handleRequest);
}
