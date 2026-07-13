import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { ThreadContext } from "../src/types/slack.types.js";

const upsertGithubFileMock = vi.fn();

vi.mock("../src/services/mcp/tools/upsertGithubFile.js", () => ({
  execute: upsertGithubFileMock,
}));

let orchestrateThread: (typeof import("../src/services/orchestration/orchestrator.js"))["orchestrateThread"];

beforeAll(async () => {
  ({ orchestrateThread } = await import("../src/services/orchestration/orchestrator.js"));
});

beforeEach(() => {
  upsertGithubFileMock.mockReset();
});

function threadWithMessage(text: string): ThreadContext {
  return {
    channelId: "C123",
    threadTs: "1234.56",
    triggeringEventId: "Ev123",
    triggeringUserId: "U123",
    messages: [{ userId: "U123", text, timestamp: "1234.56", isBot: false }],
  };
}

describe("orchestrateThread intent routing", () => {
  it("replies hello for greetings", async () => {
    const result = await orchestrateThread(threadWithMessage("<@Ubot> hii"));

    expect(result.fallbackText).toBe("Hello");
    expect(result.outcomes).toHaveLength(0);
  });

  it("creates a github file when asked", async () => {
    upsertGithubFileMock.mockResolvedValueOnce({
      path: "docs/hello.txt",
      url: "https://github.com/o/r/blob/main/docs/hello.txt",
      commitSha: "abc123",
    });

    const result = await orchestrateThread(
      threadWithMessage("create file docs/hello.txt in octo/demo with content hello world"),
    );

    expect(upsertGithubFileMock).toHaveBeenCalledWith({
      action: "create",
      owner: "octo",
      repo: "demo",
      path: "docs/hello.txt",
      content: "hello world",
      commitMessage: "create docs/hello.txt via Sutradhar bot",
    });
    expect(result.outcomes[0]?.ok).toBe(true);
  });

  it("asks for content when updating without content", async () => {
    const result = await orchestrateThread(threadWithMessage("update file docs/hello.txt in octo/demo"));

    expect(result.fallbackText).toContain("Please provide content");
    expect(upsertGithubFileMock).not.toHaveBeenCalled();
  });
});
