import type { FastifyInstance } from "fastify";
import { roomController } from "../controllers/roomController.js";
import { nodeController } from "../controllers/nodeController.js";
import { edgeController } from "../controllers/edgeController.js";
import { validate } from "../utils/validation.js";
import { z } from "zod";
import {
  createRoomSchema,
  updateRoomSchema,
  createNodeSchema,
  updateNodeSchema,
  createEdgeSchema,
  updateEdgeSchema,
  idSchema,
  paginationSchema,
  bulkSyncSchema,
} from "../utils/validation.js";

const paramsSchema = z.object({
  id: idSchema,
});

const roomParamsSchema = z.object({
  roomId: idSchema,
});

const nodeParamsSchema = z.object({
  roomId: idSchema,
  nodeId: idSchema,
});

const edgeParamsSchema = z.object({
  roomId: idSchema,
  edgeId: idSchema,
});

export async function roomRoutes(fastify: FastifyInstance): Promise<void> {
  // Get all rooms with pagination
  fastify.get("/", {
    preHandler: validate(paginationSchema, "query"),
    handler: roomController.getAllRooms.bind(roomController),
  });

  // Get room by ID
  fastify.get("/:id", {
    preHandler: validate(paramsSchema, "params"),
    handler: roomController.getRoomById.bind(roomController),
  });

  // Create new room (supports body or query)
  fastify.post("/", {
    preHandler: validate(createRoomSchema, "body_or_query"),
    handler: roomController.createRoom.bind(roomController),
  });

  // Update room (supports body or query)
  fastify.put("/:id", {
    preHandler: [
      validate(paramsSchema, "params"),
      validate(updateRoomSchema, "body_or_query"),
    ],
    handler: roomController.updateRoom.bind(roomController),
  });

  // Delete room
  fastify.delete("/:id", {
    preHandler: validate(paramsSchema, "params"),
    handler: roomController.deleteRoom.bind(roomController),
  });

  // Get room statistics
  fastify.get("/:id/stats", {
    preHandler: validate(paramsSchema, "params"),
    handler: roomController.getRoomStats.bind(roomController),
  });

  // Nested node routes
  // Get nodes by room
  fastify.get("/:roomId/nodes", {
    preHandler: validate(roomParamsSchema, "params"),
    handler: nodeController.getNodesByRoom.bind(nodeController),
  });

  // Get specific node in room
  fastify.get("/:roomId/nodes/:nodeId", {
    preHandler: validate(nodeParamsSchema, "params"),
    handler: nodeController.getNodeById.bind(nodeController),
  });

  // Create node in room
  fastify.post("/:roomId/nodes", {
    preHandler: [
      validate(roomParamsSchema, "params"),
      validate(createNodeSchema, "body_or_query"),
    ],
    handler: nodeController.createNode.bind(nodeController),
  });

  // Update node in room
  fastify.put("/:roomId/nodes/:nodeId", {
    preHandler: [
      validate(nodeParamsSchema, "params"),
      validate(updateNodeSchema, "body_or_query"),
    ],
    handler: nodeController.updateNode.bind(nodeController),
  });

  // Delete node in room
  fastify.delete("/:roomId/nodes/:nodeId", {
    preHandler: validate(nodeParamsSchema, "params"),
    handler: nodeController.deleteNode.bind(nodeController),
  });

  // Nested edge routes
  // Get edges by room
  fastify.get("/:roomId/edges", {
    preHandler: validate(roomParamsSchema, "params"),
    handler: edgeController.getEdgesByRoom.bind(edgeController),
  });

  // Get specific edge in room
  fastify.get("/:roomId/edges/:edgeId", {
    preHandler: validate(edgeParamsSchema, "params"),
    handler: edgeController.getEdgeById.bind(edgeController),
  });

  // Create edge in room
  fastify.post("/:roomId/edges", {
    preHandler: [
      validate(roomParamsSchema, "params"),
      validate(createEdgeSchema, "body_or_query"),
    ],
    handler: edgeController.createEdge.bind(edgeController),
  });

  // Update edge in room
  fastify.put("/:roomId/edges/:edgeId", {
    preHandler: [
      validate(edgeParamsSchema, "params"),
      validate(updateEdgeSchema, "body_or_query"),
    ],
    handler: edgeController.updateEdge.bind(edgeController),
  });

  // Delete edge in room
  fastify.delete("/:roomId/edges/:edgeId", {
    preHandler: validate(edgeParamsSchema, "params"),
    handler: edgeController.deleteEdge.bind(edgeController),
  });

  // Bulk sync nodes and edges for offline synchronization
  fastify.post("/:roomId/sync", {
    preHandler: [
      validate(roomParamsSchema, "params"),
      validate(bulkSyncSchema, "body"),
    ],
    handler: roomController.bulkSync.bind(roomController),
  });
}
