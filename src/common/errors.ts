export type ErrorDetails = Record<string, unknown> | unknown[];

// AppError is the common error shape for expected application errors. The global
// Fastify error handler turns this into a JSON response with the same status code.
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: ErrorDetails;

  constructor(statusCode: number, code: string, message: string, details?: ErrorDetails) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

// Small factory helpers make service code read like business intent.
export const badRequest = (message: string, details?: ErrorDetails) =>
  new AppError(400, "VALIDATION_ERROR", message, details);

export const notFound = (message: string, details?: ErrorDetails) =>
  new AppError(404, "NOT_FOUND", message, details);
