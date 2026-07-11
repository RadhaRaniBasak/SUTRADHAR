export const LINEAR_PRIORITY = {
  NONE: 0,
  URGENT: 1,
  HIGH: 2,
  NORMAL: 3,
  LOW: 4,
} as const;

export type LinearPriority = (typeof LINEAR_PRIORITY)[keyof typeof LINEAR_PRIORITY];

export interface CreateLinearIssueInput {
  teamId: string;
  title: string;
  description?: string;
  priority?: LinearPriority;
}

export interface CreateLinearIssueResult {
  id: string;
  identifier: string;
  url: string;
}

export interface LinearIssueCreatePayload {
  issueCreate: {
    success: boolean;
    issue: {
      id: string;
      identifier: string;
      url: string;
    } | null;
  };
}

export interface LinearGraphQLErrorExtensions {
  code?: string;
  userPresentableMessage?: string;
}

export interface LinearGraphQLError {
  message: string;
  extensions?: LinearGraphQLErrorExtensions;
}