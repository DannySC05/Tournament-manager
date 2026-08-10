import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const config = {
  rootDir,
  port: Number(process.env.PORT ?? 3000),
  dbPath: process.env.DB_PATH ?? path.join(rootDir, "database", "torneos.sqlite"),
  jwtSecret: process.env.JWT_SECRET ?? "cambie-este-secreto-en-produccion",
  jwtExpiresInSeconds: Number(process.env.JWT_EXPIRES_SECONDS ?? 60 * 60 * 8)
};

export const ROLES = Object.freeze({
  ADMIN: "ADMIN",
  CONSULTA: "CONSULTA"
});

export const ESTADOS_PARTIDO = Object.freeze(["PROGRAMADO", "EN_JUEGO", "FINALIZADO"]);
export const ESTADOS_TORNEO = Object.freeze(["BORRADOR", "EN_CURSO", "FINALIZADO"]);
export const FORMATOS_TORNEO = Object.freeze(["LIGA", "ELIMINACION", "MIXTO"]);
