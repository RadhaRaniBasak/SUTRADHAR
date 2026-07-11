import { z } from "zod";
import { createIssue as createLinearIssue } from "../../../integrations/linear/Linearclient.js";

export const name = "createLinearIssue";
export const description = "Create a Linear issue";

export const inputShape = z.object({
  title: z.string(),
  description: z.string().optional(),
  teamId: z.string().optional(),
});

export const outputShape = z.object({
  id: z.string(),
  identifier: z.string().optional(),
  url: z.string().optional(),
});

export async function execute(input: z.infer<typeof inputShape>) {
  const payload = inputShape.parse(input);
  const result = await createLinearIssue({
    teamId: payload.teamId || undefined,
    title: payload.title,
    description: payload.description,
    priority: undefined,
  });

  if (result.ok) {
    return result.value;
  }
  throw new Error(result.error.message || "Linear create issue failed");
}
