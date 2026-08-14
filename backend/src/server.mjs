import { createApp } from "./app.mjs";
import { config } from "./config.mjs";
import { getDb, runMigrations } from "./db.mjs";

await runMigrations(await getDb());
const server = createApp();

server.listen(config.port, () => {
  console.log(`Torneos API escuchando en http://localhost:${config.port}`);
});
