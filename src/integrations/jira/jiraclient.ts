import axios, { type AxiosInstance, isAxiosError } from "axios";
import { env } from "../../config/env.js";
import { withRetry } from "../../utils/retry.js";
import { err, ok, type Result } from "../../utils/result.js";
import type { IntegrationError } from "../../types/domain.types.js";

type CreateJiraIssueInput = {
  projectKey: string;
  summary: string;
  issueType: string;
  description: string;
};

type CreateJiraIssueResult = {
  id: string;
  key: string;
  url: string;
};

type JiraErrorResponseBody = {
  errorMessages?: string[];
  errors?: Record<string, string>;
};

const jiraHttp: AxiosInstance = axios.create({
  baseURL: env.JIRA_BASE_URL,
  timeout: 10_000,
  auth: {
    username: env.JIRA_EMAIL,
    password: env.JIRA_API_TOKEN,
  },
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

interface JiraCreateIssueResponse {
  id: string;
  key: string;
  self: string;
}

function toIntegrationError(error: unknown): IntegrationError {
  if (isAxiosError<JiraErrorResponseBody>(error)) {
    const status = error.response?.status;
    const body = error.response?.data;
    const messages = [
      ...(body?.errorMessages ?? []),
      ...(body?.errors ? Object.entries(body.errors).map(([field, msg]) => `${field}: ${msg}`) : []),
    ];
    return {
      provider: "jira",
      message: messages.length > 0 ? messages.join("; ") : error.message,
      ...(status !== undefined ? { statusCode: status } : {}),
      retryable: status === undefined || status === 429 || status >= 500,
    };
  }
  return {
    provider: "jira",
    message: error instanceof Error ? error.message : "Unknown Jira integration error",
    retryable: false,
  };
}

export async function createIssue(input: CreateJiraIssueInput): Promise<Result<CreateJiraIssueResult, IntegrationError>> {
  try {
    const response = await withRetry(() =>
      jiraHttp.post<JiraCreateIssueResponse>("/rest/api/3/issue", {
        fields: {
          project: { key: input.projectKey },
          summary: input.summary,
          issuetype: { name: input.issueType },
          description: {
            type: "doc",
            version: 1,
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: input.description }],
              },
            ],
          },
        },
      }),
    );

    return ok({
      id: response.data.id,
      key: response.data.key,
      url: `${env.JIRA_BASE_URL}/browse/${response.data.key}`,
    });
  } catch (error) {
    return err(toIntegrationError(error));
  }
}