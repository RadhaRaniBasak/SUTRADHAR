import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createMcpServer } from "./server.js";

const MCP_CLIENT_NAME = "meeting-to-action-orchestrator";
const MCP_CLIENT_VERSION = "0.1.0";

let cachedClient: Client | null = null;

export async function getMcpClient(): Promise<Client> {
  if (cachedClient) {
    return cachedClient;
  }

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createMcpServer();
  await server.connect(serverTransport);

  const client = new Client({ name: MCP_CLIENT_NAME, version: MCP_CLIENT_VERSION });
  await client.connect(clientTransport);

  cachedClient = client;
  return client;
}