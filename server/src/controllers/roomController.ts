import type { FastifyRequest, FastifyReply } from "fastify";
import { roomService } from "../services/roomService.js";
import {
  success,
  created,
  updated,
  deleted,
  paginated,
} from "../utils/response.js";
import type {
  CreateRoomData,
  UpdateRoomData,
  PaginationOptions,
} from "../services/roomService.js";

interface GetRoomsQuery {
  page?: string;
  limit?: string;
}

interface RoomParams {
  id: string;
}

interface BulkSyncParams {
  roomId: string;
}

interface BulkSyncBody {
  nodes: Array<{
    id: string;
    label: string;
    x: number;
    y: number;
  }>;
  edges: Array<{
    id: string;
    sourceId: string;
    targetId: string;
    data?: Record<string, any>;
  }>;
}

export class RoomController {
  async getAllRooms(
    request: FastifyRequest<{ Querystring: GetRoomsQuery }>,
    reply: FastifyReply
  ): Promise<void> {
    const page = parseInt(request.query.page || "1", 10);
    const limit = parseInt(request.query.limit || "10", 10);

    const options: PaginationOptions = { page, limit };
    const { rooms, total } = await roomService.getAllRooms(options);

    reply.send(paginated(rooms, page, limit, total));
  }

  async getRoomById(
    request: FastifyRequest<{ Params: RoomParams }>,
    reply: FastifyReply
  ): Promise<void> {
    const { id } = request.params;
    const room = await roomService.getRoomById(id);

    reply.send(success(room));
  }

  async createRoom(
    request: FastifyRequest<{ Body: CreateRoomData }>,
    reply: FastifyReply
  ): Promise<void> {
    const roomData = request.body;
    const room = await roomService.createRoom(roomData);

    reply.status(201).send(created(room, "Room created successfully"));
  }

  async updateRoom(
    request: FastifyRequest<{ Params: RoomParams; Body: UpdateRoomData }>,
    reply: FastifyReply
  ): Promise<void> {
    const { id } = request.params;
    const updateData = request.body;
    const room = await roomService.updateRoom(id, updateData);

    reply.send(updated(room, "Room updated successfully"));
  }

  async deleteRoom(
    request: FastifyRequest<{ Params: RoomParams }>,
    reply: FastifyReply
  ): Promise<void> {
    const { id } = request.params;
    await roomService.deleteRoom(id);

    reply.send(deleted("Room deleted successfully"));
  }

  async getRoomStats(
    request: FastifyRequest<{ Params: RoomParams }>,
    reply: FastifyReply
  ): Promise<void> {
    const { id } = request.params;
    const stats = await roomService.getRoomStats(id);

    reply.send(success(stats));
  }

  async bulkSync(
    request: FastifyRequest<{ Params: BulkSyncParams; Body: BulkSyncBody }>,
    reply: FastifyReply
  ): Promise<void> {
    const { roomId } = request.params;
    const { nodes, edges } = request.body;

    const result = await roomService.bulkSync(roomId, { nodes, edges });

    reply.send(success(result, "Bulk sync completed successfully"));
  }
}

export const roomController = new RoomController();
