export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitterRatio?: number;
  shouldRetry: (error: unknown, attempt: number) => boolean;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function computeBackoffMs(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
  jitterRatio: number,
): number {
  const exp = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
  const jitter = exp * jitterRatio * Math.random();
  return Math.floor(exp + jitter);
}

export async function withRetry<T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const jitterRatio = options.jitterRatio ?? 0.2;
  let lastError: unknown;

  for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      const retry = attempt < options.maxAttempts && options.shouldRetry(error, attempt);
      if (!retry) break;

      const delayMs = computeBackoffMs(
        attempt,
        options.baseDelayMs,
        options.maxDelayMs,
        jitterRatio,
      );
      await sleep(delayMs);
    }
  }

  throw lastError;
}
