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
  env: { ...process.env, PORT: String(port), DB_PATH: dbPath, JWT_SECRET: "verify-secret" },
  stdio: ["ignore", "pipe", "pipe"]
});

async function request(method, url, { token, body } = {}) {
  const response = await fetch(`${baseUrl}${url}`, {
    method,
    headers: { ...(body ? { "content-type": "application/json" } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  return { status: response.status, payload: await response.json().catch(() => ({})) };
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      await fetch(`${baseUrl}/api/torneos`);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error("El servidor no inicio a tiempo.");
}

async function stop() {
  if (!server.killed) server.kill();
  await Promise.race([once(server, "exit").catch(() => undefined), new Promise((resolve) => setTimeout(resolve, 1500))]);
  fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}

try {
  await waitForServer();
  let res = await request("GET", "/api/torneos");
  expect(res.status === 401, "Los endpoints protegidos deben exigir JWT.");

  res = await request("POST", "/api/auth/register", {
    body: { nombre: "Administrador", email: "admin@torneos.test", password: "Admin1234", rol: "ADMIN" }
  });
  expect(res.status === 201 && res.payload.user.rol === "ADMIN", "El primer usuario debe ser ADMIN.");
  const adminToken = res.payload.token;

  res = await request("POST", "/api/torneos", {
    token: adminToken,
    body: { nombre: "Copa Ciudad", deporte: "Futbol", formato: "LIGA", fecha_inicio: "2026-09-01", estado: "BORRADOR" }
  });
  expect(res.status === 201, "ADMIN debe crear torneos.");
  const torneoId = res.payload.data.id;

  res = await request("POST", `/api/torneos/${torneoId}/equipos`, { token: adminToken, body: { nombre: "Equipo Azul", grupo: "A" } });
  expect(res.status === 201, "ADMIN debe registrar equipos.");
  const equipoAzulId = res.payload.data.id;

  res = await request("POST", `/api/torneos/${torneoId}/equipos`, { token: adminToken, body: { nombre: "Equipo Rojo", grupo: "A" } });
  expect(res.status === 201, "ADMIN debe registrar un segundo equipo.");
  const equipoRojoId = res.payload.data.id;

  res = await request("POST", `/api/torneos/${torneoId}/partidos`, {
    token: adminToken,
    body: { equipo_local_id: equipoAzulId, equipo_visitante_id: equipoAzulId, fecha: "2026-09-04T18:00:00Z", sede: "Cancha Central", ronda: "Grupo A" }
  });
  expect(res.status === 400, "Un equipo no puede jugar contra si mismo.");

  res = await request("POST", `/api/torneos/${torneoId}/partidos`, {
    token: adminToken,
    body: { equipo_local_id: equipoAzulId, equipo_visitante_id: equipoRojoId, fecha: "2026-09-04T18:00:00Z", sede: "Cancha Central", ronda: "Grupo A", estado: "EN_JUEGO" }
  });
  expect(res.status === 201 && res.payload.data.estado === "EN_JUEGO", "ADMIN debe programar partidos validos.");
  const partidoId = res.payload.data.id;

  res = await request("PUT", `/api/partidos/${partidoId}/resultado`, { token: adminToken, body: { marcador_local: -1, marcador_visitante: 0 } });
  expect(res.status === 400, "Los marcadores negativos deben rechazarse.");

  res = await request("PUT", `/api/partidos/${partidoId}/resultado`, { token: adminToken, body: { marcador_local: 3, marcador_visitante: 1 } });
  expect(res.status === 200 && res.payload.data.estado === "FINALIZADO", "Registrar resultado debe finalizar el partido.");

  res = await request("POST", "/api/auth/register", {
    body: { nombre: "Consulta", email: "consulta@torneos.test", password: "Consulta123", rol: "ADMIN" }
  });
  expect(res.status === 201 && res.payload.user.rol === "CONSULTA", "Los usuarios posteriores deben ser CONSULTA.");
  const consultaToken = res.payload.token;

  res = await request("GET", `/api/torneos/${torneoId}/partidos`, { token: consultaToken });
  expect(res.status === 200 && res.payload.data.length === 1, "CONSULTA debe poder consultar partidos.");

  res = await request("POST", "/api/torneos", {
    token: consultaToken,
    body: { nombre: "Torneo sin permiso", deporte: "Baloncesto", formato: "LIGA", fecha_inicio: "2026-10-01" }
  });
  expect(res.status === 403, "CONSULTA debe recibir HTTP 403 al modificar informacion.");

  console.log("OK - autenticacion, autorizacion, torneos, equipos, partidos y validaciones verificados.");
} finally {
  await stop();
}
