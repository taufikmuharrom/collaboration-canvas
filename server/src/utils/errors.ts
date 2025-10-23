import type { FastifyRequest, FastifyReply } from "fastify";

// Custom error classes
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = "INTERNAL_ERROR"
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    if ("captureStackTrace" in Error) {
      (Error as any).captureStackTrace(this, this.constructor);
    }
  }
}

export class ValidationError extends AppError {
  public readonly details: unknown;

  constructor(message: string, details: unknown = null) {
    super(message, 400, "VALIDATION_ERROR");
    this.details = details;
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = "Resource") {
    super(`${resource} not found`, 404, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, "CONFLICT");
  }
}

interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  details?: unknown;
}

// Error handler for Fastify
export const errorHandler = (
  error: any,
  request: FastifyRequest,
  reply: FastifyReply
): void => {
  // Log error for debugging
  request.log.error(error);

  // Handle Prisma errors
  if (error.code === "P2002") {
    reply.status(409).send({
      error: "CONFLICT",
      message: "Resource already exists",
      statusCode: 409,
    } satisfies ErrorResponse);
    return;
  }

  if (error.code === "P2025") {
    reply.status(404).send({
      error: "NOT_FOUND",
      message: "Resource not found",
      statusCode: 404,
    } satisfies ErrorResponse);
    return;
  }

  // Handle validation errors
  if (error.validation) {
    reply.status(400).send({
      error: "VALIDATION_ERROR",
      message: "Invalid request data",
      details: error.validation,
      statusCode: 400,
    } satisfies ErrorResponse);
    return;
  }

  // Handle custom app errors
  if (error.isOperational) {
    reply.status(error.statusCode).send({
      error: error.code,
      message: error.message,
      statusCode: error.statusCode,
      ...(error.details && { details: error.details }),
    } satisfies ErrorResponse);
    return;
  }

  // Handle unexpected errors
  reply.status(500).send({
    error: "INTERNAL_ERROR",
    message: "Something went wrong",
    statusCode: 500,
  } satisfies ErrorResponse);
};
