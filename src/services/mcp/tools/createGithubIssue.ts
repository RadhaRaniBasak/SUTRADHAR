import { z } from "zod";
import { Octokit } from "@octokit/rest";
import { env } from "../../../config/env.js";

export const name = "createGithubIssue";
export const description = "Create a GitHub issue";

export const inputShape = z.object({
  title: z.string(),
  body: z.string().optional(),
  owner: z.string().optional(),
  repo: z.string().optional(),
});

export const outputShape = z.object({
  id: z.string(),
  number: z.number().optional(),
  url: z.string().optional(),
});

export async function execute(input: z.infer<typeof inputShape>) {
  const payload = inputShape.parse(input);
  const owner = payload.owner ?? env.GITHUB_DEFAULT_OWNER;
  const repo = payload.repo ?? env.GITHUB_DEFAULT_REPO;

  const token = env['GITHUB_TOKEN'] ?? process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN not configured");

  const octokit = new Octokit({ auth: token });

  // use generic request to avoid strict exactOptionalPropertyTypes mismatch
  const res = await octokit.request('POST /repos/{owner}/{repo}/issues', {
    owner,
    repo,
    title: payload.title as any,
    body: payload.body as any,
  });

  return { id: String(res.data.node_id), number: (res.data as any).number, url: (res.data as any).html_url };
}
