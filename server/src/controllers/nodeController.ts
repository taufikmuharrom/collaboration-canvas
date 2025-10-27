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
  id?: string;
  nodeId?: string;
}

interface RoomParams {
  roomId: string;
}

interface NestedNodeParams {
  roomId: string;
  nodeId: string;
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
    request: FastifyRequest<{ Params: NodeParams | NestedNodeParams }>,
    reply: FastifyReply
  ): Promise<void> {
    const nodeId = 'nodeId' in request.params ? request.params.nodeId : request.params.id;
    if (!nodeId) {
      throw new Error('Node ID is required');
    }
    const node = await nodeService.getNodeById(nodeId);

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
    const maybeRoomId = (request.params as any)?.roomId;
    const nodeData = { ...request.body, roomId: (request.body as any).roomId ?? maybeRoomId } as CreateNodeData;
    const node = await nodeService.createNode(nodeData);

    reply.status(201).send(created(node, "Node created successfully"));
  }

  async updateNode(
    request: FastifyRequest<{ Params: NodeParams | NestedNodeParams; Body: UpdateNodeData }>,
    reply: FastifyReply
  ): Promise<void> {
    const nodeId = 'nodeId' in request.params ? request.params.nodeId : request.params.id;
    if (!nodeId) {
      throw new Error('Node ID is required');
    }
    const updateData = request.body;
    const node = await nodeService.updateNode(nodeId, updateData);

    reply.send(updated(node, "Node updated successfully"));
  }

  async deleteNode(
    request: FastifyRequest<{ Params: NodeParams | NestedNodeParams }>,
    reply: FastifyReply
  ): Promise<void> {
    const nodeId = 'nodeId' in request.params ? request.params.nodeId : request.params.id;
    if (!nodeId) {
      throw new Error('Node ID is required');
    }
    await nodeService.deleteNode(nodeId);

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
