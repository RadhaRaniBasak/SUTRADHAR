import { Queue, type RedisOptions } from "bullmq";
import { env } from "../config/env.js";
import type { SlackEventCallbackPayload } from "../types/slack.types.js";

export const QUEUE_NAME = "slack-mention-events";
const JOB_NAME = "process-mention";

export function parseRedisConnectionOptions(redisUrl: string): RedisOptions {
  const parsed = new URL(redisUrl);
  const options: RedisOptions = {
    host: parsed.hostname,
    port: parsed.port ? Number.parseInt(parsed.port, 10) : 6379,
    maxRetriesPerRequest: null,
  };
  if (parsed.password) {
    options.password = parsed.password;
  }
  if (parsed.protocol === "rediss:") {
    options.tls = {};
  }
  return options;
}

export const eventQueue = new Queue<SlackEventCallbackPayload, void, typeof JOB_NAME>(QUEUE_NAME, {
  connection: parseRedisConnectionOptions(env.REDIS_URL),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { age: 60 * 60 * 24, count: 1000 },
    removeOnFail: { age: 60 * 60 * 24 * 7 },
  },
});

export async function enqueueSlackEvent(payload: SlackEventCallbackPayload): Promise<void> {
  await eventQueue.add(JOB_NAME, payload, {
    jobId: payload.event_id,
  });
}

export async function closeEventQueue(): Promise<void> {
  await eventQueue.close();
}