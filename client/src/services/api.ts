import axios, { type AxiosResponse, type AxiosRequestConfig } from 'axios'
import type {
  Room,
  Node,
  Edge,
  CreateRoomRequest,
  CreateNodeRequest,
  UpdateNodeRequest,
  CreateEdgeRequest,
  UpdateEdgeRequest,
  ApiResponse,
  PaginatedResponse,
} from '@/types'

// Base API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'

// Create axios instance with default configuration
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds timeout
})

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// Add response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    if (error.response) {
      // Server responded with error status
      const errorData = error.response.data || {}
      throw new ApiError(
        errorData.message || `HTTP ${error.response.status}: ${error.response.statusText}`,
        error.response.status,
        errorData,
      )
    } else if (error.request) {
      // Network error
      throw new ApiError('Network error occurred', 0, error)
    } else {
      // Other error
      throw new ApiError(error.message || 'Unknown error occurred', 0, error)
    }
  }
)

// Helpers to normalize server payloads to client shapes
type ServerNode = {
  id: string
  roomId: string
  label: string
  x?: number
  y?: number
  positionX?: number
  positionY?: number
  data?: Record<string, unknown>
  createdAt?: string
  updatedAt?: string
}

function normalizeNode(raw: ServerNode): Node {
  return {
    id: raw.id,
    roomId: raw.roomId,
    label: raw.label,
    positionX: raw.positionX ?? raw.x ?? 0,
    positionY: raw.positionY ?? raw.y ?? 0,
    data: raw.data ?? {},
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  }
}

type ServerEdge = {
  id: string
  roomId: string
  source?: string
  target?: string
  sourceId?: string
  targetId?: string
  data?: Record<string, unknown>
  createdAt?: string
  updatedAt?: string
}

function normalizeEdge(raw: ServerEdge): Edge {
  return {
    id: raw.id,
    roomId: raw.roomId,
    sourceId: raw.sourceId ?? raw.source!,
    targetId: raw.targetId ?? raw.target!,
    data: raw.data ?? {},
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  }
}

// Generic API request handler
async function apiRequest<T>(endpoint: string, config: AxiosRequestConfig = {}): Promise<T> {
  try {
    const response = await axiosInstance.request<T>({
      url: endpoint,
      ...config,
    })
    return response.data
  } catch (error) {
    // Error is already handled by interceptor
    throw error
  }
}

// Room API methods
export const roomApi = {
  // Get all rooms
  async getRooms(): Promise<ApiResponse<Room[]>> {
    return apiRequest<ApiResponse<Room[]>>('/rooms')
  },

  // Get a specific room by ID
  async getRoom(id: string): Promise<ApiResponse<Room>> {
    const res = await apiRequest<ApiResponse<unknown>>(`/rooms/${id}`)
    if (res.success && res.data) {
      const room = res.data as Room & { nodes?: ServerNode[]; edges?: ServerEdge[] }
      const normalized: Room = {
        ...room,
        nodes: (room.nodes ?? []).map((n) => normalizeNode(n)),
        edges: (room.edges ?? []).map((e) => normalizeEdge(e)),
      }
      res.data = normalized
    }
    return res as ApiResponse<Room>
  },

  // Create a new room
  async createRoom(data: CreateRoomRequest): Promise<ApiResponse<Room>> {
    return apiRequest<ApiResponse<Room>>('/rooms', {
      method: 'POST',
      data: data,
    })
  },

  // Update a room
  async updateRoom(id: string, data: Partial<CreateRoomRequest>): Promise<ApiResponse<Room>> {
    return apiRequest<ApiResponse<Room>>(`/rooms/${id}`, {
      method: 'PUT',
      data: data,
    })
  },

  // Delete a room
  async deleteRoom(id: string): Promise<ApiResponse<void>> {
    return apiRequest<ApiResponse<void>>(`/rooms/${id}`, {
      method: 'DELETE',
    })
  },
}

// Node API methods
export const nodeApi = {
  // Get all nodes in a room
  async getNodes(
    roomId: string,
    params?: {
      page?: number
      limit?: number
    },
  ): Promise<ApiResponse<PaginatedResponse<Node>>> {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.limit) searchParams.set('limit', params.limit.toString())

    const query = searchParams.toString()
    const endpoint = `/rooms/${roomId}/nodes${query ? `?${query}` : ''}`

    const res = await apiRequest<ApiResponse<PaginatedResponse<unknown>>>(endpoint)
    if (res.success && res.data) {
      res.data.data = (res.data.data as ServerNode[]).map((n) => normalizeNode(n))
    }
    return res as ApiResponse<PaginatedResponse<Node>>
  },

  // Get a specific node
  async getNode(roomId: string, nodeId: string): Promise<ApiResponse<Node>> {
    const res = await apiRequest<ApiResponse<unknown>>(`/rooms/${roomId}/nodes/${nodeId}`)
    if (res.success && res.data) {
      res.data = normalizeNode(res.data as ServerNode)
    }
    return res as ApiResponse<Node>
  },

  // Create a new node
  async createNode(data: CreateNodeRequest): Promise<ApiResponse<Node>> {
    const res = await apiRequest<ApiResponse<unknown>>(`/rooms/${data.roomId}/nodes`, {
      method: 'POST',
      data: data,
    })
    if (res.success && res.data) {
      res.data = normalizeNode(res.data as ServerNode)
    }
    return res as ApiResponse<Node>
  },

  // Update a node
  async updateNode(
    roomId: string,
    nodeId: string,
    data: UpdateNodeRequest,
  ): Promise<ApiResponse<Node>> {
    const res = await apiRequest<ApiResponse<unknown>>(`/rooms/${roomId}/nodes/${nodeId}`, {
      method: 'PUT',
      data: data,
    })
    if (res.success && res.data) {
      res.data = normalizeNode(res.data as ServerNode)
    }
    return res as ApiResponse<Node>
  },

  // Update a node's position only (focused API)
  async updateNodePosition(
    roomId: string,
    nodeId: string,
    positionX: number,
    positionY: number,
  ): Promise<ApiResponse<Node>> {
    const res = await apiRequest<ApiResponse<unknown>>(`/rooms/${roomId}/nodes/${nodeId}`, {
      method: 'PUT',
      data: { positionX, positionY },
    })
    if (res.success && res.data) {
      res.data = normalizeNode(res.data as ServerNode)
    }
    return res as ApiResponse<Node>
  },

  // Delete a node
  async deleteNode(roomId: string, nodeId: string): Promise<ApiResponse<void>> {
    return apiRequest<ApiResponse<void>>(`/rooms/${roomId}/nodes/${nodeId}`, {
      method: 'DELETE',
    })
  },
}

// Edge API methods
export const edgeApi = {
  // Get all edges in a room
  async getEdges(
    roomId: string,
    params?: {
      page?: number
      limit?: number
      sourceId?: string
      targetId?: string
    },
  ): Promise<ApiResponse<PaginatedResponse<Edge>>> {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.sourceId) searchParams.set('sourceId', params.sourceId)
    if (params?.targetId) searchParams.set('targetId', params.targetId)

    const query = searchParams.toString()
    const endpoint = `/rooms/${roomId}/edges${query ? `?${query}` : ''}`

    const res = await apiRequest<ApiResponse<PaginatedResponse<unknown>>>(endpoint)
    if (res.success && res.data) {
      res.data.data = (res.data.data as ServerEdge[]).map((e) => normalizeEdge(e))
    }
    return res as ApiResponse<PaginatedResponse<Edge>>
  },

  // Get a specific edge
  async getEdge(roomId: string, edgeId: string): Promise<ApiResponse<Edge>> {
    const res = await apiRequest<ApiResponse<unknown>>(`/rooms/${roomId}/edges/${edgeId}`)
    if (res.success && res.data) {
      res.data = normalizeEdge(res.data as ServerEdge)
    }
    return res as ApiResponse<Edge>
  },

  // Create a new edge
  async createEdge(data: CreateEdgeRequest): Promise<ApiResponse<Edge>> {
    const res = await apiRequest<ApiResponse<unknown>>(`/rooms/${data.roomId}/edges`, {
      method: 'POST',
      data: data,
    })
    if (res.success && res.data) {
      res.data = normalizeEdge(res.data as ServerEdge)
    }
    return res as ApiResponse<Edge>
  },

  // Update an edge
  async updateEdge(
    roomId: string,
    edgeId: string,
    data: UpdateEdgeRequest,
  ): Promise<ApiResponse<Edge>> {
    const res = await apiRequest<ApiResponse<unknown>>(`/rooms/${roomId}/edges/${edgeId}`, {
      method: 'PUT',
      data: data,
    })
    if (res.success && res.data) {
      res.data = normalizeEdge(res.data as ServerEdge)
    }
    return res as ApiResponse<Edge>
  },

  // Delete an edge
  async deleteEdge(roomId: string, edgeId: string): Promise<ApiResponse<void>> {
    return apiRequest<ApiResponse<void>>(`/rooms/${roomId}/edges/${edgeId}`, {
      method: 'DELETE',
    })
  },
}

// Combined API object for easy importing
export const api = {
  rooms: roomApi,
  nodes: nodeApi,
  edges: edgeApi,
}

export { ApiError }
export default api
