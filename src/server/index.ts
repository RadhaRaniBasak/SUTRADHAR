import { buildApp } from "./app.js";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { closeEventQueue } from "../queue/eventQueue.js";

async function main(): Promise<void> {
  const app = buildApp();

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, "Shutting down");
    try {
      await app.close();
      await closeEventQueue();
      logger.info("Shutdown complete");
      process.exit(0);
    } catch (error) {
      logger.error({ err: error }, "Error during shutdown");
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("unhandledRejection", (reason) => {
    logger.error({ err: reason }, "Unhandled promise rejection");
  });

  try {
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
    logger.info({ port: env.PORT, env: env.NODE_ENV }, "Meeting-to-Action bridge listening");
  } catch (error) {
    logger.error({ err: error }, "Failed to start server");
    process.exit(1);
  }
}

void main();