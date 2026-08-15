import { spawn } from "node:child_process";
import { once } from "node:events";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = 3187;
const baseUrl = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["--no-warnings", "src/server.mjs"], {
  cwd: rootDir,
  env: { ...process.env, PORT: String(port), DATABASE_URL: "pg-mem://verify", JWT_SECRET: "verify-secret" },
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

  res = await request("POST", "/api/catalogo-selecciones", {
    token: adminToken,
    body: { nombre: "Seleccion Azul", codigo_fifa: "AZL", confederacion: "CONMEBOL", bandera_url: "https://example.test/azl.png", ranking_fifa: 1 }
  });
  expect(res.status === 201, "ADMIN debe poder registrar una seleccion en el catalogo.");
  const seleccionAzulId = res.payload.data.id;

  res = await request("POST", "/api/catalogo-selecciones", {
    token: adminToken,
    body: { nombre: "Seleccion Roja", codigo_fifa: "ROJ", confederacion: "UEFA", bandera_url: "https://example.test/roj.png", ranking_fifa: 2 }
  });
  expect(res.status === 201, "El catalogo debe admitir una segunda seleccion.");
  const seleccionRojaId = res.payload.data.id;

  res = await request("POST", "/api/torneos", {
    token: adminToken,
    body: {
      nombre: "Copa Ciudad",
      formato: "LIGA",
      participantes_count: 2,
      cantidad_grupos: 1,
      fecha_inicio: "2026-09-01",
      fecha_fin: "2026-09-30"
    }
  });
  expect(res.status === 201, "ADMIN debe crear torneos.");
  const torneoId = res.payload.data.id;

  res = await request("POST", `/api/torneos/${torneoId}/equipos`, { token: adminToken, body: { seleccion_catalogo_id: seleccionAzulId, grupo: "A" } });
  expect(res.status === 201, "ADMIN debe registrar equipos.");
  const equipoAzulId = res.payload.data.id;

  res = await request("POST", `/api/torneos/${torneoId}/equipos`, { token: adminToken, body: { seleccion_catalogo_id: seleccionRojaId, grupo: "A" } });
  expect(res.status === 201, "ADMIN debe registrar un segundo equipo.");
  const equipoRojoId = res.payload.data.id;

  res = await request("POST", `/api/torneos/${torneoId}/equipos`, { token: adminToken, body: { seleccion_catalogo_id: seleccionAzulId, grupo: "A" } });
  expect(res.status === 400, "No se debe superar el cupo de participantes configurado.");

  res = await request("PUT", `/api/torneos/${torneoId}`, { token: adminToken, body: { estado: "FINALIZADO" } });
  expect(res.status === 400, "Un torneo no puede finalizar sin una seleccion ganadora.");

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

  res = await request("GET", `/api/torneos/${torneoId}/clasificacion`, { token: adminToken });
  expect(res.status === 200 && res.payload.data.grupos[0].clasificacion[0].puntos === 3, "La clasificacion debe calcular los puntos de partidos finalizados.");

  res = await request("PUT", `/api/torneos/${torneoId}`, { token: adminToken, body: { estado: "FINALIZADO", ganador_equipo_id: equipoAzulId } });
  expect(res.status === 200 && Number(res.payload.data?.ganador_equipo_id) === Number(equipoAzulId), `El torneo debe finalizar solo con una seleccion ganadora registrada. Respuesta: ${JSON.stringify(res.payload)}`);

  res = await request("DELETE", `/api/equipos/${equipoAzulId}`, { token: adminToken });
  expect(res.status === 400, "No se debe eliminar la seleccion ganadora de un torneo finalizado.");

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
