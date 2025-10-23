import type { FastifyRequest, FastifyReply } from "fastify";
import { edgeService } from "../services/edgeService.js";
import {
  success,
  created,
  updated,
  deleted,
  paginated,
} from "../utils/response.js";
import type {
  CreateEdgeData,
  UpdateEdgeData,
  PaginationOptions,
} from "../services/edgeService.js";

interface GetEdgesQuery {
  page?: string;
  limit?: string;
  roomId?: string;
  sourceId?: string;
  targetId?: string;
}

interface EdgeParams {
  id: string;
}

interface RoomParams {
  roomId: string;
}

interface NodeParams {
  nodeId: string;
}

export class EdgeController {
  async getAllEdges(
    request: FastifyRequest<{ Querystring: GetEdgesQuery }>,
    reply: FastifyReply
  ): Promise<void> {
    const page = parseInt(request.query.page || "1", 10);
    const limit = parseInt(request.query.limit || "10", 10);
    const { roomId, sourceId, targetId } = request.query;

    const options: PaginationOptions = { page, limit };
    const filters: any = {};
    if (roomId) filters.roomId = roomId;
    if (sourceId) filters.sourceId = sourceId;
    if (targetId) filters.targetId = targetId;

    const { edges, total } = await edgeService.getAllEdges(options, filters);

    reply.send(paginated(edges, page, limit, total));
  }

  async getEdgeById(
    request: FastifyRequest<{ Params: EdgeParams }>,
    reply: FastifyReply
  ): Promise<void> {
    const { id } = request.params;
    const edge = await edgeService.getEdgeById(id);

    reply.send(success(edge));
  }

  async getEdgesByRoom(
    request: FastifyRequest<{ Params: RoomParams }>,
    reply: FastifyReply
  ): Promise<void> {
    const { roomId } = request.params;
    const edges = await edgeService.getEdgesByRoom(roomId);

    reply.send(success(edges));
  }

  async getEdgesByNode(
    request: FastifyRequest<{ Params: NodeParams }>,
    reply: FastifyReply
  ): Promise<void> {
    const { nodeId } = request.params;
    const edges = await edgeService.getEdgesByNode(nodeId);

    reply.send(success(edges));
  }

  async createEdge(
    request: FastifyRequest<{ Body: CreateEdgeData }>,
    reply: FastifyReply
  ): Promise<void> {
    const edgeData = request.body;
    const edge = await edgeService.createEdge(edgeData);

    reply.status(201).send(created(edge, "Edge created successfully"));
  }

  async updateEdge(
    request: FastifyRequest<{ Params: EdgeParams; Body: UpdateEdgeData }>,
    reply: FastifyReply
  ): Promise<void> {
    const { id } = request.params;
    const updateData = request.body;
    const edge = await edgeService.updateEdge(id, updateData);

    reply.send(updated(edge, "Edge updated successfully"));
  }

  async deleteEdge(
    request: FastifyRequest<{ Params: EdgeParams }>,
    reply: FastifyReply
  ): Promise<void> {
    const { id } = request.params;
    await edgeService.deleteEdge(id);

    reply.send(deleted("Edge deleted successfully"));
  }

  async deleteEdgesByRoom(
    request: FastifyRequest<{ Params: RoomParams }>,
    reply: FastifyReply
  ): Promise<void> {
    const { roomId } = request.params;
    const deletedCount = await edgeService.deleteEdgesByRoom(roomId);

    reply.send(
      success({ deletedCount }, `${deletedCount} edges deleted successfully`)
    );
  }

  async deleteEdgesByNode(
    request: FastifyRequest<{ Params: NodeParams }>,
    reply: FastifyReply
  ): Promise<void> {
    const { nodeId } = request.params;
    const deletedCount = await edgeService.deleteEdgesByNode(nodeId);

    reply.send(
      success({ deletedCount }, `${deletedCount} edges deleted successfully`)
    );
  }
}

export const edgeController = new EdgeController();
