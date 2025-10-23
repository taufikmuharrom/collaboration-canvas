import { z } from "zod";
import type { FastifyRequest, FastifyReply } from "fastify";

// Common validation schemas
export const idSchema = z.string().cuid("Invalid ID format");

export const paginationSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1)).default("1"),
  limit: z
    .string()
    .transform(Number)
    .pipe(z.number().min(1).max(100))
    .default("10"),
});

// Room validation schemas
export const createRoomSchema = z.object({
  name: z
    .string()
    .min(1, "Room name is required")
    .max(100, "Room name too long"),
});

export const updateRoomSchema = z.object({
  name: z
    .string()
    .min(1, "Room name is required")
    .max(100, "Room name too long")
    .optional(),
});

// Node validation schemas
export const createNodeSchema = z.object({
  roomId: idSchema,
  label: z
    .string()
    .min(1, "Node label is required")
    .max(200, "Node label too long"),
  positionX: z.number(),
  positionY: z.number(),
  data: z.record(z.any()).optional(),
});

export const updateNodeSchema = z.object({
  label: z
    .string()
    .min(1, "Node label is required")
    .max(200, "Node label too long")
    .optional(),
  positionX: z.number().optional(),
  positionY: z.number().optional(),
  data: z.record(z.any()).optional(),
});

// Edge validation schemas
export const createEdgeSchema = z.object({
  roomId: idSchema,
  sourceId: idSchema,
  targetId: idSchema,
  data: z.record(z.any()).optional(),
});

export const updateEdgeSchema = z.object({
  sourceId: idSchema.optional(),
  targetId: idSchema.optional(),
  data: z.record(z.any()).optional(),
});

type ValidationSource = "body" | "params" | "query";

// Validation middleware factory
export const validate = (
  schema: z.ZodSchema,
  source: ValidationSource = "body"
) => {
  return async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const data =
        source === "params"
          ? request.params
          : source === "query"
          ? request.query
          : request.body;

      const validated = schema.parse(data);

      if (source === "params") {
        request.params = validated;
      } else if (source === "query") {
        request.query = validated;
      } else {
        request.body = validated;
      }
    } catch (error) {
      reply.status(400).send({
        error: "VALIDATION_ERROR",
        message: "Invalid request data",
        details: (error as z.ZodError).errors,
        statusCode: 400,
      });
    }
  };
};
