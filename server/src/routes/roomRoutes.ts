import type { FastifyInstance } from "fastify";
import { roomController } from "../controllers/roomController.js";
import { validate } from "../utils/validation.js";
import { z } from "zod";
import {
  createRoomSchema,
  updateRoomSchema,
  idSchema,
  paginationSchema,
} from "../utils/validation.js";

const paramsSchema = z.object({
  id: idSchema,
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

  // Create new room
  fastify.post("/", {
    preHandler: validate(createRoomSchema, "body"),
    handler: roomController.createRoom.bind(roomController),
  });

  // Update room
  fastify.put("/:id", {
    preHandler: [
      validate(paramsSchema, "params"),
      validate(updateRoomSchema, "body"),
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
}
