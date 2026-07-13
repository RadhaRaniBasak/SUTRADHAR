import { Octokit } from "@octokit/rest";
import { RequestError } from "@octokit/request-error";
import { z } from "zod";
import { env } from "../../../config/env.js";

export const name = "upsertGithubFile";
export const description = "Create or update a file in a GitHub repository";

export const inputShape = z.object({
  action: z.enum(["create", "update", "upsert"]).default("upsert"),
  owner: z.string().optional(),
  repo: z.string().optional(),
  path: z.string().min(1),
  content: z.string().default(""),
  branch: z.string().optional(),
  commitMessage: z.string().optional(),
});

export const outputShape = z.object({
  path: z.string(),
  url: z.string().optional(),
  commitSha: z.string(),
});

interface GithubContentInfo {
  sha?: string;
}

function isNotFoundError(error: unknown): boolean {
  return error instanceof RequestError && error.status === 404;
}

async function getFileSha(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  branch?: string,
): Promise<string | undefined> {
  try {
    const response = await octokit.request("GET /repos/{owner}/{repo}/contents/{path}", {
      owner,
      repo,
      path,
      ...(branch ? { ref: branch } : {}),
    });

    const data = response.data as GithubContentInfo | GithubContentInfo[];
    if (Array.isArray(data)) {
      throw new Error(`Path "${path}" is a directory; expected a file path`);
    }
    return data.sha;
  } catch (error) {
    if (isNotFoundError(error)) {
      return undefined;
    }
    throw error;
  }
}

export async function execute(input: z.infer<typeof inputShape>) {
  const payload = inputShape.parse(input);
  const owner = payload.owner ?? env.GITHUB_DEFAULT_OWNER;
  const repo = payload.repo ?? env.GITHUB_DEFAULT_REPO;
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    throw new Error("GITHUB_TOKEN not configured");
  }
  if (!owner || !repo) {
    throw new Error("owner/repo are required (or set GITHUB_DEFAULT_OWNER and GITHUB_DEFAULT_REPO)");
  }

  const octokit = new Octokit({ auth: token });
  const existingSha = await getFileSha(octokit, owner, repo, payload.path, payload.branch);

  if (payload.action === "create" && existingSha) {
    throw new Error(`File "${payload.path}" already exists`);
  }
  if (payload.action === "update" && !existingSha) {
    throw new Error(`File "${payload.path}" does not exist`);
  }

  const response = await octokit.request("PUT /repos/{owner}/{repo}/contents/{path}", {
    owner,
    repo,
    path: payload.path,
    message: payload.commitMessage ?? `${payload.action} ${payload.path}`,
    content: Buffer.from(payload.content, "utf8").toString("base64"),
    ...(payload.branch ? { branch: payload.branch } : {}),
    ...(existingSha ? { sha: existingSha } : {}),
  });

  const responseData = response.data as {
    content?: { path?: string; html_url?: string };
    commit?: { sha?: string };
  };
  const commitSha = responseData.commit?.sha;
  if (!commitSha) {
    throw new Error("GitHub did not return a commit SHA");
  }

  return {
    path: responseData.content?.path ?? payload.path,
    ...(responseData.content?.html_url ? { url: responseData.content.html_url } : {}),
    commitSha,
  };
}
