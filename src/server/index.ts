import "dotenv/config";
import { buildApp } from "./app.js";
import { logger } from "../config/logger.js";

const app = buildApp();

const port = Number(process.env["PORT"] ?? 3000);
const host = process.env["HOST"] ?? "0.0.0.0";

app
  .listen({ port, host })
  .then(() => {
    logger.info({ host, port }, "Server listening");
  })
  .catch((err) => {
    logger.error({ err }, "Failed to start server");
    process.exit(1);
  });
