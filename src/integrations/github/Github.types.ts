export interface CreateGithubIssueInput {
  owner: string;
  repo: string;
  title: string;
  body?: string;
  labels?: string[];
}

export interface CreateGithubIssueResult {
  id: number;
  number: number;
  url: string;
}