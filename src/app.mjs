import http from "node:http";
import { getDb, rowToUser } from "./db.mjs";
import { HttpError, assertValid } from "./errors.mjs";
import { ROLES } from "./config.mjs";
import { hashPassword, signJwt, verifyJwt, verifyPassword } from "./security.mjs";
import { validatePartidoInput, validateSeleccionInput, validateUserInput } from "./validators.mjs";
import { mundial2022PartidosBase, mundial2022Selecciones, seleccionPendiente } from "./mundial2022-data.mjs";

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

function getAuthUser(req, db) {
  const auth = req.headers.authorization ?? "";
  const [type, token] = auth.split(" ");
  if (type !== "Bearer" || !token) throw new HttpError(401, "Token JWT requerido.");
  const payload = verifyJwt(token);
  if (!payload?.sub) throw new HttpError(401, "Token JWT invalido o expirado.");
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(Number(payload.sub));
  if (!row) throw new HttpError(401, "Usuario del token no existe.");
  return row;
}

function requireAdmin(user) {
  if (user.rol !== ROLES.ADMIN) throw new HttpError(403, "El rol CONSULTA solo puede realizar consultas GET.");
}

function parseId(value, label = "id") {
  const id = Number(value);
  assertValid(Number.isInteger(id) && id > 0, `${label} invalido.`);
  return id;
}

function ensureSeleccionExists(db, id, label) {
  const row = db.prepare("SELECT * FROM selecciones WHERE id = ?").get(id);
  if (!row) throw new HttpError(400, `${label} no existe.`);
  return row;
}

function selectionPayload(body, current = {}) {
  return {
    nombre: body.nombre ?? current.nombre,
    continente: body.continente ?? current.continente,
    grupo: body.grupo ?? current.grupo,
    ranking_fifa: body.ranking_fifa !== undefined ? Number(body.ranking_fifa) : current.ranking_fifa,
    entrenador: body.entrenador ?? current.entrenador
  };
}

function partidoPayload(body, current = {}) {
  return {
    seleccion_local_id: body.seleccion_local_id !== undefined ? Number(body.seleccion_local_id) : current.seleccion_local_id,
    seleccion_visitante_id: body.seleccion_visitante_id !== undefined ? Number(body.seleccion_visitante_id) : current.seleccion_visitante_id,
    fecha: body.fecha ?? current.fecha,
    estadio: body.estadio ?? current.estadio,
    fase: body.fase ?? current.fase,
    goles_local: body.goles_local !== undefined ? (body.goles_local === null ? null : Number(body.goles_local)) : current.goles_local,
    goles_visitante: body.goles_visitante !== undefined ? (body.goles_visitante === null ? null : Number(body.goles_visitante)) : current.goles_visitante,
    estado: body.estado ?? current.estado ?? "PROGRAMADO"
  };
}

function buildTokenResponse(user) {
  return {
    token: signJwt({ sub: user.id, email: user.email, rol: user.rol }),
    user: rowToUser(user)
  };
}

function getSeleccionByName(db, nombre) {
  return db.prepare("SELECT * FROM selecciones WHERE nombre = ?").get(nombre);
}

function createSeleccionIfMissing(db, seleccion) {
  const existing = getSeleccionByName(db, seleccion.nombre);
  if (existing) return { row: existing, created: false };
  const result = db
    .prepare("INSERT INTO selecciones (nombre, continente, grupo, ranking_fifa, entrenador) VALUES (?, ?, ?, ?, ?)")
    .run(seleccion.nombre, seleccion.continente, seleccion.grupo, seleccion.ranking_fifa, seleccion.entrenador);
  return {
    row: db.prepare("SELECT * FROM selecciones WHERE id = ?").get(result.lastInsertRowid),
    created: true
  };
}

function createPartidoByNamesIfMissing(db, partido) {
  const [localNombre, visitanteNombre, fecha, estadio, fase, golesLocal, golesVisitante, estado] = partido;
  const local = getSeleccionByName(db, localNombre);
  const visitante = getSeleccionByName(db, visitanteNombre);
  if (!local || !visitante) {
    throw new HttpError(400, `No se puede crear ${localNombre} vs ${visitanteNombre}: seleccion inexistente.`);
  }
  const existing = db.prepare(`
    SELECT *
    FROM partidos
    WHERE seleccion_local_id = ?
      AND seleccion_visitante_id = ?
      AND fecha = ?
      AND fase = ?
  `).get(local.id, visitante.id, fecha, fase);
  if (existing) return { row: existing, created: false };
  const result = db.prepare(
    "INSERT INTO partidos (seleccion_local_id, seleccion_visitante_id, fecha, estadio, fase, goles_local, goles_visitante, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(local.id, visitante.id, fecha, estadio, fase, golesLocal ?? null, golesVisitante ?? null, estado ?? "PROGRAMADO");
  return {
    row: db.prepare("SELECT * FROM partidos WHERE id = ?").get(result.lastInsertRowid),
    created: true
  };
}

function importMundial2022(db) {
  const summary = {
    selecciones_creadas: 0,
    selecciones_existentes: 0,
    pendiente_creado: false,
    partidos_creados: 0,
    partidos_existentes: 0,
    selecciones: {},
    detalle: "Carga base: 32 selecciones, fase de grupos completa, octavos, cuartos, una semifinal y el placeholder Pendiente para partidos programados."
  };
  db.exec("BEGIN");
  try {
    for (const seleccion of mundial2022Selecciones) {
      const result = createSeleccionIfMissing(db, seleccion);
      summary.selecciones[result.row.nombre] = result.row.id;
      if (result.created) summary.selecciones_creadas++;
      else summary.selecciones_existentes++;
    }
    const pendiente = createSeleccionIfMissing(db, seleccionPendiente);
    summary.selecciones[pendiente.row.nombre] = pendiente.row.id;
    summary.pendiente_creado = pendiente.created;
    for (const partido of mundial2022PartidosBase) {
      const result = createPartidoByNamesIfMissing(db, partido);
      if (result.created) summary.partidos_creados++;
      else summary.partidos_existentes++;
    }
    db.exec("COMMIT");
    return summary;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function makeRoutes() {
  return [
    route("POST", /^\/api\/auth\/register$/, ({ db, body }) => {
      validateUserInput(body);
      const userCount = db.prepare("SELECT COUNT(*) AS total FROM users").get().total;
      const requestedRole = body.rol === ROLES.ADMIN && userCount === 0 ? ROLES.ADMIN : ROLES.CONSULTA;
      try {
        const result = db
          .prepare("INSERT INTO users (nombre, email, password_hash, rol) VALUES (?, ?, ?, ?)")
          .run(body.nombre.trim(), body.email.trim().toLowerCase(), hashPassword(body.password), requestedRole);
        const user = db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid);
        return [201, buildTokenResponse(user)];
      } catch (error) {
        if (String(error.message).includes("UNIQUE")) throw new HttpError(409, "El email ya esta registrado.");
        throw error;
      }
    }),
    route("POST", /^\/api\/auth\/login$/, ({ db, body }) => {
      assertValid(body.email && body.password, "Email y password son obligatorios.");
      const user = db.prepare("SELECT * FROM users WHERE email = ?").get(String(body.email).trim().toLowerCase());
      if (!user || !verifyPassword(String(body.password), user.password_hash)) {
        throw new HttpError(401, "Credenciales invalidas.");
      }
      return [200, buildTokenResponse(user)];
    }),
    route("GET", /^\/api\/auth\/me$/, ({ user }) => [200, { user: rowToUser(user) }]),
    route("POST", /^\/api\/auth\/logout$/, () => [200, { message: "Logout correcto. El cliente debe descartar el token JWT." }]),

    route("POST", /^\/api\/import\/mundial-2022$/, ({ db, user }) => {
      requireAdmin(user);
      return [201, { message: "Estructura base del Mundial 2022 importada.", data: importMundial2022(db) }];
    }),

    route("GET", /^\/api\/selecciones$/, ({ db }) => [
      200,
      { data: db.prepare("SELECT * FROM selecciones ORDER BY grupo, nombre").all() }
    ]),
    route("GET", /^\/api\/selecciones\/(\d+)$/, ({ db, match }) => {
      const row = db.prepare("SELECT * FROM selecciones WHERE id = ?").get(parseId(match[1]));
      if (!row) throw new HttpError(404, "Seleccion no encontrada.");
      return [200, { data: row }];
    }),
    route("POST", /^\/api\/selecciones$/, ({ db, body, user }) => {
      requireAdmin(user);
      validateSeleccionInput(body);
      const payload = selectionPayload(body);
      try {
        const result = db
          .prepare("INSERT INTO selecciones (nombre, continente, grupo, ranking_fifa, entrenador) VALUES (?, ?, ?, ?, ?)")
          .run(payload.nombre.trim(), payload.continente.trim(), payload.grupo.trim().toUpperCase(), payload.ranking_fifa, payload.entrenador.trim());
        return [201, { data: db.prepare("SELECT * FROM selecciones WHERE id = ?").get(result.lastInsertRowid) }];
      } catch (error) {
        if (String(error.message).includes("UNIQUE")) throw new HttpError(409, "El nombre de seleccion debe ser unico.");
        throw error;
      }
    }),
    route("PUT", /^\/api\/selecciones\/(\d+)$/, ({ db, body, match, user }) => {
      requireAdmin(user);
      const id = parseId(match[1]);
      const current = db.prepare("SELECT * FROM selecciones WHERE id = ?").get(id);
      if (!current) throw new HttpError(404, "Seleccion no encontrada.");
      validateSeleccionInput(body, { partial: true });
      const payload = selectionPayload(body, current);
      try {
        db.prepare("UPDATE selecciones SET nombre=?, continente=?, grupo=?, ranking_fifa=?, entrenador=?, updated_at=datetime('now') WHERE id=?")
          .run(payload.nombre.trim(), payload.continente.trim(), payload.grupo.trim().toUpperCase(), payload.ranking_fifa, payload.entrenador.trim(), id);
        return [200, { data: db.prepare("SELECT * FROM selecciones WHERE id = ?").get(id) }];
      } catch (error) {
        if (String(error.message).includes("UNIQUE")) throw new HttpError(409, "El nombre de seleccion debe ser unico.");
        throw error;
      }
    }),
    route("DELETE", /^\/api\/selecciones\/(\d+)$/, ({ db, match, user }) => {
      requireAdmin(user);
      const result = db.prepare("DELETE FROM selecciones WHERE id = ?").run(parseId(match[1]));
      if (!result.changes) throw new HttpError(404, "Seleccion no encontrada.");
      return [200, { message: "Seleccion eliminada." }];
    }),

    route("GET", /^\/api\/partidos$/, ({ db }) => [
      200,
      { data: db.prepare("SELECT * FROM partidos ORDER BY fecha").all() }
    ]),
    route("GET", /^\/api\/partidos\/(\d+)$/, ({ db, match }) => {
      const row = db.prepare("SELECT * FROM partidos WHERE id = ?").get(parseId(match[1]));
      if (!row) throw new HttpError(404, "Partido no encontrado.");
      return [200, { data: row }];
    }),
    route("GET", /^\/api\/partidos\/fase\/([A-Z_]+)$/, ({ db, match }) => {
      return [200, { data: db.prepare("SELECT * FROM partidos WHERE fase = ? ORDER BY fecha").all(match[1]) }];
    }),
    route("POST", /^\/api\/partidos$/, ({ db, body, user }) => {
      requireAdmin(user);
      validatePartidoInput(body);
      const payload = partidoPayload(body);
      ensureSeleccionExists(db, payload.seleccion_local_id, "La seleccion local");
      ensureSeleccionExists(db, payload.seleccion_visitante_id, "La seleccion visitante");
      const result = db.prepare(
        "INSERT INTO partidos (seleccion_local_id, seleccion_visitante_id, fecha, estadio, fase, goles_local, goles_visitante, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(payload.seleccion_local_id, payload.seleccion_visitante_id, payload.fecha, payload.estadio, payload.fase, payload.goles_local ?? null, payload.goles_visitante ?? null, payload.estado);
      return [201, { data: db.prepare("SELECT * FROM partidos WHERE id = ?").get(result.lastInsertRowid) }];
    }),
    route("PUT", /^\/api\/partidos\/(\d+)$/, ({ db, body, match, user }) => {
      requireAdmin(user);
      const id = parseId(match[1]);
      const current = db.prepare("SELECT * FROM partidos WHERE id = ?").get(id);
      if (!current) throw new HttpError(404, "Partido no encontrado.");
      validatePartidoInput(body, { partial: true });
      const payload = partidoPayload(body, current);
      ensureSeleccionExists(db, payload.seleccion_local_id, "La seleccion local");
      ensureSeleccionExists(db, payload.seleccion_visitante_id, "La seleccion visitante");
      db.prepare(
        "UPDATE partidos SET seleccion_local_id=?, seleccion_visitante_id=?, fecha=?, estadio=?, fase=?, goles_local=?, goles_visitante=?, estado=?, updated_at=datetime('now') WHERE id=?"
      ).run(payload.seleccion_local_id, payload.seleccion_visitante_id, payload.fecha, payload.estadio, payload.fase, payload.goles_local, payload.goles_visitante, payload.estado, id);
      return [200, { data: db.prepare("SELECT * FROM partidos WHERE id = ?").get(id) }];
    }),
    route("PUT", /^\/api\/partidos\/(\d+)\/resultado$/, ({ db, body, match, user }) => {
      requireAdmin(user);
      const id = parseId(match[1]);
      const current = db.prepare("SELECT * FROM partidos WHERE id = ?").get(id);
      if (!current) throw new HttpError(404, "Partido no encontrado.");
      validatePartidoInput(body, { resultado: true });
      db.prepare("UPDATE partidos SET goles_local=?, goles_visitante=?, estado='FINALIZADO', updated_at=datetime('now') WHERE id=?")
        .run(Number(body.goles_local), Number(body.goles_visitante), id);
      return [200, { data: db.prepare("SELECT * FROM partidos WHERE id = ?").get(id) }];
    }),
    route("DELETE", /^\/api\/partidos\/(\d+)$/, ({ db, match, user }) => {
      requireAdmin(user);
      const result = db.prepare("DELETE FROM partidos WHERE id = ?").run(parseId(match[1]));
      if (!result.changes) throw new HttpError(404, "Partido no encontrado.");
      return [200, { message: "Partido eliminado." }];
    }),

    route("GET", /^\/api\/grupos\/([^/]+)\/tabla$/, ({ db, match }) => {
      const grupo = decodeURIComponent(match[1]).toUpperCase();
      const selecciones = db.prepare("SELECT * FROM selecciones WHERE UPPER(grupo) = ? ORDER BY nombre").all(grupo);
      const stats = new Map(selecciones.map((s) => [s.id, {
        seleccion_id: s.id,
        seleccion: s.nombre,
        grupo: s.grupo,
        PJ: 0,
        PG: 0,
        PE: 0,
        PP: 0,
        GF: 0,
        GC: 0,
        DG: 0,
        PTS: 0
      }]));
      const partidos = db.prepare(`
        SELECT p.*
        FROM partidos p
        JOIN selecciones l ON l.id = p.seleccion_local_id
        JOIN selecciones v ON v.id = p.seleccion_visitante_id
        WHERE p.fase = 'GRUPOS'
          AND p.estado = 'FINALIZADO'
          AND UPPER(l.grupo) = ?
          AND UPPER(v.grupo) = ?
      `).all(grupo, grupo);
      for (const p of partidos) {
        const local = stats.get(p.seleccion_local_id);
        const visitante = stats.get(p.seleccion_visitante_id);
        if (!local || !visitante) continue;
        local.PJ++; visitante.PJ++;
        local.GF += p.goles_local; local.GC += p.goles_visitante;
        visitante.GF += p.goles_visitante; visitante.GC += p.goles_local;
        if (p.goles_local > p.goles_visitante) {
          local.PG++; local.PTS += 3; visitante.PP++;
        } else if (p.goles_local < p.goles_visitante) {
          visitante.PG++; visitante.PTS += 3; local.PP++;
        } else {
          local.PE++; visitante.PE++; local.PTS++; visitante.PTS++;
        }
        local.DG = local.GF - local.GC;
        visitante.DG = visitante.GF - visitante.GC;
      }
      const tabla = [...stats.values()].sort((a, b) => b.PTS - a.PTS || b.DG - a.DG || b.GF - a.GF || a.seleccion.localeCompare(b.seleccion));
      return [200, { grupo, data: tabla }];
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
      const found = routes.find((r) => r.method === req.method && r.pattern.test(url.pathname));
      if (!found) throw new HttpError(404, "Endpoint no encontrado.");
      const match = url.pathname.match(found.pattern);
      const publicRoute = req.method === "POST" && ["/api/auth/register", "/api/auth/login"].includes(url.pathname);
      const user = publicRoute ? null : getAuthUser(req, db);
      const body = ["POST", "PUT", "PATCH"].includes(req.method) ? await readJson(req) : {};
      const [status, payload] = await found.handler({ req, db, url, match, body, user });
      return json(res, status, payload);
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      return json(res, status, {
        error: error.message ?? "Error interno",
        details: error.details
      });
    }
  });
}
