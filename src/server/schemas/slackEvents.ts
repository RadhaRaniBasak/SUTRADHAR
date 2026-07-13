import { z } from "zod";

export const SlackUrlVerificationSchema = z.object({
  token: z.string().optional(),
  type: z.literal("url_verification"),
  challenge: z.string(),
});

export const SlackEventSchema = z.object({
  type: z.string(),
  user: z.string().optional(),
  text: z.string().optional(),
  channel: z.string().optional(),
  ts: z.string().optional(),
  thread_ts: z.string().optional(),
  bot_id: z.string().optional(),
  subtype: z.string().optional(),
});

export const SlackEventCallbackSchema = z.object({
  token: z.string().optional(),
  team_id: z.string(),
  api_app_id: z.string().optional(),
  type: z.literal("event_callback"),
  event_id: z.string(),
  event_time: z.number(),
  event: SlackEventSchema,
  authorizations: z.array(z.any()).optional(),
});

export const SlackEventsEnvelopeSchema = z.union([
  SlackUrlVerificationSchema,
  SlackEventCallbackSchema,
]);

export type SlackEventsEnvelope = z.infer<typeof SlackEventsEnvelopeSchema>;
export type SlackEventCallback = z.infer<typeof SlackEventCallbackSchema>;
