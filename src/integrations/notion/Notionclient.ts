import { Client, isNotionClientError, APIErrorCode } from "@notionhq/client";
import type { GetDatabaseResponse } from "@notionhq/client/build/src/api-endpoints.js";
import { env } from "../../config/env.js";
import { withRetry } from "../../utils/retry.js";
import { err, ok, type Result } from "../../utils/result.js";
import type { IntegrationError } from "../../types/domain.types.js";
type InsertNotionDocumentInput = {
  databaseId: string;
  pageTitle: string;
  contentBlocks: string[];
};

type InsertNotionDocumentResult = {
  id: string;
  url: string;
};

const notion = new Client({ auth: env.NOTION_API_KEY });

const titlePropertyCache = new Map<string, string>();

function isFullDatabaseResponse(
  database: GetDatabaseResponse,
): database is Extract<GetDatabaseResponse, { properties: unknown }> {
  return "properties" in database;
}

async function resolveTitlePropertyName(databaseId: string): Promise<string> {
  const cached = titlePropertyCache.get(databaseId);
  if (cached) {
    return cached;
  }

  const database = await notion.databases.retrieve({ database_id: databaseId });
  if (!isFullDatabaseResponse(database)) {
    throw new Error(`Database ${databaseId} returned a partial object; insufficient permissions to read its schema`);
  }

  const titleEntry = Object.entries(database.properties).find(([, config]) => config.type === "title");
  if (!titleEntry) {
    throw new Error(`Database ${databaseId} has no title property, which should not be possible`);
  }

  const [titlePropertyName] = titleEntry;
  titlePropertyCache.set(databaseId, titlePropertyName);
  return titlePropertyName;
}

function toIntegrationError(error: unknown): IntegrationError {
  if (isNotionClientError(error)) {
    const status = "status" in error ? error.status : undefined;
    const retryable =
      error.code === APIErrorCode.RateLimited ||
      error.code === APIErrorCode.InternalServerError ||
      error.code === APIErrorCode.ServiceUnavailable;
    return {
      provider: "notion",
      message: error.message,
      ...(status !== undefined ? { statusCode: status } : {}),
      retryable,
    };
  }
  return {
    provider: "notion",
    message: error instanceof Error ? error.message : "Unknown Notion integration error",
    retryable: false,
  };
}

export async function insertDocument(
  input: InsertNotionDocumentInput,
): Promise<Result<InsertNotionDocumentResult, IntegrationError>> {
  try {
    const titlePropertyName = await resolveTitlePropertyName(input.databaseId);

    const page = await withRetry(() =>
      notion.pages.create({
        parent: { database_id: input.databaseId },
        properties: {
          [titlePropertyName]: {
            title: [{ type: "text", text: { content: input.pageTitle } }],
          },
        },
        children: input.contentBlocks.map((block) => ({
          object: "block" as const,
          type: "paragraph" as const,
          paragraph: {
            rich_text: [{ type: "text" as const, text: { content: block } }],
          },
        })),
      }),
    );

    const url = "url" in page && typeof page.url === "string" ? page.url : `https://notion.so/${page.id.replace(/-/g, "")}`;

    return ok({ id: page.id, url });
  } catch (error) {
    return err(toIntegrationError(error));
  }
}