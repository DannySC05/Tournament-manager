import http from "node:http";
import { getDb, rowToUser } from "./db.mjs";
import { HttpError, assertValid } from "./errors.mjs";
import { ROLES } from "./config.mjs";
import { hashPassword, signJwt, verifyJwt, verifyPassword } from "./security.mjs";
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

function getAuthUser(req, db) {
  const [type, token] = (req.headers.authorization ?? "").split(" ");
  if (type !== "Bearer" || !token) throw new HttpError(401, "Token JWT requerido.");
  const payload = verifyJwt(token);
  if (!payload?.sub) throw new HttpError(401, "Token JWT invalido o expirado.");
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(Number(payload.sub));
  if (!user) throw new HttpError(401, "Usuario del token no existe.");
  return user;
}

function requireAdmin(user) {
  if (user.rol !== ROLES.ADMIN) throw new HttpError(403, "El rol CONSULTA solo puede realizar consultas GET.");
}

function buildTokenResponse(user) {
  return { token: signJwt({ sub: user.id, email: user.email, rol: user.rol }), user: rowToUser(user) };
}

function ensureTorneo(db, id) {
  const torneo = db.prepare("SELECT * FROM torneos WHERE id = ?").get(id);
  if (!torneo) throw new HttpError(404, "Torneo no encontrado.");
  return torneo;
}

function ensureEquipo(db, id, label) {
  const equipo = db.prepare("SELECT * FROM equipos WHERE id = ?").get(id);
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

function getPartido(db, id) {
  return db.prepare(`${partidoFields} WHERE p.id = ?`).get(id);
}

function ensureEquiposDelTorneo(db, torneoId, payload) {
  const local = ensureEquipo(db, payload.equipo_local_id, "El equipo local");
  const visitante = ensureEquipo(db, payload.equipo_visitante_id, "El equipo visitante");
  if (local.torneo_id !== torneoId || visitante.torneo_id !== torneoId) {
    throw new HttpError(400, "Los equipos deben pertenecer al torneo indicado.");
  }
}

function makeRoutes() {
  return [
    route("POST", /^\/api\/auth\/register$/, ({ db, body }) => {
      validateUserInput(body);
      const total = db.prepare("SELECT COUNT(*) AS total FROM users").get().total;
      const rol = body.rol === ROLES.ADMIN && total === 0 ? ROLES.ADMIN : ROLES.CONSULTA;
      try {
        const result = db.prepare("INSERT INTO users (nombre, email, password_hash, rol) VALUES (?, ?, ?, ?)")
          .run(body.nombre.trim(), body.email.trim().toLowerCase(), hashPassword(body.password), rol);
        return [201, buildTokenResponse(db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid))];
      } catch (error) {
        if (String(error.message).includes("UNIQUE")) throw new HttpError(409, "El email ya esta registrado.");
        throw error;
      }
    }),
    route("POST", /^\/api\/auth\/login$/, ({ db, body }) => {
      assertValid(body.email && body.password, "Email y password son obligatorios.");
      const user = db.prepare("SELECT * FROM users WHERE email = ?").get(String(body.email).trim().toLowerCase());
      if (!user || !verifyPassword(String(body.password), user.password_hash)) throw new HttpError(401, "Credenciales invalidas.");
      return [200, buildTokenResponse(user)];
    }),
    route("GET", /^\/api\/auth\/me$/, ({ user }) => [200, { user: rowToUser(user) }]),
    route("POST", /^\/api\/auth\/logout$/, () => [200, { message: "Logout correcto. El cliente debe descartar el token JWT." }]),

    route("GET", /^\/api\/torneos$/, ({ db }) => [
      200,
      { data: db.prepare(`SELECT t.*, COUNT(e.id) AS equipos_count FROM torneos t LEFT JOIN equipos e ON e.torneo_id = t.id GROUP BY t.id ORDER BY t.fecha_inicio DESC, t.nombre`).all() }
    ]),
    route("POST", /^\/api\/torneos$/, ({ db, body, user }) => {
      requireAdmin(user);
      validateTorneoInput(body);
      const payload = torneoPayload(body);
      try {
        const result = db.prepare("INSERT INTO torneos (nombre, deporte, formato, fecha_inicio, fecha_fin, estado) VALUES (?, ?, ?, ?, ?, ?)")
          .run(payload.nombre.trim(), payload.deporte.trim(), payload.formato, payload.fecha_inicio, payload.fecha_fin || null, payload.estado);
        return [201, { data: db.prepare("SELECT * FROM torneos WHERE id = ?").get(result.lastInsertRowid) }];
      } catch (error) {
        if (String(error.message).includes("UNIQUE")) throw new HttpError(409, "El nombre del torneo ya existe.");
        throw error;
      }
    }),
    route("GET", /^\/api\/torneos\/(\d+)$/, ({ db, match }) => [200, { data: ensureTorneo(db, parseId(match[1])) }]),
    route("PUT", /^\/api\/torneos\/(\d+)$/, ({ db, body, match, user }) => {
      requireAdmin(user);
      const id = parseId(match[1]);
      const current = ensureTorneo(db, id);
      validateTorneoInput(body, { partial: true });
      const payload = torneoPayload(body, current);
      try {
        db.prepare("UPDATE torneos SET nombre=?, deporte=?, formato=?, fecha_inicio=?, fecha_fin=?, estado=?, updated_at=datetime('now') WHERE id=?")
          .run(payload.nombre.trim(), payload.deporte.trim(), payload.formato, payload.fecha_inicio, payload.fecha_fin || null, payload.estado, id);
        return [200, { data: ensureTorneo(db, id) }];
      } catch (error) {
        if (String(error.message).includes("UNIQUE")) throw new HttpError(409, "El nombre del torneo ya existe.");
        throw error;
      }
    }),
    route("DELETE", /^\/api\/torneos\/(\d+)$/, ({ db, match, user }) => {
      requireAdmin(user);
      const result = db.prepare("DELETE FROM torneos WHERE id = ?").run(parseId(match[1]));
      if (!result.changes) throw new HttpError(404, "Torneo no encontrado.");
      return [200, { message: "Torneo eliminado." }];
    }),

    route("GET", /^\/api\/torneos\/(\d+)\/equipos$/, ({ db, match }) => {
      const torneoId = parseId(match[1], "torneo_id");
      ensureTorneo(db, torneoId);
      return [200, { data: db.prepare("SELECT * FROM equipos WHERE torneo_id = ? ORDER BY grupo, nombre").all(torneoId) }];
    }),
    route("POST", /^\/api\/torneos\/(\d+)\/equipos$/, ({ db, body, match, user }) => {
      requireAdmin(user);
      const torneoId = parseId(match[1], "torneo_id");
      ensureTorneo(db, torneoId);
      validateEquipoInput(body);
      try {
        const result = db.prepare("INSERT INTO equipos (torneo_id, nombre, grupo) VALUES (?, ?, ?)")
          .run(torneoId, body.nombre.trim(), body.grupo?.trim() || null);
        return [201, { data: db.prepare("SELECT * FROM equipos WHERE id = ?").get(result.lastInsertRowid) }];
      } catch (error) {
        if (String(error.message).includes("UNIQUE")) throw new HttpError(409, "El nombre del equipo ya existe en este torneo.");
        throw error;
      }
    }),
    route("PUT", /^\/api\/equipos\/(\d+)$/, ({ db, body, match, user }) => {
      requireAdmin(user);
      const id = parseId(match[1]);
      const current = ensureEquipo(db, id, "Equipo");
      validateEquipoInput(body, { partial: true });
      const payload = equipoPayload(body, current);
      try {
        db.prepare("UPDATE equipos SET nombre=?, grupo=?, updated_at=datetime('now') WHERE id=?")
          .run(payload.nombre.trim(), payload.grupo?.trim() || null, id);
        return [200, { data: db.prepare("SELECT * FROM equipos WHERE id = ?").get(id) }];
      } catch (error) {
        if (String(error.message).includes("UNIQUE")) throw new HttpError(409, "El nombre del equipo ya existe en este torneo.");
        throw error;
      }
    }),
    route("DELETE", /^\/api\/equipos\/(\d+)$/, ({ db, match, user }) => {
      requireAdmin(user);
      const result = db.prepare("DELETE FROM equipos WHERE id = ?").run(parseId(match[1]));
      if (!result.changes) throw new HttpError(404, "Equipo no encontrado.");
      return [200, { message: "Equipo eliminado." }];
    }),

    route("GET", /^\/api\/torneos\/(\d+)\/partidos$/, ({ db, match }) => {
      const torneoId = parseId(match[1], "torneo_id");
      ensureTorneo(db, torneoId);
      return [200, { data: db.prepare(`${partidoFields} WHERE p.torneo_id = ? ORDER BY p.fecha`).all(torneoId) }];
    }),
    route("POST", /^\/api\/torneos\/(\d+)\/partidos$/, ({ db, body, match, user }) => {
      requireAdmin(user);
      const torneoId = parseId(match[1], "torneo_id");
      ensureTorneo(db, torneoId);
      validatePartidoInput(body);
      const payload = partidoPayload(body);
      ensureEquiposDelTorneo(db, torneoId, payload);
      const result = db.prepare("INSERT INTO partidos (torneo_id, equipo_local_id, equipo_visitante_id, fecha, sede, ronda, marcador_local, marcador_visitante, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .run(torneoId, payload.equipo_local_id, payload.equipo_visitante_id, payload.fecha, payload.sede.trim(), payload.ronda.trim(), payload.marcador_local, payload.marcador_visitante, payload.estado);
      return [201, { data: getPartido(db, result.lastInsertRowid) }];
    }),
    route("GET", /^\/api\/partidos\/(\d+)$/, ({ db, match }) => {
      const row = getPartido(db, parseId(match[1]));
      if (!row) throw new HttpError(404, "Partido no encontrado.");
      return [200, { data: row }];
    }),
    route("PUT", /^\/api\/partidos\/(\d+)$/, ({ db, body, match, user }) => {
      requireAdmin(user);
      const id = parseId(match[1]);
      const current = getPartido(db, id);
      if (!current) throw new HttpError(404, "Partido no encontrado.");
      validatePartidoInput(body, { partial: true });
      const payload = partidoPayload(body, current);
      ensureEquiposDelTorneo(db, current.torneo_id, payload);
      db.prepare("UPDATE partidos SET equipo_local_id=?, equipo_visitante_id=?, fecha=?, sede=?, ronda=?, marcador_local=?, marcador_visitante=?, estado=?, updated_at=datetime('now') WHERE id=?")
        .run(payload.equipo_local_id, payload.equipo_visitante_id, payload.fecha, payload.sede.trim(), payload.ronda.trim(), payload.marcador_local, payload.marcador_visitante, payload.estado, id);
      return [200, { data: getPartido(db, id) }];
    }),
    route("PUT", /^\/api\/partidos\/(\d+)\/resultado$/, ({ db, body, match, user }) => {
      requireAdmin(user);
      const id = parseId(match[1]);
      if (!getPartido(db, id)) throw new HttpError(404, "Partido no encontrado.");
      validatePartidoInput(body, { resultado: true });
      db.prepare("UPDATE partidos SET marcador_local=?, marcador_visitante=?, estado='FINALIZADO', updated_at=datetime('now') WHERE id=?")
        .run(Number(body.marcador_local), Number(body.marcador_visitante), id);
      return [200, { data: getPartido(db, id) }];
    }),
    route("DELETE", /^\/api\/partidos\/(\d+)$/, ({ db, match, user }) => {
      requireAdmin(user);
      const result = db.prepare("DELETE FROM partidos WHERE id = ?").run(parseId(match[1]));
      if (!result.changes) throw new HttpError(404, "Partido no encontrado.");
      return [200, { message: "Partido eliminado." }];
    })
  ];
}

export function createApp() {
  const routes = makeRoutes();
  return http.createServer(async (req, res) => {
    if (req.method === "OPTIONS") return json(res, 204, {});
    try {
      const db = getDb();
      const url = new URL(req.url, "http://localhost");
      const found = routes.find((item) => item.method === req.method && item.pattern.test(url.pathname));
      if (!found) throw new HttpError(404, "Endpoint no encontrado.");
      const publicRoute = req.method === "POST" && ["/api/auth/register", "/api/auth/login"].includes(url.pathname);
      const user = publicRoute ? null : getAuthUser(req, db);
      const body = ["POST", "PUT", "PATCH"].includes(req.method) ? await readJson(req) : {};
      const [status, payload] = await found.handler({ db, user, body, match: url.pathname.match(found.pattern) });
      return json(res, status, payload);
    } catch (error) {
      return json(res, error instanceof HttpError ? error.status : 500, { error: error.message ?? "Error interno", details: error.details });
    }
  });
}
