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
}

export const roomService = new RoomService();
