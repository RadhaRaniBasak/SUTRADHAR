import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";
import { RequestError } from "@octokit/request-error";
import { env } from "../../config/env.js";
import { withRetry } from "../../utils/retry.js";
import { err, ok, type Result } from "../../utils/result.js";
import type { IntegrationError } from "../../types/domain.types.js";
import type { CreateGithubIssueInput, CreateGithubIssueResult } from "./Github.types.js";

const octokit = new Octokit({
  authStrategy: createAppAuth,
  auth: {
    appId: env.GITHUB_APP_ID,
    privateKey: env.GITHUB_PRIVATE_KEY,
    installationId: env.GITHUB_INSTALLATION_ID,
  },
});

function toIntegrationError(error: unknown): IntegrationError {
  if (error instanceof RequestError) {
    return {
      provider: "github",
      message: `${error.message} (${error.request.method} ${error.request.url})`,
      statusCode: error.status,
      retryable: error.status === 429 || error.status >= 500,
    };
  }
  return {
    provider: "github",
    message: error instanceof Error ? error.message : "Unknown GitHub integration error",
    retryable: false,
  };
}

export async function createIssue(input: CreateGithubIssueInput): Promise<Result<CreateGithubIssueResult, IntegrationError>> {
  try {
    const response = await withRetry(() =>
      octokit.rest.issues.create({
        owner: input.owner,
        repo: input.repo,
        title: input.title,
        ...(input.body !== undefined ? { body: input.body } : {}),
        ...(input.labels !== undefined ? { labels: input.labels } : {}),
      }),
    );

    return ok({
      id: response.data.id,
      number: response.data.number,
      url: response.data.html_url,
    });
  } catch (error) {
    return err(toIntegrationError(error));
  }
}