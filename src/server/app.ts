import Fastify, { type FastifyError, type FastifyInstance } from "fastify";
import { logger } from "../config/logger.js";
import { registerSlackEventsRoute } from "./routes/slackEvents.js";

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: false,
    trustProxy: true,
    bodyLimit: 1024 * 1024,
  });

  app.addContentTypeParser("application/json", { parseAs: "string" }, (request, body, done) => {
    request.rawBody = body as string;
    try {
      done(null, body.length > 0 ? JSON.parse(body as string) : {});
    } catch (error) {
      done(error as Error, undefined);
    }
  });

  app.get("/healthz", async () => ({ status: "ok" }));

  registerSlackEventsRoute(app);

  app.setErrorHandler((error: FastifyError, request, reply) => {
    logger.error({ err: error, path: request.url }, "Unhandled request error");
    const statusCode = error.statusCode ?? 500;
    reply.code(statusCode).send({ error: statusCode === 500 ? "Internal server error" : error.message });
  });

  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send({ error: `Route ${request.method} ${request.url} not found` });
  });

  return app;
}