import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { config } from "./config.mjs";

let db;

export function getDb() {
  if (db) return db;
  fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });
  db = new DatabaseSync(config.dbPath);
  db.exec("PRAGMA foreign_keys = ON;");
  const migration = fs.readFileSync(
    path.join(config.rootDir, "database", "migrations", "001_init.sql"),
    "utf8"
  );
  db.exec(migration);
  return db;
}

export function rowToUser(row) {
  if (!row) return null;
  const { password_hash, ...safe } = row;
  return safe;
}
