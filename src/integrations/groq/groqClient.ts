import { env } from "../../config/env.js";
import pino from "pino";
import type { GroqMessage, GroqChatResponse } from "./types.js";

const logger = pino();

class GroqClient {
  private apiKey: string;
  private baseURL = "https://api.groq.com/openai/v1";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.length > 0;
  }

  async chat(messages: GroqMessage[]): Promise<GroqChatResponse> {
    if (!this.isConfigured()) {
      throw new Error("Groq API key not configured");
    }

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages,
          temperature: 0.7,
          max_tokens: 1024,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        logger.error({ status: response.status, error }, "Groq API error");
        throw new Error(`Groq API error: ${response.status} ${error}`);
      }

      const data = (await response.json()) as GroqChatResponse;
      return data;
    } catch (error) {
      logger.error({ error }, "Failed to call Groq API");
      throw error;
    }
  }
}

export const groqClient = new GroqClient(env.GROQ_API_KEY || "");
