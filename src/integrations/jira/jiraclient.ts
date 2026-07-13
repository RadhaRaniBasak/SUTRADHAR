import axios from "axios";
import { env } from "../../config/env.js";
import { withRetry } from "../../utils/retry.js";

function getJiraConfig(): { baseUrl: string; username: string; password: string } {
  const baseUrl = env.JIRA_BASE_URL;
  const username = env.JIRA_EMAIL;
  const password = env.JIRA_API_TOKEN;

  if (!baseUrl || !username || !password) {
    throw new Error("Missing Jira config: JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN");
  }

  return {
    baseUrl: baseUrl.replace(/\/$/, ""),
    username,
    password,
  };
}

export async function createJiraIssue(input: {
  projectKey: string;
  summary: string;
  description?: string;
  issueType?: string;
}) {
  const cfg = getJiraConfig();

  return withRetry(
    async () => {
      const response = await axios.post(
        `${cfg.baseUrl}/rest/api/3/issue`,
        {
          fields: {
            project: { key: input.projectKey },
            summary: input.summary,
            description: input.description ?? "",
            issuetype: { name: input.issueType ?? "Task" },
          },
        },
        {
          auth: {
            username: cfg.username,
            password: cfg.password,
          },
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        },
      );
      return response.data;
    },
    {
      maxAttempts: 3,
      baseDelayMs: 300,
      maxDelayMs: 2000,
      shouldRetry: () => true,
    },
  );
}
