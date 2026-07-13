import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { logger } from "../../config/logger.js";
import { SlackEventsEnvelopeSchema, SlackEventCallbackSchema } from "../schemas/slackEvents.js";
import { enqueueSlackEvent } from "../../queue/eventQueue.js";

function parseJson(rawBody: string): unknown {
  try {
    return JSON.parse(rawBody);
  } catch {
    return null;
  }
}

async function handleSlackEvents(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const parsed = parseJson(request.rawBody);
  const envelopeResult = SlackEventsEnvelopeSchema.safeParse(parsed);

  if (!envelopeResult.success) {
    logger.warn({ issues: envelopeResult.error.issues }, "Invalid Slack event payload");
    reply.status(400).send({ ok: false, error: "invalid_payload" });
    return;
  }

  const payload = envelopeResult.data;

  if (payload.type === "url_verification") {
    reply.status(200).send({ challenge: payload.challenge });
    return;
  }

  const callbackResult = SlackEventCallbackSchema.safeParse(payload);
  if (!callbackResult.success) {
    reply.status(400).send({ ok: false, error: "invalid_event_callback" });
    return;
  }

  const callback = callbackResult.data;
  await enqueueSlackEvent(callback);

  reply.status(200).send({ ok: true });
}

export function registerSlackEventsRoute(app: FastifyInstance): void {
  app.post("/slack/events", handleSlackEvents);
}
