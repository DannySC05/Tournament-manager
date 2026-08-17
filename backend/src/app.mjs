import http from "node:http";
import { getDb, rowToUser } from "./db.mjs";
import { HttpError, assertValid } from "./errors.mjs";
import { ROLES } from "./config.mjs";
import { hashPassword, signJwt, verifyJwt, verifyPassword } from "./security.mjs";
import { buildStandings } from "./standings.mjs";
import { fetchCurrentFifaRanking } from "./fifa-catalog.mjs";
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

function datePayloadValue(value) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : value;
}

function torneoPayload(body, current = {}) {
  const formato = body.formato ?? current.formato;
  const estado = body.estado ?? current.estado ?? "BORRADOR";
  return {
    nombre: body.nombre ?? current.nombre,
    deporte: body.deporte ?? current.deporte ?? "Futbol",
    formato,
    participantes_count: body.participantes_count !== undefined ? Number(body.participantes_count) : current.participantes_count,
    cantidad_grupos: formato === "ELIMINACION" ? null : (body.cantidad_grupos !== undefined ? Number(body.cantidad_grupos) : current.cantidad_grupos),
    fecha_inicio: body.fecha_inicio ?? datePayloadValue(current.fecha_inicio),
    fecha_fin: body.fecha_fin !== undefined ? body.fecha_fin : datePayloadValue(current.fecha_fin),
    sede: body.sede !== undefined ? body.sede : (current.sede ?? null),
    estado,
    ganador_equipo_id: estado === "FINALIZADO" ? (body.ganador_equipo_id !== undefined ? Number(body.ganador_equipo_id) : current.ganador_equipo_id) : null
  };
}

function equipoPayload(body, current = {}) {
  return {
    seleccion_catalogo_id: body.seleccion_catalogo_id !== undefined ? Number(body.seleccion_catalogo_id) : current.seleccion_catalogo_id,
    grupo: body.grupo !== undefined ? body.grupo : current.grupo
  };
}

function groupOptionsForTournament(torneo) {
  if (torneo.formato === "ELIMINACION" || !torneo.cantidad_grupos) return [];
  return Array.from({ length: Number(torneo.cantidad_grupos) }, (_, index) => String.fromCharCode(65 + index));
}

function validateGroupForTournament(torneo, group) {
  const normalized = group?.trim() || null;
  const options = groupOptionsForTournament(torneo);
  if (!options.length) {
    assertValid(!normalized, "Este torneo eliminatorio no utiliza grupos.");
    return;
  }
  if (normalized) {
    assertValid(options.includes(normalized), `El grupo debe ser una opcion valida entre A y ${options.at(-1)}.`);
  }
}

function partidoPayload(body, current = {}) {
  return {
    equipo_local_id: body.equipo_local_id !== undefined ? (body.equipo_local_id === null ? null : Number(body.equipo_local_id)) : current.equipo_local_id,
    equipo_visitante_id: body.equipo_visitante_id !== undefined ? (body.equipo_visitante_id === null ? null : Number(body.equipo_visitante_id)) : current.equipo_visitante_id,
    fecha: body.fecha ?? current.fecha,
    sede: body.sede ?? current.sede,
    ronda: body.ronda ?? current.ronda,
    marcador_local: body.marcador_local !== undefined ? (body.marcador_local === null ? null : Number(body.marcador_local)) : (current.marcador_local ?? null),
    marcador_visitante: body.marcador_visitante !== undefined ? (body.marcador_visitante === null ? null : Number(body.marcador_visitante)) : (current.marcador_visitante ?? null),
    estado: body.estado ?? current.estado ?? "PROGRAMADO"
  };
}

const partidoFields = `
  SELECT p.*, COALESCE(local.nombre, 'Por definir') AS equipo_local, COALESCE(visitante.nombre, 'Por definir') AS equipo_visitante
  FROM partidos p
  LEFT JOIN equipos local ON local.id = p.equipo_local_id
  LEFT JOIN equipos visitante ON visitante.id = p.equipo_visitante_id
`;

async function getPartido(db, id) {
  const { rows } = await db.query(`${partidoFields} WHERE p.id = $1`, [id]);
  return rows[0];
}

async function ensureEquiposDelTorneo(db, torneoId, payload) {
  const checks = [];
  if (payload.equipo_local_id !== null) checks.push(ensureEquipo(db, payload.equipo_local_id, "El equipo local"));
  if (payload.equipo_visitante_id !== null) checks.push(ensureEquipo(db, payload.equipo_visitante_id, "El equipo visitante"));
  const teams = await Promise.all(checks);
  for (const team of teams) {
    if (team.torneo_id !== torneoId) {
      throw new HttpError(400, "Los equipos deben pertenecer al torneo indicado.");
    }
  }
}

async function ensureGanadorDelTorneo(db, torneoId, winnerId) {
  const winner = await ensureEquipo(db, winnerId, "El ganador");
  if (winner.torneo_id !== torneoId) throw new HttpError(400, "El ganador debe pertenecer al torneo indicado.");
}

async function ensureSeleccionCatalogo(db, id) {
  const { rows } = await db.query("SELECT * FROM selecciones_catalogo WHERE id = $1 AND activo = TRUE", [id]);
  const selection = rows[0];
  if (!selection) throw new HttpError(400, "La seleccion elegida no existe o no esta disponible en el catalogo.");
  return selection;
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

    route("GET", /^\/api\/catalogo-selecciones$/, async ({ db, url }) => {
      const search = url.searchParams.get("q")?.trim() ?? "";
      const { rows } = await db.query(`
        SELECT id, nombre, codigo_fifa, confederacion, escudo_url, bandera_url, ranking_fifa, ranking_puntos, ranking_actualizado_en
        FROM selecciones_catalogo
        WHERE activo = TRUE AND ($1 = '' OR nombre ILIKE '%' || $1 || '%' OR codigo_fifa ILIKE '%' || $1 || '%')
        ORDER BY ranking_fifa NULLS LAST, nombre
        LIMIT 250
      `, [search]);
      return [200, { data: rows }];
    }),
    route("POST", /^\/api\/catalogo-selecciones$/, async ({ db, body, user }) => {
      requireAdmin(user);
      assertValid(typeof body.nombre === "string" && body.nombre.trim().length >= 2, "El nombre de la seleccion es obligatorio.");
      assertValid(/^[A-Za-z]{3}$/.test(String(body.codigo_fifa ?? "")), "codigo_fifa debe tener tres letras.");
      assertValid(typeof body.confederacion === "string" && body.confederacion.trim().length >= 2, "La confederacion es obligatoria.");
      try {
        const { rows } = await db.query(`
          INSERT INTO selecciones_catalogo (nombre, codigo_fifa, confederacion, escudo_url, bandera_url, ranking_fifa, ranking_puntos, ranking_actualizado_en)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
        `, [body.nombre.trim(), body.codigo_fifa.trim().toUpperCase(), body.confederacion.trim().toUpperCase(), body.escudo_url ?? null, body.bandera_url ?? null, body.ranking_fifa ?? null, body.ranking_puntos ?? null, body.ranking_actualizado_en ?? null]);
        return [201, { data: rows[0] }];
      } catch (error) {
        if (isUniqueViolation(error)) throw new HttpError(409, "El codigo FIFA ya esta registrado en el catalogo.");
        throw error;
      }
    }),
    route("POST", /^\/api\/catalogo-selecciones\/sincronizar-ranking$/, async ({ db, user }) => {
      requireAdmin(user);
      let selections;
      try {
        selections = await fetchCurrentFifaRanking();
      } catch (error) {
        throw new HttpError(502, `No fue posible obtener el ranking FIFA: ${error.message}`);
      }
      const fieldsPerSelection = 8;
      const placeholders = selections.map((selection, index) => {
        const offset = index * fieldsPerSelection;
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`;
      });
      const values = selections.flatMap((selection) => [
        selection.nombre, selection.codigo_fifa, selection.confederacion, selection.bandera_url,
        selection.ranking_fifa, selection.ranking_puntos, selection.ranking_actualizado_en, selection.fifa_team_id
      ]);
      await db.query(`
        INSERT INTO selecciones_catalogo (nombre, codigo_fifa, confederacion, bandera_url, ranking_fifa, ranking_puntos, ranking_actualizado_en, fifa_team_id)
        VALUES ${placeholders.join(", ")}
        ON CONFLICT (codigo_fifa) DO UPDATE SET
          nombre = EXCLUDED.nombre,
          confederacion = EXCLUDED.confederacion,
          bandera_url = EXCLUDED.bandera_url,
          ranking_fifa = EXCLUDED.ranking_fifa,
          ranking_puntos = EXCLUDED.ranking_puntos,
          ranking_actualizado_en = EXCLUDED.ranking_actualizado_en,
          fifa_team_id = EXCLUDED.fifa_team_id,
          updated_at = CURRENT_TIMESTAMP
      `, values);
      return [200, { message: `Catalogo FIFA actualizado con ${selections.length} selecciones.`, data: { total: selections.length } }];
    }),

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
      assertValid(body.estado === undefined && body.ganador_equipo_id === undefined, "El estado y la seleccion ganadora se definen despues de crear el torneo.");
      const payload = torneoPayload({ ...body, estado: "BORRADOR", ganador_equipo_id: null });
      try {
        const { rows } = await db.query(
          "INSERT INTO torneos (nombre, deporte, formato, participantes_count, cantidad_grupos, fecha_inicio, fecha_fin, estado, ganador_equipo_id, sede) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *",
          [payload.nombre.trim(), payload.deporte.trim(), payload.formato, payload.participantes_count, payload.cantidad_grupos, payload.fecha_inicio, payload.fecha_fin, payload.estado, payload.ganador_equipo_id, payload.sede?.trim() || null]
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
      validateTorneoInput(payload);
      if (payload.estado === "FINALIZADO") await ensureGanadorDelTorneo(db, id, payload.ganador_equipo_id);
      const { rows: teamTotals } = await db.query("SELECT COUNT(*)::int AS total FROM equipos WHERE torneo_id = $1", [id]);
      if (teamTotals[0].total > payload.participantes_count) throw new HttpError(400, "No se puede reducir la cantidad de participantes por debajo de las selecciones ya registradas.");
      try {
        const { rows } = await db.query(
          "UPDATE torneos SET nombre=$1, deporte=$2, formato=$3, participantes_count=$4, cantidad_grupos=$5, fecha_inicio=$6, fecha_fin=$7, estado=$8, ganador_equipo_id=$9, sede=$10, updated_at=CURRENT_TIMESTAMP WHERE id=$11 RETURNING *",
          [payload.nombre.trim(), payload.deporte.trim(), payload.formato, payload.participantes_count, payload.cantidad_grupos, payload.fecha_inicio, payload.fecha_fin, payload.estado, payload.ganador_equipo_id, payload.sede?.trim() || null, id]
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
      const { rows } = await db.query(`
        SELECT e.*, c.codigo_fifa, c.confederacion, c.escudo_url, c.bandera_url, c.ranking_fifa, c.ranking_actualizado_en
        FROM equipos e
        LEFT JOIN selecciones_catalogo c ON c.id = e.seleccion_catalogo_id
        WHERE e.torneo_id = $1
        ORDER BY e.grupo NULLS LAST, e.nombre
      `, [torneoId]);
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
      const torneo = await ensureTorneo(db, torneoId);
      validateEquipoInput(body);
      validateGroupForTournament(torneo, body.grupo);
      const { rows: totals } = await db.query("SELECT COUNT(*)::int AS total FROM equipos WHERE torneo_id = $1", [torneoId]);
      if (totals[0].total >= torneo.participantes_count) throw new HttpError(400, `Este torneo admite un maximo de ${torneo.participantes_count} selecciones.`);
      const selection = await ensureSeleccionCatalogo(db, Number(body.seleccion_catalogo_id));
      const { rows: registered } = await db.query("SELECT id FROM equipos WHERE torneo_id = $1 AND seleccion_catalogo_id = $2", [torneoId, selection.id]);
      if (registered[0]) throw new HttpError(409, "Esta seleccion ya forma parte del torneo.");
      try {
        const { rows } = await db.query(
          "INSERT INTO equipos (torneo_id, seleccion_catalogo_id, nombre, grupo) VALUES ($1, $2, $3, $4) RETURNING *",
          [torneoId, selection.id, selection.nombre, body.grupo?.trim() || null]
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
      const torneo = await ensureTorneo(db, current.torneo_id);
      validateEquipoInput(body, { partial: true });
      const payload = equipoPayload(body, current);
      if (payload.seleccion_catalogo_id !== current.seleccion_catalogo_id) throw new HttpError(400, "No se puede cambiar la seleccion de un equipo ya registrado.");
      validateGroupForTournament(torneo, payload.grupo);
      try {
        const { rows } = await db.query(
          "UPDATE equipos SET grupo=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING *",
          [payload.grupo?.trim() || null, id]
        );
        return [200, { data: rows[0] }];
      } catch (error) {
        if (isUniqueViolation(error)) throw new HttpError(409, "El nombre del equipo ya existe en este torneo.");
        throw error;
      }
    }),
    route("DELETE", /^\/api\/equipos\/(\d+)$/, async ({ db, match, user }) => {
      requireAdmin(user);
      const id = parseId(match[1]);
      const { rows: tournaments } = await db.query("SELECT nombre FROM torneos WHERE ganador_equipo_id = $1 LIMIT 1", [id]);
      if (tournaments[0]) throw new HttpError(400, `No se puede eliminar la seleccion ganadora del torneo ${tournaments[0].nombre}.`);
      const result = await db.query("DELETE FROM equipos WHERE id = $1", [id]);
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
    const [status, payload] = await found.handler({ db, user, body, url, match: url.pathname.match(found.pattern) });
    return json(res, status, payload);
  } catch (error) {
    return json(res, error instanceof HttpError ? error.status : 500, { error: error.message ?? "Error interno", details: error.details });
  }
}

export function createApp() {
  return http.createServer(handleRequest);
}
