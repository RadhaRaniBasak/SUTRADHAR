export interface SlackUrlVerificationPayload {
  type: "url_verification";
  token: string;
  challenge: string;
}

export interface SlackAppMentionEvent {
  type: "app_mention";
  user: string;
  text: string;
  ts: string;
  channel: string;
  thread_ts?: string;
  event_ts: string;
}

export interface SlackGenericEvent {
  type: string;
  [key: string]: unknown;
}

export type SlackInnerEvent = SlackAppMentionEvent | SlackGenericEvent;

export interface SlackEventCallbackPayload {
  type: "event_callback";
  token: string;
  team_id: string;
  api_app_id: string;
  event: SlackInnerEvent;
  event_id: string;
  event_time: number;
  event_context?: string;
  authorizations?: Array<{
    enterprise_id: string | null;
    team_id: string;
    user_id: string;
    is_bot: boolean;
  }>;
}

export type SlackEventsApiPayload = SlackUrlVerificationPayload | SlackEventCallbackPayload;

export function isAppMentionEvent(event: SlackInnerEvent): event is SlackAppMentionEvent {
  return event.type === "app_mention";
}

export interface NormalizedThreadMessage {
  userId: string;
  text: string;
  timestamp: string;
  isBot: boolean;
}

export interface ThreadContext {
  channelId: string;
  threadTs: string;
  triggeringEventId: string;
  triggeringUserId: string;
  messages: NormalizedThreadMessage[];
}