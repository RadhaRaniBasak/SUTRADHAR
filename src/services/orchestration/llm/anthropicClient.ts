import Anthropic from "@anthropic-ai/sdk";
import { env } from "../../../config/env.js";

export const anthropic = new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY,
  maxRetries: 3,
  timeout: 60_000,
});

export const LLM_MAX_TOKENS = 4096;