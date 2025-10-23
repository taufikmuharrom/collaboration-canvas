import { prisma, Prisma } from "../config/database.js";
import { NotFoundError, ConflictError } from "../utils/errors.js";
import type { Edge } from "@prisma/client";

export interface CreateEdgeData {
  roomId: string;
  sourceId: string;
  targetId: string;
  data?: Record<string, any>;
}

export interface UpdateEdgeData {
  sourceId?: string;
  targetId?: string;
  data?: Record<string, any>;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface EdgeFilters {
  roomId?: string;
  sourceId?: string;
  targetId?: string;
}

class EdgeService {
  async getAllEdges(
    options: PaginationOptions,
    filters: EdgeFilters = {}
  ): Promise<{ edges: Edge[]; total: number }> {
    const { page, limit } = options;
    const skip = (page - 1) * limit;

    const where: Prisma.EdgeWhereInput = {};
    if (filters.roomId) where.roomId = filters.roomId;
    if (filters.sourceId) where.sourceId = filters.sourceId;
    if (filters.targetId) where.targetId = filters.targetId;

    const [edges, total] = await Promise.all([
      prisma.edge.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.edge.count({ where }),
    ]);

    return { edges, total };
  }

  async getEdgeById(id: string): Promise<Edge> {
    const edge = await prisma.edge.findUnique({
      where: { id },
    });

    if (!edge) {
      throw new NotFoundError(`Edge with id ${id} not found`);
    }

    return edge;
  }

  async getEdgesByRoom(roomId: string): Promise<Edge[]> {
    // Verify room exists
    const room = await prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      throw new NotFoundError(`Room with id ${roomId} not found`);
    }

    const edges = await prisma.edge.findMany({
      where: { roomId },
      orderBy: { createdAt: "asc" },
    });

    return edges;
  }

  async getEdgesByNode(nodeId: string): Promise<Edge[]> {
    // Verify node exists
    const node = await prisma.node.findUnique({
      where: { id: nodeId },
    });

    if (!node) {
      throw new NotFoundError(`Node with id ${nodeId} not found`);
    }

    const edges = await prisma.edge.findMany({
      where: {
        OR: [{ sourceId: nodeId }, { targetId: nodeId }],
      },
      orderBy: { createdAt: "asc" },
    });

    return edges;
  }

  async createEdge(data: CreateEdgeData): Promise<Edge> {
    try {
      // Verify room exists
      const room = await prisma.room.findUnique({
        where: { id: data.roomId },
      });

      if (!room) {
        throw new NotFoundError(`Room with id ${data.roomId} not found`);
      }

      // Verify source and target nodes exist and belong to the same room
      const [sourceNode, targetNode] = await Promise.all([
        prisma.node.findUnique({
          where: { id: data.sourceId },
        }),
        prisma.node.findUnique({
          where: { id: data.targetId },
        }),
      ]);

      if (!sourceNode) {
        throw new NotFoundError(
          `Source node with id ${data.sourceId} not found`
        );
      }

      if (!targetNode) {
        throw new NotFoundError(
          `Target node with id ${data.targetId} not found`
        );
      }

      if (sourceNode.roomId !== data.roomId) {
        throw new ConflictError(
          `Source node does not belong to room ${data.roomId}`
        );
      }

      if (targetNode.roomId !== data.roomId) {
        throw new ConflictError(
          `Target node does not belong to room ${data.roomId}`
        );
      }

      // Check if edge already exists between these nodes
      const existingEdge = await prisma.edge.findFirst({
        where: {
          roomId: data.roomId,
          sourceId: data.sourceId,
          targetId: data.targetId,
        },
      });

      if (existingEdge) {
        throw new ConflictError(
          `Edge already exists between nodes ${data.sourceId} and ${data.targetId}`
        );
      }

      const edge = await prisma.edge.create({
        data: {
          roomId: data.roomId,
          sourceId: data.sourceId,
          targetId: data.targetId,
          data: data.data || {},
        },
      });

      return edge;
    } catch (error: unknown) {
      if (error instanceof NotFoundError || error instanceof ConflictError) {
        throw error;
      }
      throw error;
    }
  }

  async updateEdge(id: string, data: UpdateEdgeData): Promise<Edge> {
    try {
      const updateData: Prisma.EdgeUpdateInput = {
        updatedAt: new Date(),
      };

      // Handle sourceId update
      if (data.sourceId !== undefined) {
        const sourceNode = await prisma.node.findUnique({
          where: { id: data.sourceId },
        });
        if (!sourceNode) {
          throw new NotFoundError(
            `Source node with id ${data.sourceId} not found`
          );
        }
        updateData.source = { connect: { id: data.sourceId } };
      }

      // Handle targetId update
      if (data.targetId !== undefined) {
        const targetNode = await prisma.node.findUnique({
          where: { id: data.targetId },
        });
        if (!targetNode) {
          throw new NotFoundError(
            `Target node with id ${data.targetId} not found`
          );
        }
        updateData.target = { connect: { id: data.targetId } };
      }

      if (data.data !== undefined) {
        updateData.data = data.data;
      }

      const edge = await prisma.edge.update({
        where: { id },
        data: updateData,
      });

      return edge;
    } catch (error: unknown) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if ((error as any).code === "P2025") {
          throw new NotFoundError(`Edge with id ${id} not found`);
        }
      }
      throw error;
    }
  }

  async deleteEdge(id: string): Promise<void> {
    try {
      await prisma.edge.delete({
        where: { id },
      });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if ((error as any).code === "P2025") {
          throw new NotFoundError(`Edge with id ${id} not found`);
        }
      }
      throw error;
    }
  }

  async deleteEdgesByRoom(roomId: string): Promise<number> {
    const result = await prisma.edge.deleteMany({
      where: { roomId },
    });

    return result.count;
  }

  async deleteEdgesByNode(nodeId: string): Promise<number> {
    const result = await prisma.edge.deleteMany({
      where: {
        OR: [{ sourceId: nodeId }, { targetId: nodeId }],
      },
    });

    return result.count;
  }
}

export const edgeService = new EdgeService();
