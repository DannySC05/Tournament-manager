import { createApp } from "./app.mjs";
import { config } from "./config.mjs";

const server = createApp();

server.listen(config.port, () => {
  console.log(`Torneos API escuchando en http://localhost:${config.port}`);
});
