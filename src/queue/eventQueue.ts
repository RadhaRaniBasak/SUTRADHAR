import { Queue } from "bullmq";
import type { SlackEventCallback } from "../server/schemas/slackEvents.js";
import { redisConnection } from "./redisConnection.js";
import { logger } from "../config/logger.js";

export const eventQueue = new Queue<SlackEventCallback>("slack-events", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: 500,
    removeOnFail: 1000,
  },
});

const MAX_QUEUE_DEPTH = 2000;

export async function enqueueSlackEvent(payload: SlackEventCallback): Promise<void> {
  const counts = await eventQueue.getJobCounts("waiting", "active", "delayed");
  const depth = (counts.waiting ?? 0) + (counts.active ?? 0) + (counts.delayed ?? 0);

  if (depth > MAX_QUEUE_DEPTH) {
    logger.warn({ depth, eventId: payload.event_id }, "Dropping Slack event due to backpressure");
    return;
  }

  await eventQueue.add("event_callback", payload, {
    jobId: payload.event_id,
  });
}
