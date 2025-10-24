import type { FastifyInstance } from "fastify";
import { nodeController } from "../controllers/nodeController.js";
import { validate } from "../utils/validation.js";
import { z } from "zod";
import {
  createNodeSchema,
  updateNodeSchema,
  idSchema,
  paginationSchema,
} from "../utils/validation.js";

const paramsSchema = z.object({
  id: idSchema,
});

const roomParamsSchema = z.object({
  roomId: idSchema,
});

const nodeQuerySchema = paginationSchema.extend({
  roomId: idSchema.optional(),
});

export async function nodeRoutes(fastify: FastifyInstance): Promise<void> {
  // Get all nodes with pagination and optional room filter
  fastify.get("/", {
    preHandler: validate(nodeQuerySchema, "query"),
    handler: nodeController.getAllNodes.bind(nodeController),
  });

  // Get node by ID
  fastify.get("/:id", {
    preHandler: validate(paramsSchema, "params"),
    handler: nodeController.getNodeById.bind(nodeController),
  });

  // Create new node (supports body or query)
  fastify.post("/", {
    preHandler: validate(createNodeSchema, "body_or_query"),
    handler: nodeController.createNode.bind(nodeController),
  });

  // Update node (supports body or query)
  fastify.put("/:id", {
    preHandler: [
      validate(paramsSchema, "params"),
      validate(updateNodeSchema, "body_or_query"),
    ],
    handler: nodeController.updateNode.bind(nodeController),
  });

  // Delete node
  fastify.delete("/:id", {
    preHandler: validate(paramsSchema, "params"),
    handler: nodeController.deleteNode.bind(nodeController),
  });

  // Get nodes by room
  fastify.get("/room/:roomId", {
    preHandler: validate(roomParamsSchema, "params"),
    handler: nodeController.getNodesByRoom.bind(nodeController),
  });

  // Delete all nodes in a room
  fastify.delete("/room/:roomId", {
    preHandler: validate(roomParamsSchema, "params"),
    handler: nodeController.deleteNodesByRoom.bind(nodeController),
  });
}
