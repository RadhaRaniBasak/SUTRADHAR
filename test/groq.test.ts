import { describe, it, expect } from "vitest";
import { groqClient } from "../src/integrations/groq/groqClient.js";

describe("groq client shape", () => {
  it("exposes required methods", () => {
    expect(typeof groqClient.chat).toBe("function");
    expect(typeof groqClient.isConfigured).toBe("function");
  });

  it("isConfigured returns boolean", () => {
    expect(typeof groqClient.isConfigured()).toBe("boolean");
  });
});
