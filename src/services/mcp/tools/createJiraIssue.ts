import { createJiraIssue } from "../../../integrations/jira/jiraclient.js";
import { env } from "../../../config/env.js";

export async function execute(payload: {
  projectKey: string;
  summary: string;
  description?: string;
  issueType?: string;
}) {
  const baseUrl = env.JIRA_BASE_URL;
  if (!baseUrl) {
    throw new Error("JIRA_BASE_URL is required");
  }

  const data = await createJiraIssue(payload);
  const base = baseUrl.replace(/\/$/, "");

  return {
    id: data.id,
    key: data.key,
    url: `${base}/browse/${data.key}`,
  };
}
