import { z } from "zod";
import { withRetry } from "../../utils/retry.js";
import { ExternalApiError, isTransientStatus } from "../../utils/http.js";
import { env } from "../../config/env.js";

const GroqMessageSchema = z.object({
  role: z.string(),
  content: z.string().nullable().optional(),
});

const GroqChoiceSchema = z.object({
  index: z.number().optional(),
  message: GroqMessageSchema,
  finish_reason: z.string().nullable().optional(),
});

const GroqResponseSchema = z.object({
  id: z.string().optional(),
  object: z.string().optional(),
  created: z.number().optional(),
  model: z.string().optional(),
  choices: z.array(GroqChoiceSchema).min(1),
  usage: z
    .object({
      prompt_tokens: z.number().optional(),
      completion_tokens: z.number().optional(),
      total_tokens: z.number().optional(),
    })
    .optional(),
});

export type GroqChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
};

export type GroqChatParams = {
  model: string;
  messages: GroqChatMessage[];
  temperature?: number;
  max_tokens?: number;
};

export type GroqChatResult = z.infer<typeof GroqResponseSchema>;

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const TIMEOUT_MS = 12000;

function isConfigured(): boolean {
  return Boolean(env.GROQ_API_KEY && env.GROQ_API_KEY.trim().length > 0);
}

export async function createGroqChatCompletion(params: GroqChatParams): Promise<GroqChatResult> {
  if (!isConfigured()) {
    throw new ExternalApiError({
      provider: "groq",
      message: "GROQ_API_KEY is not configured",
      retryable: false,
    });
  }

  return withRetry(
    async (attempt) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

      try {
        const res = await fetch(GROQ_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(params),
          signal: controller.signal,
        });

        const requestId = res.headers.get("x-request-id") ?? undefined;
        const text = await res.text();
        let parsed: unknown = {};
        try {
          parsed = text ? JSON.parse(text) : {};
        } catch {
          parsed = { raw: text };
        }

        if (!res.ok) {
          throw new ExternalApiError({
            provider: "groq",
            message: `Groq error status=${res.status} attempt=${attempt}`,
            statusCode: res.status,
            retryable: isTransientStatus(res.status),
            requestId,
          });
        }

        return GroqResponseSchema.parse(parsed);
      } catch (error) {
        if (error instanceof ExternalApiError) throw error;

        const isAbort = error instanceof Error && error.name === "AbortError";
        throw new ExternalApiError({
          provider: "groq",
          message: isAbort ? "Groq request timed out" : "Groq request failed",
          retryable: true,
          cause: error,
        });
      } finally {
        clearTimeout(timeout);
      }
    },
    {
      maxAttempts: 3,
      baseDelayMs: 300,
      maxDelayMs: 2500,
      jitterRatio: 0.25,
      shouldRetry: (error) => error instanceof ExternalApiError && error.retryable,
    },
  );
}

export const groqClient = {
  chat: createGroqChatCompletion,
  isConfigured,
};
