import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { AppError } from "./errors.js";

export function errorHandler(error: FastifyError | Error, request: FastifyRequest, reply: FastifyReply) {
  request.log.error(error);

  // Expected business/validation errors already know their HTTP status code.
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    });
  }

  // Zod errors can be thrown directly from controllers/schemas. Flattening makes
  // field-level validation problems easier for API users to read.
  if (error instanceof ZodError) {
    return reply.status(400).send({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request data",
        details: error.flatten()
      }
    });
  }

  // Anything else is treated as an unexpected server error. The internal error is
  // logged above, but the response stays generic.
  return reply.status(500).send({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Unexpected server error"
    }
  });
}
