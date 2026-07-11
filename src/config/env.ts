
// Use require for dotenv to avoid TypeScript errors when @types/dotenv is not installed
/* eslint-disable @typescript-eslint/no-var-requires */
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const dotenv = require("dotenv");
  dotenv.config();
} catch (e) {
  // ignore if dotenv is not available in the environment
}

import { z } from "zod";
 
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),

  SLACK_SIGNING_SECRET: z.string().min(1, "SLACK_SIGNING_SECRET is required"),
  SLACK_BOT_TOKEN: z.string().startsWith("xoxb-"),
  SLACK_APP_TOKEN: z.string().startsWith("xapp-").optional(),
  SLACK_BOT_USER_ID: z.string().min(1),

  REDIS_URL: z.string().url(),

  LLM_PROVIDER: z.literal("anthropic").default("anthropic"),
  ANTHROPIC_API_KEY: z.string().min(1),
  LLM_MODEL: z.string().default("claude-sonnet-4-6"),

  JIRA_BASE_URL: z.string().url(),
  JIRA_EMAIL: z.string().email(),
  JIRA_API_TOKEN: z.string().min(1),
  JIRA_DEFAULT_PROJECT_KEY: z.string().min(1),

  LINEAR_API_KEY: z.string().min(1),
  LINEAR_DEFAULT_TEAM_ID: z.string().min(1),

  GITHUB_APP_ID: z.string().min(1),
  GITHUB_PRIVATE_KEY: z.string().min(1),
  GITHUB_INSTALLATION_ID: z.string().min(1),
  GITHUB_DEFAULT_OWNER: z.string().min(1),
  GITHUB_DEFAULT_REPO: z.string().min(1),
  GITHUB_TOKEN: z.string().optional(),

  NOTION_API_KEY: z.string().min(1),
  NOTION_DEFAULT_DATABASE_ID: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${formatted}`);
  }
  return result.data;
}

export const env = parseEnv();