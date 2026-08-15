import fs from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";
import { config } from "./config.mjs";

let db;

async function createPool() {
  if (config.databaseUrl.startsWith("pg-mem://")) {
    const { newDb } = await import("pg-mem");
    const memoryDb = newDb();
    const { Pool: MemoryPool } = memoryDb.adapters.createPg();
    return new MemoryPool();
  }

  if (!config.databaseUrl) {
    throw new Error("DATABASE_URL es obligatoria para conectar PostgreSQL.");
  }

  return new Pool({
    connectionString: config.databaseUrl,
    max: config.pgPoolMax,
    ssl: config.databaseUrl.includes("localhost") ? false : { rejectUnauthorized: false }
  });
}

export async function getDb() {
  if (!db) db = await createPool();
  return db;
}

export async function runMigrations(connection) {
  const activeConnection = connection ?? await getDb();
  const migrationsDirectory = path.join(config.rootDir, "database", "migrations");
  const migrationFiles = (await fs.readdir(migrationsDirectory)).filter((file) => file.endsWith(".sql")).sort();
  for (const file of migrationFiles) {
    const migration = await fs.readFile(path.join(migrationsDirectory, file), "utf8");
    await activeConnection.query(migration);
  }
}

export async function closeDb() {
  if (!db) return;
  await db.end();
  db = undefined;
}

export function rowToUser(row) {
  if (!row) return null;
  const { password_hash, ...safe } = row;
  return safe;
}
