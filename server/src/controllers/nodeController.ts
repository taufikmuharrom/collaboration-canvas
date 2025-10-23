import type { FastifyRequest, FastifyReply } from "fastify";
import { nodeService } from "../services/nodeService.js";
import {
  success,
  created,
  updated,
  deleted,
  paginated,
} from "../utils/response.js";
import type {
  CreateNodeData,
  UpdateNodeData,
  PaginationOptions,
} from "../services/nodeService.js";

interface GetNodesQuery {
  page?: string;
  limit?: string;
  roomId?: string;
}

interface NodeParams {
  id: string;
}

interface RoomParams {
  roomId: string;
}

export class NodeController {
  async getAllNodes(
    request: FastifyRequest<{ Querystring: GetNodesQuery }>,
    reply: FastifyReply
  ): Promise<void> {
    const page = parseInt(request.query.page || "1", 10);
    const limit = parseInt(request.query.limit || "10", 10);
    const roomId = request.query.roomId;

    const options: PaginationOptions = { page, limit };
    const filters = roomId ? { roomId } : {};

    const { nodes, total } = await nodeService.getAllNodes(options, filters);

    reply.send(paginated(nodes, page, limit, total));
  }

  async getNodeById(
    request: FastifyRequest<{ Params: NodeParams }>,
    reply: FastifyReply
  ): Promise<void> {
    const { id } = request.params;
    const node = await nodeService.getNodeById(id);

    reply.send(success(node));
  }

  async getNodesByRoom(
    request: FastifyRequest<{ Params: RoomParams }>,
    reply: FastifyReply
  ): Promise<void> {
    const { roomId } = request.params;
    const nodes = await nodeService.getNodesByRoom(roomId);

    reply.send(success(nodes));
  }

  async createNode(
    request: FastifyRequest<{ Body: CreateNodeData }>,
    reply: FastifyReply
  ): Promise<void> {
    const nodeData = request.body;
    const node = await nodeService.createNode(nodeData);

    reply.status(201).send(created(node, "Node created successfully"));
  }

  async updateNode(
    request: FastifyRequest<{ Params: NodeParams; Body: UpdateNodeData }>,
    reply: FastifyReply
  ): Promise<void> {
    const { id } = request.params;
    const updateData = request.body;
    const node = await nodeService.updateNode(id, updateData);

    reply.send(updated(node, "Node updated successfully"));
  }

  async deleteNode(
    request: FastifyRequest<{ Params: NodeParams }>,
    reply: FastifyReply
  ): Promise<void> {
    const { id } = request.params;
    await nodeService.deleteNode(id);

    reply.send(deleted("Node deleted successfully"));
  }

  async deleteNodesByRoom(
    request: FastifyRequest<{ Params: RoomParams }>,
    reply: FastifyReply
  ): Promise<void> {
    const { roomId } = request.params;
    const deletedCount = await nodeService.deleteNodesByRoom(roomId);

    reply.send(
      success({ deletedCount }, `${deletedCount} nodes deleted successfully`)
    );
  }
}

export const nodeController = new NodeController();
