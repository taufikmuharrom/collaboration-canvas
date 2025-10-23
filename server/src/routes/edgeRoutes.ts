import type { FastifyInstance } from "fastify";
import { edgeController } from "../controllers/edgeController.js";
import { validate } from "../utils/validation.js";
import { z } from "zod";
import {
  createEdgeSchema,
  updateEdgeSchema,
  idSchema,
  paginationSchema,
} from "../utils/validation.js";

const paramsSchema = z.object({
  id: idSchema,
});

const roomParamsSchema = z.object({
  roomId: idSchema,
});

const nodeParamsSchema = z.object({
  nodeId: idSchema,
});

const edgeQuerySchema = paginationSchema.extend({
  roomId: idSchema.optional(),
  sourceId: idSchema.optional(),
  targetId: idSchema.optional(),
});

export async function edgeRoutes(fastify: FastifyInstance): Promise<void> {
  // Get all edges with pagination and optional filters
  fastify.get("/", {
    preHandler: validate(edgeQuerySchema, "query"),
    handler: edgeController.getAllEdges.bind(edgeController),
  });

  // Get edge by ID
  fastify.get("/:id", {
    preHandler: validate(paramsSchema, "params"),
    handler: edgeController.getEdgeById.bind(edgeController),
  });

  // Create new edge
  fastify.post("/", {
    preHandler: validate(createEdgeSchema, "body"),
    handler: edgeController.createEdge.bind(edgeController),
  });

  // Update edge
  fastify.put("/:id", {
    preHandler: [
      validate(paramsSchema, "params"),
      validate(updateEdgeSchema, "body"),
    ],
    handler: edgeController.updateEdge.bind(edgeController),
  });

  // Delete edge
  fastify.delete("/:id", {
    preHandler: validate(paramsSchema, "params"),
    handler: edgeController.deleteEdge.bind(edgeController),
  });

  // Get edges by room
  fastify.get("/room/:roomId", {
    preHandler: validate(roomParamsSchema, "params"),
    handler: edgeController.getEdgesByRoom.bind(edgeController),
  });

  // Delete all edges in a room
  fastify.delete("/room/:roomId", {
    preHandler: validate(roomParamsSchema, "params"),
    handler: edgeController.deleteEdgesByRoom.bind(edgeController),
  });

  // Get edges by node
  fastify.get("/node/:nodeId", {
    preHandler: validate(nodeParamsSchema, "params"),
    handler: edgeController.getEdgesByNode.bind(edgeController),
  });

  // Delete all edges connected to a node
  fastify.delete("/node/:nodeId", {
    preHandler: validate(nodeParamsSchema, "params"),
    handler: edgeController.deleteEdgesByNode.bind(edgeController),
  });
}
