import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import pino from "pino";
import { env } from "../../config/env.js";
import { registerAllTools } from "./toolRegistry.js";

const MCP_SERVER_NAME = "meeting-to-action-bridge";
const MCP_SERVER_VERSION = "0.1.0";

// This process communicates over stdio using the MCP JSON-RPC framing on stdout.
// Anything written to stdout that isn't a protocol message corrupts the stream,
// so this logger is pinned to stderr rather than using the shared app logger.
const logger = pino({ level: env.LOG_LEVEL, base: { service: "mcp-server" } }, pino.destination(2));

export function createMcpServer(): McpServer {
  const server = new McpServer({ name: MCP_SERVER_NAME, version: MCP_SERVER_VERSION });
  registerAllTools(server);
  return server;
}

async function shutdown(server: McpServer, signal: string): Promise<void> {
  logger.info({ signal }, "Shutting down MCP server");
  try {
    await server.close();
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, "Error during MCP server shutdown");
    process.exit(1);
  }
}

async function main(): Promise<void> {
  const server = createMcpServer();
  const transport = new StdioServerTransport();

  process.on("SIGTERM", () => void shutdown(server, "SIGTERM"));
  process.on("SIGINT", () => void shutdown(server, "SIGINT"));
  process.on("unhandledRejection", (reason) => {
    logger.error({ err: reason }, "Unhandled promise rejection in MCP server");
  });

  await server.connect(transport);
  logger.info(
    {
      tools: [
        "create_jira_issue",
        "create_linear_issue",
        "create_github_issue",
        "upsert_github_file",
        "insert_notion_document",
      ],
    },
    "MCP server connected over stdio",
  );
}

void main();