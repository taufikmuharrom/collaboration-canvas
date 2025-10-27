import { prisma } from "../config/database.js";
import { NotFoundError, ConflictError } from "../utils/errors.js";
import { Prisma } from "@prisma/client";
import type { Node } from "@prisma/client";

export interface CreateNodeData {
  roomId: string;
  label: string;
  x: number;
  y: number;
}

export interface UpdateNodeData {
  label?: string;
  x?: number;
  y?: number;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface NodeFilters {
  roomId?: string;
}

class NodeService {
  async getAllNodes(
    options: PaginationOptions,
    filters: NodeFilters = {}
  ): Promise<{ nodes: Node[]; total: number }> {
    const { page, limit } = options;
    const skip = (page - 1) * limit;

    const where: Prisma.NodeWhereInput = {};
    if (filters.roomId) {
      where.roomId = filters.roomId;
    }

    const [nodes, total] = await Promise.all([
      prisma.node.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.node.count({ where }),
    ]);

    return { nodes, total };
  }

  async getNodeById(id: string): Promise<Node> {
    const node = await prisma.node.findUnique({
      where: { id },
    });

    if (!node) {
      throw new NotFoundError(`Node with id ${id} not found`);
    }

    return node;
  }

  async getNodesByRoom(roomId: string): Promise<Node[]> {
    // Verify room exists
    const room = await prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      throw new NotFoundError(`Room with id ${roomId} not found`);
    }

    const nodes = await prisma.node.findMany({
      where: { roomId },
      orderBy: { createdAt: "asc" },
    });

    return nodes;
  }

  async createNode(data: CreateNodeData): Promise<Node> {
    try {
      // Verify room exists
      const room = await prisma.room.findUnique({
        where: { id: data.roomId },
      });

      if (!room) {
        throw new NotFoundError(`Room with id ${data.roomId} not found`);
      }

      const node = await prisma.node.create({
        data: {
          roomId: data.roomId,
          label: data.label,
          x: data.x,
          y: data.y,
        },
      });

      return node;
    } catch (error: unknown) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw error;
    }
  }

  async updateNode(id: string, data: UpdateNodeData): Promise<Node> {
    try {
      const updateData: Prisma.NodeUpdateInput = {
        updatedAt: new Date(),
      };

      if (data.label !== undefined) updateData.label = data.label;
      if (data.x !== undefined) updateData.x = data.x;
      if (data.y !== undefined) updateData.y = data.y;

      const node = await prisma.node.update({
        where: { id },
        data: updateData,
      });

      return node;
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new NotFoundError(`Node with id ${id} not found`);
        }
      }
      throw error;
    }
  }

  async deleteNode(id: string): Promise<void> {
    try {
      await prisma.node.delete({
        where: { id },
      });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new NotFoundError(`Node with id ${id} not found`);
        }
      }
      throw error;
    }
  }

  async deleteNodesByRoom(roomId: string): Promise<number> {
    const result = await prisma.node.deleteMany({
      where: { roomId },
    });

    return result.count;
  }
}

export const nodeService = new NodeService();
