import { Client } from "@notionhq/client";
import { z } from "zod";
import { env } from "../../../config/env.js";

export const name = "insertNotionDocument";
export const description = "Insert a Notion document";

export const inputShape = z.object({
  title: z.string(),
  content: z.string().optional(),
  databaseId: z.string().optional(),
});

export const outputShape = z.object({
  id: z.string(),
  url: z.string().optional(),
});

export async function execute(input: z.infer<typeof inputShape>) {
  const payload = inputShape.parse(input);
  const databaseId = payload.databaseId ?? env.NOTION_DEFAULT_DATABASE_ID;
  const notion = new Client({ auth: env.NOTION_API_KEY });

  const res = await notion.pages.create({
    parent: { database_id: databaseId },
    properties: {
      Name: { title: [{ text: { content: payload.title } }] },
    },
    children: payload.content
      ? [
          {
            object: "block",
            type: "paragraph",
            paragraph: { rich_text: [{ type: "text", text: { content: payload.content } }] },
          },
        ]
      : undefined,
  } as any);

  return { id: res.id, url: `https://www.notion.so/${res.id.replace(/-/g, "")}` };
}
