import type { KnownBlock } from "@slack/types";
import { execute as upsertGithubFile } from "../mcp/tools/upsertGithubFile.js";
import type { DispatchOutcome } from "../../types/domain.types.js";
import type { ThreadContext } from "../../types/slack.types.js";

interface OrchestrationResult {
  blocks: KnownBlock[];
  fallbackText: string;
  outcomes: DispatchOutcome[];
}

interface GithubFileCommand {
  action: "create" | "update";
  owner: string;
  repo: string;
  path: string;
  content?: string;
}

function buildBlocks(text: string): KnownBlock[] {
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text,
      },
    },
  ];
}

function normalizeInput(text: string): string {
  return text.replace(/<@[^>]+>/g, "").trim().replace(/\s+/g, " ");
}

function getTriggeringMessage(threadContext: ThreadContext): string {
  const triggeringUserMessages = threadContext.messages
    .filter((message) => !message.isBot && message.userId === threadContext.triggeringUserId)
    .sort((a, b) => Number.parseFloat(a.timestamp) - Number.parseFloat(b.timestamp));

  if (triggeringUserMessages.length > 0) {
    return triggeringUserMessages[triggeringUserMessages.length - 1].text;
  }

  const lastNonBotMessage = threadContext.messages
    .filter((message) => !message.isBot)
    .sort((a, b) => Number.parseFloat(a.timestamp) - Number.parseFloat(b.timestamp))
    .at(-1);
  return lastNonBotMessage?.text ?? "";
}

function isGreeting(text: string): boolean {
  return /^(hi+|hello|hey)\b[!. ]*$/i.test(text);
}

function stripWrappingQuotes(value: string): string {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  if (trimmed.startsWith("`") && trimmed.endsWith("`")) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseGithubFileCommand(text: string): GithubFileCommand | null {
  const createRegex =
    /^(?:create|add)\s+(?:a\s+)?file\s+(.+?)\s+(?:in|into)\s+([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(?:\s+with\s+content\s+([\s\S]+))?$/i;
  const updateRegex =
    /^(?:update|change|modify|edit)\s+(?:a\s+)?file\s+(.+?)\s+(?:in|of)\s+([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(?:\s+with\s+content\s+([\s\S]+))?$/i;

  const createMatch = text.match(createRegex);
  if (createMatch) {
    const [, rawPath, owner, repo, rawContent] = createMatch;
    return {
      action: "create",
      owner,
      repo,
      path: stripWrappingQuotes(rawPath),
      ...(rawContent ? { content: stripWrappingQuotes(rawContent) } : {}),
    };
  }

  const updateMatch = text.match(updateRegex);
  if (updateMatch) {
    const [, rawPath, owner, repo, rawContent] = updateMatch;
    return {
      action: "update",
      owner,
      repo,
      path: stripWrappingQuotes(rawPath),
      ...(rawContent ? { content: stripWrappingQuotes(rawContent) } : {}),
    };
  }

  return null;
}

export async function orchestrateThread(threadContext: ThreadContext): Promise<OrchestrationResult> {
  const input = normalizeInput(getTriggeringMessage(threadContext));

  if (!input) {
    return {
      blocks: buildBlocks("I couldn't find a message to process."),
      fallbackText: "I couldn't find a message to process.",
      outcomes: [],
    };
  }

  if (isGreeting(input)) {
    return {
      blocks: buildBlocks("Hello"),
      fallbackText: "Hello",
      outcomes: [],
    };
  }

  const fileCommand = parseGithubFileCommand(input);
  if (!fileCommand) {
    const helpText =
      "I can reply to greetings and manage GitHub files.\nTry:\n• create file docs/notes.txt in owner/repo with content hello\n• update file docs/notes.txt in owner/repo with content updated text";
    return {
      blocks: buildBlocks(helpText),
      fallbackText: helpText,
      outcomes: [],
    };
  }

  if (fileCommand.action === "update" && !fileCommand.content) {
    const text = `Please provide content to update \`${fileCommand.path}\` in \`${fileCommand.owner}/${fileCommand.repo}\`.`;
    return {
      blocks: buildBlocks(text),
      fallbackText: text,
      outcomes: [],
    };
  }

  try {
    const result = await upsertGithubFile({
      action: fileCommand.action,
      owner: fileCommand.owner,
      repo: fileCommand.repo,
      path: fileCommand.path,
      content: fileCommand.content ?? "",
      commitMessage: `${fileCommand.action} ${fileCommand.path} via Sutradhar bot`,
    });

    const outcome: DispatchOutcome = {
      toolName: "upsertGithubFile",
      provider: "github",
      ok: true,
      title: `${fileCommand.action} file ${fileCommand.path}`,
      ...(result.url ? { url: result.url } : {}),
      ...(result.commitSha ? { identifier: result.commitSha } : {}),
    };

    const text = `Done. ${fileCommand.action === "create" ? "Created" : "Updated"} \`${fileCommand.path}\` in \`${fileCommand.owner}/${fileCommand.repo}\`.`;
    return {
      blocks: buildBlocks(text),
      fallbackText: text,
      outcomes: [outcome],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error while writing GitHub file";
    const outcome: DispatchOutcome = {
      toolName: "upsertGithubFile",
      provider: "github",
      ok: false,
      title: `${fileCommand.action} file ${fileCommand.path}`,
      errorMessage: message,
    };
    const text = `I couldn't ${fileCommand.action} \`${fileCommand.path}\` in \`${fileCommand.owner}/${fileCommand.repo}\`: ${message}`;
    return {
      blocks: buildBlocks(text),
      fallbackText: text,
      outcomes: [outcome],
    };
  }
}
