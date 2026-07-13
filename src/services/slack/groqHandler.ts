import { createGroqChatCompletion } from "../../integrations/groq/groqClient.js";
import { logger } from "../../config/logger.js";

export type GroqHandlerResult =
  | { ok: true; text: string }
  | { ok: false; reason: string };

export async function handleGroqRequest(messages: Array<{ role: "system" | "user" | "assistant"; content: string }>): Promise<GroqHandlerResult> {
  try {
    const response = await createGroqChatCompletion({
      model: "llama-3.1-8b-instant",
      messages,
      temperature: 0.2,
    });

    const text = response.choices[0]?.message?.content?.trim() ?? "";
    if (!text) {
      return { ok: false, reason: "empty_completion" };
    }

    return { ok: true, text };
  } catch (error) {
    logger.error(
      {
        err: error,
        provider: "groq",
      },
      "Groq request failed",
    );
    return { ok: false, reason: "groq_error" };
  }
}
