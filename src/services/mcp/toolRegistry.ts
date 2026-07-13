import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as createJiraIssueTool from "./tools/createJiraIssue.js";
import * as createLinearIssueTool from "./tools/createLinearIssue.js";
import * as createGithubIssueTool from "./tools/createGithubIssue.js";
import * as upsertGithubFileTool from "./tools/upsertGithubFile.js";
import * as insertNotionDocumentTool from "./tools/insertNotionDocument.js";

export function registerAllTools(server: McpServer): void {
  server.registerTool(
    (createJiraIssueTool as any).name,
    {
      description: (createJiraIssueTool as any).description,
      inputSchema: (createJiraIssueTool as any).inputShape,
      outputSchema: (createJiraIssueTool as any).outputShape,
    },
    (createJiraIssueTool as any).execute,
  );

  server.registerTool(
    (createLinearIssueTool as any).name,
    {
      description: (createLinearIssueTool as any).description,
      inputSchema: (createLinearIssueTool as any).inputShape,
      outputSchema: (createLinearIssueTool as any).outputShape,
    },
    (createLinearIssueTool as any).execute,
  );

  server.registerTool(
    (createGithubIssueTool as any).name,
    {
      description: (createGithubIssueTool as any).description,
      inputSchema: (createGithubIssueTool as any).inputShape,
      outputSchema: (createGithubIssueTool as any).outputShape,
    },
    (createGithubIssueTool as any).execute,
  );

  server.registerTool(
    (upsertGithubFileTool as any).name,
    {
      description: (upsertGithubFileTool as any).description,
      inputSchema: (upsertGithubFileTool as any).inputShape,
      outputSchema: (upsertGithubFileTool as any).outputShape,
    },
    (upsertGithubFileTool as any).execute,
  );

  server.registerTool(
    (insertNotionDocumentTool as any).name,
    {
      description: (insertNotionDocumentTool as any).description,
      inputSchema: (insertNotionDocumentTool as any).inputShape,
      outputSchema: (insertNotionDocumentTool as any).outputShape,
    },
    (insertNotionDocumentTool as any).execute,
  );
}