import { env } from "../../../config/env.js";

export const LLM_MAX_TOKENS = 4096;

export interface GroqTool {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters: Record<string, unknown>;
  };
}

interface GroqToolCall {
  id?: string;
  type?: string;
  function: {
    name: string;
    arguments?: string;
  };
}

interface GroqChatCompletionResponse {
  choices: Array<{
    finish_reason?: string;
    message: {
      tool_calls?: GroqToolCall[];
    };
  }>;
}

interface GroqCompletionInput {
  model: string;
  maxTokens: number;
  system: string;
  userMessage: string;
  tools: GroqTool[];
}

export async function createGroqChatCompletion(input: GroqCompletionInput): Promise<GroqChatCompletionResponse> {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: input.model,
      max_tokens: input.maxTokens,
      temperature: 0,
      messages: [
        { role: "system", content: input.system },
        { role: "user", content: input.userMessage },
      ],
      tools: input.tools,
      tool_choice: "auto",
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Groq completion failed (${response.status}): ${errorBody}`);
  }

  return (await response.json()) as GroqChatCompletionResponse;
}
