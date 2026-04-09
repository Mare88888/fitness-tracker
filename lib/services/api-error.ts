import type { ApiErrorResponse, ApiFieldValidationError } from "@/types/api-error";

export class ApiRequestError extends Error {
  status: number;
  validationErrors: ApiFieldValidationError[];

  constructor(message: string, status: number, validationErrors: ApiFieldValidationError[] = []) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.validationErrors = validationErrors;
  }
}

export async function parseApiRequestError(response: Response, fallbackMessage: string): Promise<never> {
  const rawBody = await response.text();
  if (!rawBody) {
    throw new ApiRequestError(fallbackMessage, response.status, []);
  }

  try {
    const parsed = JSON.parse(rawBody) as ApiErrorResponse;
    const message = parsed?.message || fallbackMessage;
    const validationErrors = parsed?.validationErrors || [];
    throw new ApiRequestError(message, response.status, validationErrors);
  } catch {
    throw new ApiRequestError(rawBody, response.status, []);
  }
}
