import { GraphQLClient, ClientError } from "graphql-request";
import { env } from "../../config/env.js";
import { withRetry } from "../../utils/retry.js";
import { err, ok, type Result } from "../../utils/result.js";
import type { IntegrationError } from "../../types/domain.types.js";
import type { CreateLinearIssueInput, CreateLinearIssueResult, LinearIssueCreatePayload } from "./Linear.types.js";

const LINEAR_API_URL = "https://api.linear.app/graphql";

const linearClient = new GraphQLClient(LINEAR_API_URL, {
  headers: {
    Authorization: env.LINEAR_API_KEY,
    "Content-Type": "application/json",
  },
});

const CREATE_ISSUE_MUTATION = /* GraphQL */ `
  mutation CreateIssue($input: IssueCreateInput!) {
    issueCreate(input: $input) {
      success
      issue {
        id
        identifier
        url
      }
    }
  }
`;

function toIntegrationError(error: unknown): IntegrationError {
  if (error instanceof ClientError) {
    const status = error.response.status;
    const messages = (error.response.errors ?? []).map((graphqlError) => graphqlError.message);
    return {
      provider: "linear",
      message: messages.length > 0 ? messages.join("; ") : error.message,
      statusCode: status,
      retryable: status === 429 || status >= 500,
    };
  }
  return {
    provider: "linear",
    message: error instanceof Error ? error.message : "Unknown Linear integration error",
    retryable: false,
  };
}

export async function createIssue(input: CreateLinearIssueInput): Promise<Result<CreateLinearIssueResult, IntegrationError>> {
  try {
    const data = await withRetry(() =>
      linearClient.request<LinearIssueCreatePayload>(CREATE_ISSUE_MUTATION, {
        input: {
          teamId: input.teamId,
          title: input.title,
          description: input.description,
          priority: input.priority,
        },
      }),
    );

    if (!data.issueCreate.success || !data.issueCreate.issue) {
      return err({
        provider: "linear",
        message: "Linear reported issueCreate as unsuccessful without a GraphQL error",
        retryable: false,
      });
    }

    return ok({
      id: data.issueCreate.issue.id,
      identifier: data.issueCreate.issue.identifier,
      url: data.issueCreate.issue.url,
    });
  } catch (error) {
    return err(toIntegrationError(error));
  }
}