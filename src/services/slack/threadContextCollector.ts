import { ErrorCode, type WebAPIPlatformError } from "@slack/web-api";
import { slackClient } from "./slackClient.js";
import { logger } from "../../config/logger.js";
import type { NormalizedThreadMessage, ThreadContext } from "../../types/slack.types.js";

const MAX_PAGES = 10;
const PAGE_SIZE = 200;

type ConversationsRepliesResult = Awaited<ReturnType<typeof slackClient.conversations.replies>>;
type RawMessage = NonNullable<ConversationsRepliesResult["messages"]>[number] & { subtype?: string };

export class ThreadFetchError extends Error {
  constructor(
    message: string,
    public readonly slackErrorCode: string,
    public readonly channelId: string,
    public readonly threadTs: string,
  ) {
    super(message);
    this.name = "ThreadFetchError";
  }
}

function isWebAPIPlatformError(error: unknown): error is WebAPIPlatformError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === ErrorCode.PlatformError
  );
}

function hasTimestamp(message: RawMessage): message is RawMessage & { ts: string } {
  return typeof message.ts === "string" && message.ts.length > 0;
}

function normalizeMessage(message: RawMessage & { ts: string }): NormalizedThreadMessage {
  const isBot = Boolean(message.bot_id) || message.subtype === "bot_message";
  const userId = message.user ?? (message.bot_id ? `bot:${message.bot_id}` : "unknown");

  return {
    userId,
    text: message.text ?? "",
    timestamp: message.ts,
    isBot,
  };
}

export interface FetchThreadContextParams {
  channelId: string;
  threadTs: string;
  triggeringEventId: string;
  triggeringUserId: string;
}

export async function fetchThreadContext(params: FetchThreadContextParams): Promise<ThreadContext> {
  const { channelId, threadTs, triggeringEventId, triggeringUserId } = params;
  const rawMessages: RawMessage[] = [];
  let cursor: string | undefined;
  let pageCount = 0;

  do {
    let response: ConversationsRepliesResult;
    try {
      response = await slackClient.conversations.replies({
        channel: channelId,
        ts: threadTs,
        limit: PAGE_SIZE,
        inclusive: true,
        ...(cursor ? { cursor } : {}),
      });
    } catch (error) {
      if (isWebAPIPlatformError(error)) {
        throw new ThreadFetchError(
          `Slack rejected conversations.replies: ${error.data.error}`,
          error.data.error,
          channelId,
          threadTs,
        );
      }
      throw error;
    }

    rawMessages.push(...(response.messages ?? []));
    cursor = response.response_metadata?.next_cursor || undefined;
    pageCount += 1;

    if (pageCount >= MAX_PAGES && cursor) {
      logger.warn(
        { channelId, threadTs, pageCount, messageCount: rawMessages.length },
        "Thread pagination cap reached; truncating context",
      );
      break;
    }
  } while (cursor);

  const messages = rawMessages
    .filter(hasTimestamp)
    .map(normalizeMessage)
    .sort((a, b) => Number.parseFloat(a.timestamp) - Number.parseFloat(b.timestamp));

  return {
    channelId,
    threadTs,
    triggeringEventId,
    triggeringUserId,
    messages,
  };
}