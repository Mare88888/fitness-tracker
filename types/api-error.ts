export type ApiFieldValidationError = {
  field: string;
  message: string;
};

export type ApiErrorResponse = {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
  validationErrors: ApiFieldValidationError[];
};
