import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { verifySlackSignature } from "../middleware/verifySlackSignature.js";
import { enqueueSlackEvent } from "../../queue/eventQueue.js";
import { isAppMentionEvent, type SlackEventsApiPayload } from "../../types/slack.types.js";

function parseRawBody(rawBody: string): SlackEventsApiPayload {
  try {
    return JSON.parse(rawBody) as SlackEventsApiPayload;
  } catch {
    throw new Error("Request body is not valid JSON");
  }
}

async function handleSlackEvent(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const payload = parseRawBody(request.rawBody);

  if (payload.type === "url_verification") {
    await reply.code(200).send({ challenge: payload.challenge });
    return;
  }

  if (payload.type !== "event_callback") {
    logger.warn({ payloadType: (payload as { type?: string }).type }, "Unrecognized Slack payload type");
    await reply.code(200).send({ ok: true });
    return;
  }

  const retryNum = request.headers["x-slack-retry-num"];
  const retryReason = request.headers["x-slack-retry-reason"];
  if (retryNum !== undefined) {
    logger.info({ eventId: payload.event_id, retryNum, retryReason }, "Received Slack retry delivery");
  }

  await reply.code(200).send({ ok: true });

  if (!isAppMentionEvent(payload.event)) {
    return;
  }

  if (payload.event.user === env.SLACK_BOT_USER_ID) {
    return;
  }

  try {
    await enqueueSlackEvent(payload);
    logger.info(
      { eventId: payload.event_id, channel: payload.event.channel, thread: payload.event.thread_ts ?? payload.event.ts },
      "Enqueued mention event for processing",
    );
  } catch (error) {
    logger.error({ err: error, eventId: payload.event_id }, "Failed to enqueue Slack event");
  }
}

export function registerSlackEventsRoute(app: FastifyInstance): void {
  app.post(
    "/slack/events",
    { preHandler: verifySlackSignature },
    async (request: FastifyRequest, reply: FastifyReply) => {
      await handleSlackEvent(request, reply);
    },
  );
}