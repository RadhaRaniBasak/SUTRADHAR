import "dotenv/config";
import { z } from "zod";

const boolFromEnv = z
  .string()
  .optional()
  .transform((v) => (v ?? "false").toLowerCase() === "true");

const baseSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.string().default("info"),
  LLM_MODEL: z.string().default("llama-3.3-70b-versatile"),

  REDIS_URL: z.string().min(1, "REDIS_URL is required"),
  ENABLE_SLACK: boolFromEnv.default("false"),
  ENABLE_GROQ: boolFromEnv.default("false"),
  ENABLE_JIRA: boolFromEnv.default("false"),
  ENABLE_LINEAR: boolFromEnv.default("false"),
  ENABLE_GITHUB: boolFromEnv.default("false"),
  ENABLE_NOTION: boolFromEnv.default("false"),

  SLACK_SIGNING_SECRET: z.string().optional(),
  SLACK_BOT_TOKEN: z.string().optional(),
  SLACK_BOT_USER_ID: z.string().optional(),

  GROQ_API_KEY: z.string().optional(),

  JIRA_BASE_URL: z.string().optional(),
  JIRA_EMAIL: z.string().optional(),
  JIRA_API_TOKEN: z.string().optional(),
  JIRA_DEFAULT_PROJECT_KEY: z.string().optional(),

  LINEAR_API_KEY: z.string().optional(),
  LINEAR_DEFAULT_TEAM_ID: z.string().optional(),

  GITHUB_APP_ID: z.string().optional(),
  GITHUB_PRIVATE_KEY: z.string().optional(),
  GITHUB_INSTALLATION_ID: z.string().optional(),
  GITHUB_DEFAULT_OWNER: z.string().optional(),
  GITHUB_DEFAULT_REPO: z.string().optional(),

  NOTION_API_KEY: z.string().optional(),
  NOTION_DEFAULT_DATABASE_ID: z.string().optional(),
});

function requireWhenEnabled(
  enabled: boolean,
  fields: Array<[key: string, value: string | undefined]>,
  errors: string[],
  label: string
) {
  if (!enabled) return;
  for (const [key, value] of fields) {
    if (!value || !String(value).trim()) {
      errors.push(`${key}: Required when ${label}=true`);
    }
  }
}

export function parseEnv() {
  const parsed = baseSchema.safeParse(process.env);

  if (!parsed.success) {
    const formatted = parsed.error.issues
      .map((i) => `- ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${formatted}`);
  }

  const env = parsed.data;
  const conditionalErrors: string[] = [];

  requireWhenEnabled(
    env.ENABLE_SLACK,
    [
      ["SLACK_SIGNING_SECRET", env.SLACK_SIGNING_SECRET],
      ["SLACK_BOT_TOKEN", env.SLACK_BOT_TOKEN],
      ["SLACK_BOT_USER_ID", env.SLACK_BOT_USER_ID],
    ],
    conditionalErrors,
    "ENABLE_SLACK"
  );

  requireWhenEnabled(
    env.ENABLE_GROQ,
    [["GROQ_API_KEY", env.GROQ_API_KEY]],
    conditionalErrors,
    "ENABLE_GROQ"
  );

  requireWhenEnabled(
    env.ENABLE_JIRA,
    [
      ["JIRA_BASE_URL", env.JIRA_BASE_URL],
      ["JIRA_EMAIL", env.JIRA_EMAIL],
      ["JIRA_API_TOKEN", env.JIRA_API_TOKEN],
      ["JIRA_DEFAULT_PROJECT_KEY", env.JIRA_DEFAULT_PROJECT_KEY],
    ],
    conditionalErrors,
    "ENABLE_JIRA"
  );

  requireWhenEnabled(
    env.ENABLE_LINEAR,
    [
      ["LINEAR_API_KEY", env.LINEAR_API_KEY],
      ["LINEAR_DEFAULT_TEAM_ID", env.LINEAR_DEFAULT_TEAM_ID],
    ],
    conditionalErrors,
    "ENABLE_LINEAR"
  );

  requireWhenEnabled(
    env.ENABLE_GITHUB,
    [
      ["GITHUB_APP_ID", env.GITHUB_APP_ID],
      ["GITHUB_PRIVATE_KEY", env.GITHUB_PRIVATE_KEY],
      ["GITHUB_INSTALLATION_ID", env.GITHUB_INSTALLATION_ID],
      ["GITHUB_DEFAULT_OWNER", env.GITHUB_DEFAULT_OWNER],
      ["GITHUB_DEFAULT_REPO", env.GITHUB_DEFAULT_REPO],
    ],
    conditionalErrors,
    "ENABLE_GITHUB"
  );

  requireWhenEnabled(
    env.ENABLE_NOTION,
    [
      ["NOTION_API_KEY", env.NOTION_API_KEY],
      ["NOTION_DEFAULT_DATABASE_ID", env.NOTION_DEFAULT_DATABASE_ID],
    ],
    conditionalErrors,
    "ENABLE_NOTION"
  );

  if (conditionalErrors.length) {
    throw new Error(
      `Invalid environment configuration:\n${conditionalErrors
        .map((e) => `- ${e}`)
        .join("\n")}`
    );
  }

  return env;
}

export const env = parseEnv();