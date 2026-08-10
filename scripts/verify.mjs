import { spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tmpRoot = path.join(rootDir, ".tmp");
fs.mkdirSync(tmpRoot, { recursive: true });
const tmpDir = fs.mkdtempSync(path.join(tmpRoot, "verify-"));
const dbPath = path.join(tmpDir, "test.sqlite");
const port = 3187;
const baseUrl = `http://127.0.0.1:${port}`;

const server = spawn(process.execPath, ["--no-warnings", "src/server.mjs"], {
  cwd: rootDir,
  env: {
    ...process.env,
    PORT: String(port),
    DB_PATH: dbPath,
    JWT_SECRET: "verify-secret"
  },
  stdio: ["ignore", "pipe", "pipe"]
});

async function stop() {
  if (!server.killed) server.kill();
  await Promise.race([
    once(server, "exit").catch(() => undefined),
    new Promise((resolve) => setTimeout(resolve, 1500))
  ]);
  fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}

async function request(method, url, { token, body } = {}) {
  const response = await fetch(`${baseUrl}${url}`, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json().catch(() => ({}));
  return { status: response.status, payload };
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try {
      await fetch(`${baseUrl}/api/selecciones`);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error("El servidor no inicio a tiempo.");
}

try {
  await waitForServer();

  let res = await request("GET", "/api/selecciones");
  expect(res.status === 401, "Los endpoints protegidos deben exigir token JWT.");

  res = await request("POST", "/api/auth/register", {
    body: {
      nombre: "Administrador",
      email: "admin@mundial.test",
      password: "Admin1234",
      rol: "ADMIN"
    }
  });
  expect(res.status === 201 && res.payload.token, "Debe registrar el primer ADMIN y devolver token.");
  const adminToken = res.payload.token;

  res = await request("POST", "/api/selecciones", {
    token: adminToken,
    body: { nombre: "Ecuador", continente: "CONMEBOL", grupo: "A", ranking_fifa: 31, entrenador: "Felix Sanchez" }
  });
  expect(res.status === 201, "ADMIN debe crear selecciones.");
  const ecuadorId = res.payload.data.id;

  res = await request("POST", "/api/selecciones", {
    token: adminToken,
    body: { nombre: "Brasil", continente: "CONMEBOL", grupo: "A", ranking_fifa: 5, entrenador: "Dorival Junior" }
  });
  expect(res.status === 201, "ADMIN debe crear una segunda seleccion.");
  const brasilId = res.payload.data.id;

  res = await request("POST", "/api/partidos", {
    token: adminToken,
    body: {
      seleccion_local_id: ecuadorId,
      seleccion_visitante_id: ecuadorId,
      fecha: "2026-06-20T20:00:00Z",
      estadio: "Estadio Central",
      fase: "GRUPOS"
    }
  });
  expect(res.status === 400, "No debe permitir que una seleccion juegue contra si misma.");

  res = await request("POST", "/api/partidos", {
    token: adminToken,
    body: {
      seleccion_local_id: ecuadorId,
      seleccion_visitante_id: brasilId,
      fecha: "2026-06-20T20:00:00Z",
      estadio: "Estadio Central",
      fase: "GRUPOS"
    }
  });
  expect(res.status === 201, "ADMIN debe crear partidos validos.");
  const partidoId = res.payload.data.id;

  res = await request("PUT", `/api/partidos/${partidoId}/resultado`, {
    token: adminToken,
    body: { goles_local: -1, goles_visitante: 0 }
  });
  expect(res.status === 400, "Los goles negativos deben rechazarse.");

  res = await request("PUT", `/api/partidos/${partidoId}/resultado`, {
    token: adminToken,
    body: { goles_local: 2, goles_visitante: 1 }
  });
  expect(res.status === 200 && res.payload.data.estado === "FINALIZADO", "Registrar resultado debe finalizar el partido.");

  res = await request("GET", "/api/grupos/A/tabla", { token: adminToken });
  expect(res.status === 200, "Debe consultar tabla de posiciones.");
  expect(res.payload.data[0].seleccion === "Ecuador" && res.payload.data[0].PTS === 3, "La tabla debe calcular PJ, goles y puntos.");

  res = await request("POST", "/api/auth/register", {
    body: { nombre: "Consulta", email: "consulta@mundial.test", password: "Consulta123", rol: "ADMIN" }
  });
  expect(res.status === 201 && res.payload.user.rol === "CONSULTA", "Los usuarios posteriores quedan como CONSULTA.");
  const consultaToken = res.payload.token;

  res = await request("GET", "/api/selecciones", { token: consultaToken });
  expect(res.status === 200, "CONSULTA debe poder hacer GET.");

  res = await request("POST", "/api/selecciones", {
    token: consultaToken,
    body: { nombre: "Argentina", continente: "CONMEBOL", grupo: "B", ranking_fifa: 1, entrenador: "Lionel Scaloni" }
  });
  expect(res.status === 403, "CONSULTA debe recibir HTTP 403 al modificar informacion.");

  res = await request("POST", "/api/import/mundial-2022", { token: adminToken });
  expect(res.status === 201, "ADMIN debe importar la estructura base del Mundial 2022.");
  expect(res.payload.data.selecciones.Argentina, "La importacion debe devolver IDs de selecciones.");
  const mundialIds = res.payload.data.selecciones;
  expect(mundialIds.Pendiente, "La importacion debe devolver el ID del placeholder Pendiente.");

  res = await request("POST", "/api/partidos", {
    token: adminToken,
    body: {
      seleccion_local_id: mundialIds.Marruecos,
      seleccion_visitante_id: mundialIds.Francia,
      fecha: "2022-12-14T19:00:00Z",
      estadio: "Al Bayt",
      fase: "SEMIFINAL",
      estado: "EN_JUEGO"
    }
  });
  expect(res.status === 201 && res.payload.data.estado === "EN_JUEGO", "Debe crear la semifinal reservada en progreso.");
  const semifinalReservadaId = res.payload.data.id;

  res = await request("PUT", `/api/partidos/${semifinalReservadaId}/resultado`, {
    token: adminToken,
    body: { goles_local: 0, goles_visitante: 2 }
  });
  expect(res.status === 200 && res.payload.data.estado === "FINALIZADO", "Debe finalizar la semifinal reservada con resultado.");

  res = await request("POST", "/api/partidos", {
    token: adminToken,
    body: {
      seleccion_local_id: mundialIds.Argentina,
      seleccion_visitante_id: mundialIds.Pendiente,
      fecha: "2022-12-18T15:00:00Z",
      estadio: "Lusail",
      fase: "FINAL",
      estado: "PROGRAMADO"
    }
  });
  expect(
    res.status === 201 && res.payload.data.estado === "PROGRAMADO" && res.payload.data.seleccion_visitante_id === mundialIds.Pendiente,
    "Debe crear la final reservada como programada contra Pendiente."
  );
  const finalReservadaId = res.payload.data.id;

  res = await request("PUT", `/api/partidos/${finalReservadaId}`, {
    token: adminToken,
    body: { seleccion_visitante_id: mundialIds.Francia }
  });
  expect(
    res.status === 200 && res.payload.data.estado === "PROGRAMADO" && res.payload.data.seleccion_visitante_id === mundialIds.Francia,
    "Debe reemplazar Pendiente por Francia sin finalizar la final."
  );

  res = await request("PUT", `/api/partidos/${finalReservadaId}/resultado`, {
    token: adminToken,
    body: { goles_local: 3, goles_visitante: 3 }
  });
  expect(res.status === 200 && res.payload.data.estado === "FINALIZADO", "Debe finalizar la final reservada con resultado.");

  res = await request("POST", "/api/import/mundial-2022", { token: consultaToken });
  expect(res.status === 403, "CONSULTA no debe poder ejecutar la importacion masiva.");

  console.log("OK - autenticacion, autorizacion, reglas de negocio, validaciones, tabla, importacion Mundial 2022 y partidos reservados verificados.");
} finally {
  await stop();
}
