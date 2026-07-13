export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitterRatio?: number;
  shouldRetry: (error: unknown, attempt: number) => boolean;
}

const defaultRetryOptions: RetryOptions = {
  maxAttempts: 1,
  baseDelayMs: 0,
  maxDelayMs: 0,
  shouldRetry: () => false,
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function computeBackoffMs(attempt: number, baseDelayMs: number, maxDelayMs: number, jitterRatio: number): number {
  const exp = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
  const jitter = exp * jitterRatio * Math.random();
  return Math.floor(exp + jitter);
}

export async function withRetry<T>(
  operation: (attempt: number) => Promise<T>,
  options?: RetryOptions,
): Promise<T> {
  const cfg = options ?? defaultRetryOptions;
  const jitterRatio = cfg.jitterRatio ?? 0.2;
  let lastError: unknown;

  for (let attempt = 1; attempt <= cfg.maxAttempts; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      const retry = attempt < cfg.maxAttempts && cfg.shouldRetry(error, attempt);
      if (!retry) break;
      const delayMs = computeBackoffMs(attempt, cfg.baseDelayMs, cfg.maxDelayMs, jitterRatio);
      await sleep(delayMs);
    }
  }

  throw lastError;
}
