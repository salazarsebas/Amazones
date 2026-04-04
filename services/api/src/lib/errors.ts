export class AppError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    status = 400,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function errorPayload(error: AppError) {
  return {
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
    },
  };
}
