import { z } from "zod";

const ToolArgsSchema = z.object({
  title: z.string().min(1).optional(),
  owner: z.string().min(1).optional(),
  repo: z.string().min(1).optional(),
  assignee: z.string().optional(),
  dueDate: z.string().optional(),
  body: z.string().optional(),
});

export function parseToolArgs(raw: string) {
  const parsed = JSON.parse(raw);
  return ToolArgsSchema.parse(parsed);
}
