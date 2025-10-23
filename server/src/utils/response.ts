import type { FastifyRequest, FastifyReply } from "fastify";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  statusCode: number;
  timestamp: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Response helpers
export const success = <T>(data: T, message?: string): ApiResponse<T> => ({
  success: true,
  data,
  ...(message && { message }),
  statusCode: 200,
  timestamp: new Date().toISOString(),
});

export const created = <T>(data: T, message?: string): ApiResponse<T> => ({
  success: true,
  data,
  message: message || "Resource created successfully",
  statusCode: 201,
  timestamp: new Date().toISOString(),
});

export const updated = <T>(data: T, message?: string): ApiResponse<T> => ({
  success: true,
  data,
  message: message || "Resource updated successfully",
  statusCode: 200,
  timestamp: new Date().toISOString(),
});

export const deleted = (message?: string): ApiResponse<null> => ({
  success: true,
  data: null,
  message: message || "Resource deleted successfully",
  statusCode: 200,
  timestamp: new Date().toISOString(),
});

export const paginated = <T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
  message?: string
): PaginatedResponse<T> => ({
  success: true,
  data,
  ...(message && { message }),
  statusCode: 200,
  timestamp: new Date().toISOString(),
  pagination: {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  },
});

// Response middleware
export const responseHandler = (
  request: FastifyRequest,
  reply: FastifyReply,
  done: () => void
): void => {
  reply.header("Content-Type", "application/json");
  done();
};
