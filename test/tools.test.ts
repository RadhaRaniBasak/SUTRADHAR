// set minimal environment for config parsing before importing modules
process.env.SLACK_SIGNING_SECRET = 'x';
process.env.SLACK_BOT_TOKEN = 'xoxb-x';
process.env.SLACK_BOT_USER_ID = 'U123';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.GROQ_API_KEY = 'groq-key';
process.env.JIRA_BASE_URL = 'https://example.atlassian.net';
process.env.JIRA_EMAIL = 'me@example.com';
process.env.JIRA_API_TOKEN = 'jira-token';
process.env.JIRA_DEFAULT_PROJECT_KEY = 'PROJ';
process.env.LINEAR_API_KEY = 'linear-key';
process.env.LINEAR_DEFAULT_TEAM_ID = 'team';
process.env.GITHUB_APP_ID = '1';
process.env.GITHUB_PRIVATE_KEY = 'key';
process.env.GITHUB_INSTALLATION_ID = '1';
process.env.GITHUB_DEFAULT_OWNER = 'o';
process.env.GITHUB_DEFAULT_REPO = 'r';
process.env.NOTION_API_KEY = 'notion-key';
process.env.NOTION_DEFAULT_DATABASE_ID = 'db';

import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from 'vitest';

// set minimal environment for config parsing before importing modules
process.env.SLACK_SIGNING_SECRET = 'x';
process.env.SLACK_BOT_TOKEN = 'xoxb-x';
process.env.SLACK_BOT_USER_ID = 'U123';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.GROQ_API_KEY = 'groq-key';
process.env.JIRA_BASE_URL = 'https://example.atlassian.net';
process.env.JIRA_EMAIL = 'me@example.com';
process.env.JIRA_API_TOKEN = 'jira-token';
process.env.JIRA_DEFAULT_PROJECT_KEY = 'PROJ';
process.env.LINEAR_API_KEY = 'linear-key';
process.env.LINEAR_DEFAULT_TEAM_ID = 'team';
process.env.GITHUB_APP_ID = '1';
process.env.GITHUB_PRIVATE_KEY = 'key';
process.env.GITHUB_INSTALLATION_ID = '1';
process.env.GITHUB_DEFAULT_OWNER = 'o';
process.env.GITHUB_DEFAULT_REPO = 'r';
process.env.NOTION_API_KEY = 'notion-key';
process.env.NOTION_DEFAULT_DATABASE_ID = 'db';

// Mock external HTTP clients / libraries to avoid adding network-mocking deps
vi.mock('axios', () => ({
  default: { post: async () => ({ data: { id: '10001', key: 'PROJ-1' } }) },
}));

vi.mock('../src/integrations/linear/Linearclient.js', () => ({
  createIssue: async () => ({ ok: true, value: { id: 'lin-1', identifier: 'L-1', url: 'https://linear.app/issue/lin-1' } }),
}));

vi.mock('@octokit/rest', () => ({
  Octokit: class {
    async request(_method: string, _args: any) {
      return { data: { node_id: 'node123', number: 5, html_url: 'https://github.com/o/r/issues/5' } };
    }
  },
}));

vi.mock('@notionhq/client', () => ({
  Client: class {
    pages = { create: async () => ({ id: 'page-1' }) };
  },
}));

let jira: any, linear: any, github: any, notion: any;

beforeAll(async () => {
  // dynamic import after env vars set so config/env reads them
  jira = await import('../src/services/mcp/tools/createJiraIssue');
  linear = await import('../src/services/mcp/tools/createLinearIssue');
  github = await import('../src/services/mcp/tools/createGithubIssue');
  notion = await import('../src/services/mcp/tools/insertNotionDocument');
});

beforeEach(() => vi.restoreAllMocks());
afterEach(() => vi.restoreAllMocks());

describe('MCP tools - real implementations (mocked clients)', () => {
  it('creates a Jira issue', async () => {
    const res = await jira.execute({ title: 'T', projectKey: 'PROJ' });
    expect(res).toHaveProperty('id', '10001');
    expect(res).toHaveProperty('key', 'PROJ-1');
  });

  it('creates a Linear issue via integrations client', async () => {
    const res = await linear.execute({ title: 'T', teamId: 'team' });
    expect(res).toHaveProperty('id');
  });

  it('creates a GitHub issue', async () => {
    process.env.GITHUB_TOKEN = 'dummy';
    const res = await github.execute({ title: 'T', owner: 'o', repo: 'r' });
    expect(res).toHaveProperty('number', 5);
  });

  it('creates a Notion page', async () => {
    const res = await notion.execute({ title: 'T', databaseId: 'db' });
    expect(res).toHaveProperty('id', 'page-1');
  });
});
