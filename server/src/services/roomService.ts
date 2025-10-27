import { prisma, Prisma } from "../config/database.js";
import { NotFoundError, ConflictError } from "../utils/errors.js";
import type { Room, Node, Edge } from "@prisma/client";

export interface CreateRoomData {
  name: string;
}

export interface UpdateRoomData {
  name?: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface RoomStats {
  totalNodes: number;
  totalEdges: number;
  lastActivity: Date | null;
}

export interface RoomWithStats extends Room {
  stats: RoomStats;
}

export interface RoomWithRelations extends Room {
  nodes: Node[];
  edges: Edge[];
}

export interface BulkSyncData {
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

export interface BulkSyncResult {
  nodes: Array<{
    ephemeralId: string;
    serverId: string;
    node: Node;
  }>;
  edges: Array<{
    ephemeralId: string;
    serverId: string;
    edge: Edge;
  }>;
}

class RoomService {
  async getAllRooms(
    options: PaginationOptions
  ): Promise<{ rooms: Room[]; total: number }> {
    const { page, limit } = options;
    const skip = (page - 1) * limit;

    const [rooms, total] = await Promise.all([
      prisma.room.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.room.count(),
    ]);

    return { rooms, total };
  }

  async getRoomById(id: string): Promise<RoomWithRelations> {
    const room = await prisma.room.findUnique({
      where: { id },
      include: { nodes: true, edges: true },
    });

    if (!room) {
      throw new NotFoundError(`Room with id ${id} not found`);
    }

    return room as RoomWithRelations;
  }

  async createRoom(data: CreateRoomData): Promise<Room> {
    try {
      const room = await prisma.room.create({
        data: {
          name: data.name,
        },
      });

      return room;
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          throw new ConflictError("Room with this name already exists");
        }
      }
      throw error;
    }
  }

  async updateRoom(id: string, data: UpdateRoomData): Promise<Room> {
    try {
      const room = await prisma.room.update({
        where: { id },
        data: {
          ...(data.name && { name: data.name }),
          updatedAt: new Date(),
        },
      });

      return room;
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new NotFoundError(`Room with id ${id} not found`);
        }
        if (error.code === "P2002") {
          throw new ConflictError("Room with this name already exists");
        }
      }
      throw error;
    }
  }

  async deleteRoom(id: string): Promise<void> {
    try {
      await prisma.room.delete({
        where: { id },
      });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new NotFoundError(`Room with id ${id} not found`);
        }
      }
      throw error;
    }
  }

  async getRoomStats(id: string): Promise<RoomStats> {
    const room = await this.getRoomById(id);

    const [nodeCount, edgeCount, lastActivity] = await Promise.all([
      prisma.node.count({ where: { roomId: id } }),
      prisma.edge.count({ where: { roomId: id } }),
      prisma.node.findFirst({
        where: { roomId: id },
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true },
      }),
    ]);

    return {
      totalNodes: nodeCount,
      totalEdges: edgeCount,
      lastActivity: lastActivity?.updatedAt || room.updatedAt,
    };
  }

  async bulkSync(roomId: string, data: BulkSyncData): Promise<BulkSyncResult> {
    // Verify room exists
    await this.getRoomById(roomId);

    const result: BulkSyncResult = {
      nodes: [],
      edges: [],
    };

    // Create a mapping for ephemeral node IDs to server IDs
    const nodeIdMapping = new Map<string, string>();

    // Process nodes first
    for (const nodeData of data.nodes) {
      const createdNode = await prisma.node.create({
        data: {
          roomId,
          label: nodeData.label,
          x: nodeData.x,
          y: nodeData.y,
        },
      });

      nodeIdMapping.set(nodeData.id, createdNode.id);
      result.nodes.push({
        ephemeralId: nodeData.id,
        serverId: createdNode.id,
        node: createdNode,
      });
    }

    // Process edges with updated node references
    for (const edgeData of data.edges) {
      // Map ephemeral IDs to server IDs if they exist in the mapping
      const sourceId = nodeIdMapping.get(edgeData.sourceId) || edgeData.sourceId;
      const targetId = nodeIdMapping.get(edgeData.targetId) || edgeData.targetId;

      const createdEdge = await prisma.edge.create({
        data: {
          roomId,
          source: sourceId,
          target: targetId,
        },
      });

      result.edges.push({
        ephemeralId: edgeData.id,
        serverId: createdEdge.id,
        edge: createdEdge,
      });
    }

    return result;
  }
}

export const roomService = new RoomService();
