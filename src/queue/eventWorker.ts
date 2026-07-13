import { Worker } from "bullmq";
import { logger } from "../config/logger.js";
import { QUEUE_NAME } from "./eventQueue.js";
import { redisConnection } from "./redisConnection.js";
import { fetchThreadContext, ThreadFetchError } from "../services/slack/threadContextCollector.js";
import { orchestrateThread } from "../services/orchestration/orchestrator.js";
import { slackClient } from "../services/slack/slackClient.js";
import type { SlackEventCallback } from "../server/schemas/slackEvents.js";
import type { ThreadContext } from "../types/slack.types.js";

function buildErrorBlocks(message: string) {
  return [{ type: "section", text: { type: "mrkdwn", text: message } }];
}

async function processSlackEvent(payload: SlackEventCallback): Promise<void> {
  const event = payload.event;

  if (!event.channel || !event.ts) return;

  try {
    const rawThreadContext = await fetchThreadContext({
      channelId: event.channel,
      threadTs: event.thread_ts ?? event.ts,
      triggeringEventId: payload.event_id,
      triggeringUserId: event.user ?? "",
    });

    const threadContext: ThreadContext = {
      ...rawThreadContext,
      messages: rawThreadContext.messages.map((m) => ({
        ...m,
        userId: m.userId ?? "",
      })),
    };

    const { blocks, fallbackText } = await orchestrateThread(threadContext);

    await slackClient.chat.postMessage({
      channel: event.channel,
      thread_ts: event.thread_ts ?? event.ts,
      text: fallbackText,
      blocks: blocks as any,
    });
  } catch (error) {
    if (error instanceof ThreadFetchError) {
      await slackClient.chat.postMessage({
        channel: event.channel,
        thread_ts: event.thread_ts ?? event.ts,
        text: "I couldn't read this thread. Make sure I'm invited to this channel.",
        blocks: buildErrorBlocks("I couldn't read this thread. Make sure I'm invited to this channel.") as any,
      });
      return;
    }
    throw error;
  }
}

export function startEventWorker(): Worker<SlackEventCallback> {
  return new Worker<SlackEventCallback>(
    QUEUE_NAME,
    async (job) => {
      await processSlackEvent(job.data);
    },
    {
      connection: redisConnection as any,
      concurrency: 4,
    },
  );
}

if (process.argv[1]?.includes("eventWorker")) {
  const worker = startEventWorker();
  worker.on("failed", (job, err) => {
    logger.error({ err, jobId: job?.id }, "Worker job failed");
  });
  logger.info("Slack event worker started");
}
