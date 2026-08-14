import { closeDb, getDb, runMigrations } from "../src/db.mjs";

try {
  await runMigrations(await getDb());
  console.log("OK - esquema PostgreSQL aplicado correctamente.");
} finally {
  await closeDb();
}
