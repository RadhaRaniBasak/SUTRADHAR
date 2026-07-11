import { Worker, type Job } from "bullmq";
import type { KnownBlock } from "@slack/types";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { QUEUE_NAME, parseRedisConnectionOptions } from "../eventQueue.js";
import { fetchThreadContext, ThreadFetchError } from "./threadContextCollector.js";
import { slackClient } from "./slackClient.js";
import { orchestrateThread } from "../orchestration/orchestrator.js";
import { isAppMentionEvent, type SlackEventCallbackPayload } from "../../types/slack.types.js";

const WORKER_CONCURRENCY = 4;

async function postToThread(channel: string, threadTs: string, blocks: KnownBlock[], fallbackText: string): Promise<void> {
  await slackClient.chat.postMessage({
    channel,
    thread_ts: threadTs,
    blocks,
    text: fallbackText,
    unfurl_links: false,
  });
}

async function processMentionEvent(payload: SlackEventCallbackPayload): Promise<void> {
  if (!isAppMentionEvent(payload.event)) {
    return;
  }

  const { channel, user, ts } = payload.event;
  const threadTs = payload.event.thread_ts ?? ts;
  const jobLogger = logger.child({ eventId: payload.event_id, channel, threadTs });

  try {
    jobLogger.info("Fetching thread context");
    const threadContext = await fetchThreadContext({
      channelId: channel,
      threadTs,
      triggeringEventId: payload.event_id,
      triggeringUserId: user,
    });

    jobLogger.info({ messageCount: threadContext.messages.length }, "Running orchestration");
    const { blocks, fallbackText, outcomes } = await orchestrateThread(threadContext);

    await postToThread(channel, threadTs, blocks, fallbackText);
    jobLogger.info({ dispatched: outcomes.length }, "Posted dispatch result to thread");
  } catch (error) {
    if (error instanceof ThreadFetchError) {
      jobLogger.warn({ slackErrorCode: error.slackErrorCode }, "Failed to fetch thread context");
      await postToThread(
        channel,
        threadTs,
        buildErrorBlocks(`I couldn't read this thread (${error.slackErrorCode}). Make sure I'm invited to this channel.`),
        "I couldn't read this thread.",
      );
      return;
    }

    jobLogger.error({ err: error }, "Unhandled error processing mention event");
    await postToThread(
      channel,
      threadTs,
      buildErrorBlocks("something went wrong while processing this thread. This has been logged for investigation."),
      "Something went wrong while processing this thread.",
    );
  }
}

export function startEventWorker(): Worker<SlackEventCallbackPayload> {
  const worker = new Worker<SlackEventCallbackPayload>(
    QUEUE_NAME,
    async (job: Job<SlackEventCallbackPayload>) => {
      await processMentionEvent(job.data);
    },
    {
      connection: parseRedisConnectionOptions(env.REDIS_URL),
      concurrency: WORKER_CONCURRENCY,
    },
  );

  worker.on("failed", (job, error) => {
    logger.error({ err: error, jobId: job?.id, eventId: job?.data.event_id }, "Job failed after all retry attempts");
  });

  worker.on("error", (error) => {
    logger.error({ err: error }, "Worker-level error");
  });

  return worker;
}

async function main(): Promise<void> {
  const worker = startEventWorker();
  logger.info({ queue: QUEUE_NAME, concurrency: WORKER_CONCURRENCY }, "Event worker started");

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, "Shutting down event worker");
    try {
      await worker.close();
      process.exit(0);
    } catch (error) {
      logger.error({ err: error }, "Error during worker shutdown");
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("unhandledRejection", (reason) => {
    logger.error({ err: reason }, "Unhandled promise rejection in event worker");
  });
}

void main();

function buildErrorBlocks(arg0: string): KnownBlock[] {
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:warning: ${arg0}`,
      },
    },
  ];
}
