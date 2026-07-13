export class ExternalApiError extends Error {
  public readonly statusCode?: number;
  public readonly provider: string;
  public readonly retryable: boolean;
  public readonly requestId?: string;

  constructor(params: {
    provider: string;
    message: string;
    statusCode?: number;
    retryable?: boolean;
    requestId?: string;
    cause?: unknown;
  }) {
    super(params.message, { cause: params.cause });
    this.name = "ExternalApiError";
    this.provider = params.provider;
    this.retryable = params.retryable ?? false;

    if (params.statusCode !== undefined) this.statusCode = params.statusCode;
    if (params.requestId !== undefined) this.requestId = params.requestId;
  }
}

export function isTransientStatus(status: number): boolean {
  return status === 429 || status >= 500;
}
