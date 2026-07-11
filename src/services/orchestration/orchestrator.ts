import type { FastifyInstance } from 'fastify';

// Minimal stub to satisfy imports during typecheck and allow future implementation.
export async function orchestrateThread(server: FastifyInstance, payload: unknown): Promise<void> {
  // No-op stub: real orchestration logic should process payload and schedule tasks
  // Implemented elsewhere in the repo; this stub prevents build-time type errors.
  return;
}
