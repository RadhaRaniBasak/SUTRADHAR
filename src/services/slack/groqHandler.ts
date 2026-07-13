import { groqClient } from "../../integrations/groq/index.js";
import pino from "pino";
import type { GroqMessage } from "../../integrations/groq/types.js";

const logger = pino();

export async function handleGroqRequest(
  userMessage: string,
  conversationHistory: GroqMessage[] = []
): Promise<string | null> {
  try {
    const messages: GroqMessage[] = [
      ...conversationHistory,
      { role: "user", content: userMessage },
    ];

    logger.info({ userMessage }, "🚀 Starting Groq request");

    if (!groqClient.isConfigured()) {
      logger.error("❌ Groq API key not configured");
      return null;
    }

    logger.info("📤 Calling Groq API...");
    const response = await groqClient.chat(messages);
    
    logger.info(
      { tokensUsed: response.usage.total_tokens },
      "📥 Groq response received"
    );

    const reply = response.choices[0]?.message?.content;

    if (!reply) {
      logger.warn("⚠️ Groq returned empty response");
      return null;
    }

    logger.info(
      { replyLength: reply.length },
      "✅ Groq request successful"
    );
    
    return reply;
  } catch (error) {
    logger.error(
      { err: error instanceof Error ? error.message : String(error) },
      "❌ Groq request failed"
    );
    return null;
  }
}
