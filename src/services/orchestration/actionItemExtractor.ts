import type Anthropic from "@anthropic-ai/sdk";
import { anthropic, LLM_MAX_TOKENS } from "./llm/anthropicClient.js";
import { getMcpClient } from "../mcp/inProcessClient.js";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import type { ThreadContext } from "../../types/slack.types.js";

export interface PlannedToolCall {
  id: string;
  toolName: string;
  arguments: Record<string, unknown>;
}

function isToolUseBlock(block: Anthropic.ContentBlock): block is Anthropic.ToolUseBlock {
  return block.type === "tool_use";
}

function formatThreadForPrompt(threadContext: ThreadContext): string {
  return threadContext.messages
    .filter((message) => !message.isBot)
    .map((message) => `[${message.userId} @ ${message.timestamp}] ${message.text}`)
    .join("\n");
}

function buildSystemPrompt(): string {
  return [
    "You are the extraction and dispatch-planning layer of an engineering assistant that turns Slack thread",
    "discussions into tracked work. Read the thread and identify distinct, concrete action items: specific",
    "pieces of work someone should do. Ignore greetings, acknowledgements, and general discussion that isn't",
    "a task. Do not invent action items that weren't actually discussed.",
    "",
    "For EACH distinct action item you find, call these three tools once per item, adapting the same",
    "underlying content to each platform's conventions (concise title, fuller description):",
    `- create_jira_issue with projectKey "${env.JIRA_DEFAULT_PROJECT_KEY}" and a sensible issueType such as "Task" or "Bug"`,
    `- create_linear_issue with teamId "${env.LINEAR_DEFAULT_TEAM_ID}"`,
    `- create_github_issue with owner "${env.GITHUB_DEFAULT_OWNER}" and repo "${env.GITHUB_DEFAULT_REPO}"`,
    "",
    "Then call insert_notion_document EXACTLY ONCE for the entire thread, not once per item, with",
    `databaseId "${env.NOTION_DEFAULT_DATABASE_ID}", a pageTitle summarizing what the thread was about, and`,
    "contentBlocks containing one paragraph per action item you identified (skip it if you found none).",
    "",
    "If the thread contains no concrete action items, call no tools at all.",
  ].join("\n");
}

export async function extractAndPlanDispatch(threadContext: ThreadContext): Promise<PlannedToolCall[]> {
  const threadText = formatThreadForPrompt(threadContext);
  if (threadText.trim().length === 0) {
    logger.info({ threadTs: threadContext.threadTs }, "Thread has no non-bot messages; skipping LLM call");
    return [];
  }

  const mcpClient = await getMcpClient();
  const { tools } = await mcpClient.listTools();

  const anthropicTools: Anthropic.Tool[] = tools.map((tool) => ({
    name: tool.name,
    description: tool.description ?? "",
    input_schema: tool.inputSchema as Anthropic.Tool.InputSchema,
  }));

  const response = await anthropic.messages.create({
    model: env.LLM_MODEL,
    max_tokens: LLM_MAX_TOKENS,
    system: buildSystemPrompt(),
    tools: anthropicTools,
    tool_choice: { type: "auto" },
    messages: [{ role: "user", content: `Here is the Slack thread:\n\n${threadText}` }],
  });

  const plannedCalls = response.content.filter(isToolUseBlock).map((block) => ({
    id: block.id,
    toolName: block.name,
    arguments: (block.input ?? {}) as Record<string, unknown>,
  }));

  logger.info(
    { threadTs: threadContext.threadTs, plannedCallCount: plannedCalls.length, stopReason: response.stop_reason },
    "LLM planned tool dispatches",
  );

  return plannedCalls;
}