import type { ApiErrorResponse, ApiFieldValidationError } from "@/types/api-error";

export class ApiRequestError extends Error {
  status: number;
  validationErrors: ApiFieldValidationError[];
  retryAfterSeconds?: number;

  constructor(
    message: string,
    status: number,
    validationErrors: ApiFieldValidationError[] = [],
    retryAfterSeconds?: number
  ) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.validationErrors = validationErrors;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export async function parseApiRequestError(response: Response, fallbackMessage: string): Promise<never> {
  const rawBody = await response.text();
  const retryAfterHeader = response.headers.get("Retry-After");
  const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : undefined;
  const parsedRetryAfterSeconds =
    retryAfterSeconds != null && Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
      ? Math.floor(retryAfterSeconds)
      : undefined;

  if (!rawBody) {
    throw new ApiRequestError(fallbackMessage, response.status, [], parsedRetryAfterSeconds);
  }

  let parsedBody: ApiErrorResponse | null = null;
  try {
    parsedBody = JSON.parse(rawBody) as ApiErrorResponse;
  } catch {
    // Keep raw text fallback below when body is not JSON.
  }

  const message = parsedBody?.message || rawBody || fallbackMessage;
  const validationErrors = parsedBody?.validationErrors || [];
  throw new ApiRequestError(message, response.status, validationErrors, parsedRetryAfterSeconds);
}
