export interface CreateJiraIssueInput {
  projectKey: string;
  summary: string;
  description: string;
  issueType: string;
}

export interface CreateJiraIssueResult {
  id: string;
  key: string;
  url: string;
}

export interface JiraErrorResponseBody {
  errorMessages?: string[];
  errors?: Record<string, string>;
}