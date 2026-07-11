import axios from "axios";
import { z } from "zod";
import { env } from "../../../config/env.js";

export const name = "createJiraIssue";
export const description = "Create a Jira issue";

export const inputShape = z.object({
  title: z.string(),
  description: z.string().optional(),
  projectKey: z.string().optional(),
});

export const outputShape = z.object({
  id: z.string(),
  key: z.string().optional(),
  url: z.string().optional(),
});

export async function execute(input: z.infer<typeof inputShape>) {
  const payload = inputShape.parse(input);
  const projectKey = payload.projectKey ?? env.JIRA_DEFAULT_PROJECT_KEY;

  const auth = Buffer.from(`${env.JIRA_EMAIL}:${env.JIRA_API_TOKEN}`).toString("base64");
  const url = `${env.JIRA_BASE_URL.replace(/\/$/, "")}/rest/api/3/issue`;

  const body = {
    fields: {
      project: { key: projectKey },
      summary: payload.title,
      description: payload.description ?? "",
      issuetype: { name: "Task" },
    },
  };

  const res = await axios.post(url, body, {
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  const data = res.data;
  return { id: data.id, key: data.key, url: `${env.JIRA_BASE_URL.replace(/\/$/, "")}/browse/${data.key}` };
}
