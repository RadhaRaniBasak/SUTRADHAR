export interface RetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  isRetryable?: (error: unknown) => boolean;
}

interface HttpLikeError {
  response?: { status?: number };
  status?: number;
  code?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function defaultIsRetryable(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const httpError = error as HttpLikeError;
  const status = httpError.response?.status ?? httpError.status;
  if (typeof status === "number") {
    return status === 429 || (status >= 500 && status < 600);
  }

  const networkErrorCodes = new Set(["ECONNRESET", "ETIMEDOUT", "ECONNREFUSED", "ENOTFOUND", "EAI_AGAIN"]);
  if (typeof httpError.code === "string" && networkErrorCodes.has(httpError.code)) {
    return true;
  }

  return false;
}

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { attempts = 3, baseDelayMs = 300, maxDelayMs = 5000, isRetryable = defaultIsRetryable } = options;

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === attempts || !isRetryable(error)) {
        throw error;
      }
      const backoff = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
      const jitter = backoff * 0.2 * Math.random();
      await sleep(backoff + jitter);
    }
  }
  throw lastError;
}