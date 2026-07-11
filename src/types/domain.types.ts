export type IntegrationProvider = "jira" | "linear" | "github" | "notion";

export interface IntegrationError {
  provider: IntegrationProvider;
  message: string;
  statusCode?: number;
  retryable: boolean;
}

export interface ActionItem {
  title: string;
  description: string;
  suggestedAssignee?: string;
  labels: string[];
}

export interface DispatchOutcome {
  toolName: string;
  provider: IntegrationProvider;
  ok: boolean;
  title: string;
  url?: string;
  identifier?: string;
  errorMessage?: string;
}