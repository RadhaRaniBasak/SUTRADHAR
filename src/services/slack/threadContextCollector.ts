import { slackClient } from "./slackClient.js";
import { logger } from "../../config/logger.js";

const PAGE_SIZE = 100;
const MAX_PAGES = 4;
const TARGET_HUMAN_MESSAGES = 25;

export class ThreadFetchError extends Error {}

export async function fetchThreadContext(params: {
  channelId: string;
  threadTs: string;
  triggeringEventId: string;
  triggeringUserId?: string;
}) {
  const messages: Array<{ userId?: string; text: string; timestamp: string; isBot: boolean }> = [];
  let cursor: string | undefined = undefined;

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const res = await slackClient.conversations.replies({
      channel: params.channelId,
      ts: params.threadTs,
      cursor,
      limit: PAGE_SIZE,
      inclusive: true,
    });

    const chunk = (res.messages ?? []).map((m) => ({
      userId: m.user,
      text: m.text ?? "",
      timestamp: m.ts ?? "",
      isBot: Boolean(m.bot_id),
    }));

    messages.push(...chunk);

    const humanCount = messages.filter((m) => !m.isBot && m.text.trim().length > 0).length;
    if (humanCount >= TARGET_HUMAN_MESSAGES) break;

    cursor = res.response_metadata?.next_cursor || undefined;
    if (!cursor) break;
  }

  logger.info(
    {
      channelId: params.channelId,
      threadTs: params.threadTs,
      fetchedMessages: messages.length,
    },
    "Fetched thread context",
  );

  return {
    channelId: params.channelId,
    threadTs: params.threadTs,
    triggeringEventId: params.triggeringEventId,
    triggeringUserId: params.triggeringUserId ?? "",
    messages,
  };
}
