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
export const createNodeSchema = z
  .object({
    roomId: idSchema.optional(),
    label: z
      .string()
      .min(1, "Node label is required")
      .max(200, "Node label too long"),
    x: z.number().optional(),
    y: z.number().optional(),
    positionX: z.number().optional(),
    positionY: z.number().optional(),
  })
  .refine(
    (d) => (d.x ?? d.positionX) !== undefined && (d.y ?? d.positionY) !== undefined,
    {
      message: "Node position (x/y or positionX/positionY) is required",
    }
  )
  .transform((d) => ({
    roomId: d.roomId,
    label: d.label,
    x: d.x ?? d.positionX!,
    y: d.y ?? d.positionY!,
  }));

export const updateNodeSchema = z
  .object({
    label: z
      .string()
      .min(1, "Node label is required")
      .max(200, "Node label too long")
      .optional(),
    x: z.number().optional(),
    y: z.number().optional(),
    positionX: z.number().optional(),
    positionY: z.number().optional(),
  })
  .transform((d) => ({
    label: d.label,
    x: d.x ?? d.positionX,
    y: d.y ?? d.positionY,
  }));

// Edge validation schemas
export const createEdgeSchema = z
  .object({
    roomId: idSchema.optional(),
    sourceId: idSchema.optional(),
    targetId: idSchema.optional(),
    source: idSchema.optional(),
    target: idSchema.optional(),
    data: z.record(z.any()).optional(),
  })
  .refine(
    (d) => (d.sourceId ?? d.source) !== undefined && (d.targetId ?? d.target) !== undefined,
    { message: "Edge source/target is required" }
  )
  .transform((d) => ({
    roomId: d.roomId,
    sourceId: d.sourceId ?? d.source!,
    targetId: d.targetId ?? d.target!,
    data: d.data,
  }));

export const updateEdgeSchema = z
  .object({
    sourceId: idSchema.optional(),
    targetId: idSchema.optional(),
    source: idSchema.optional(),
    target: idSchema.optional(),
    data: z.record(z.any()).optional(),
  })
  .transform((d) => ({
    sourceId: d.sourceId ?? d.source,
    targetId: d.targetId ?? d.target,
    data: d.data,
  }));

// Bulk sync validation schemas
export const bulkSyncNodeSchema = z
  .object({
    id: z.string(), // ephemeral ID from client
    label: z
      .string()
      .min(1, "Node label is required")
      .max(200, "Node label too long"),
    x: z.number().optional(),
    y: z.number().optional(),
    positionX: z.number().optional(),
    positionY: z.number().optional(),
  })
  .refine(
    (d) => (d.x ?? d.positionX) !== undefined && (d.y ?? d.positionY) !== undefined,
    {
      message: "Node position (x/y or positionX/positionY) is required",
    }
  )
  .transform((d) => ({
    id: d.id,
    label: d.label,
    x: d.x ?? d.positionX!,
    y: d.y ?? d.positionY!,
  }));

export const bulkSyncEdgeSchema = z
  .object({
    id: z.string(), // ephemeral ID from client
    sourceId: z.string().optional(),
    targetId: z.string().optional(),
    source: z.string().optional(),
    target: z.string().optional(),
    data: z.record(z.any()).optional(),
  })
  .refine(
    (d) => (d.sourceId ?? d.source) !== undefined && (d.targetId ?? d.target) !== undefined,
    { message: "Edge source/target is required" }
  )
  .transform((d) => ({
    id: d.id,
    sourceId: d.sourceId ?? d.source!,
    targetId: d.targetId ?? d.target!,
    data: d.data,
  }));

export const bulkSyncSchema = z.object({
  nodes: z.array(bulkSyncNodeSchema).default([]),
  edges: z.array(bulkSyncEdgeSchema).default([]),
});

type ValidationSource = "body" | "params" | "query" | "body_or_query";

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
          : source === "body_or_query"
          ? (request.body ?? request.query)
          : request.body;

      const validated = schema.parse(data);

      if (source === "params") {
        request.params = validated as any;
      } else if (source === "query") {
        request.query = validated as any;
      } else {
        // For both body and body_or_query, assign to body
        request.body = validated as any;
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
