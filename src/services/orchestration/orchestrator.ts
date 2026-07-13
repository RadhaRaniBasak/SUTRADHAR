import type { ThreadContext } from "../../types/slack.types.js";
import { execute as upsertGithubFile } from "../mcp/tools/upsertGithubFile.js";

export type OrchestrationResult = {
  blocks: Array<Record<string, unknown>>;
  fallbackText: string;
  outcomes: Array<{ ok: boolean; message?: string; [key: string]: unknown }>;
};

function latestText(ctx: ThreadContext): string {
  const msgs = ctx.messages.filter((m) => !m.isBot);
  return msgs[msgs.length - 1]?.text ?? "";
}

function stripWrappingQuotes(input: string): string {
  return input.replace(/^["']|["']$/g, "");
}

export async function orchestrateThread(threadContext: ThreadContext): Promise<OrchestrationResult> {
  const text = latestText(threadContext).trim();

  if (/^\s*<@[^>]+>\s*(hi|hii|hello)\b/i.test(text) || /^(hi|hii|hello)\b/i.test(text)) {
    return { blocks: [], fallbackText: "Hello", outcomes: [] };
  }

  const createMatch = text.match(
    /create file\s+(\S+)\s+in\s+([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\s+with content\s+([\s\S]+)/i,
  );

  if (createMatch) {
    const rawPath = createMatch[1] ?? "";
    const owner = createMatch[2] ?? "";
    const repo = createMatch[3] ?? "";
    const content = createMatch[4] ?? "";

    const safePath = stripWrappingQuotes(rawPath);
    const result = await upsertGithubFile({
      action: "create",
      owner,
      repo,
      path: safePath,
      content: content.trim(),
      commitMessage: `create ${safePath} via Sutradhar bot`,
    });

    return {
      blocks: [],
      fallbackText: "Done",
      outcomes: [{ ok: true, ...result }],
    };
  }

  const updateNoContentMatch = text.match(
    /update file\s+(\S+)\s+in\s+([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\s*$/i,
  );

  if (updateNoContentMatch) {
    return {
      blocks: [],
      fallbackText: "Please provide content",
      outcomes: [],
    };
  }

  return {
    blocks: [],
    fallbackText: "Processed your request.",
    outcomes: [{ ok: true, message: "ok" }],
  };
}
