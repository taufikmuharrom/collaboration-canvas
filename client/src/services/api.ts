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
    return apiRequest<ApiResponse<Room>>(`/rooms/${id}`)
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

    return apiRequest<ApiResponse<PaginatedResponse<Node>>>(endpoint)
  },

  // Get a specific node
  async getNode(roomId: string, nodeId: string): Promise<ApiResponse<Node>> {
    return apiRequest<ApiResponse<Node>>(`/rooms/${roomId}/nodes/${nodeId}`)
  },

  // Create a new node
  async createNode(data: CreateNodeRequest): Promise<ApiResponse<Node>> {
    return apiRequest<ApiResponse<Node>>(`/rooms/${data.roomId}/nodes`, {
      method: 'POST',
      data: data,
    })
  },

  // Update a node
  async updateNode(
    roomId: string,
    nodeId: string,
    data: UpdateNodeRequest,
  ): Promise<ApiResponse<Node>> {
    return apiRequest<ApiResponse<Node>>(`/rooms/${roomId}/nodes/${nodeId}`, {
      method: 'PUT',
      data: data,
    })
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

    return apiRequest<ApiResponse<PaginatedResponse<Edge>>>(endpoint)
  },

  // Get a specific edge
  async getEdge(roomId: string, edgeId: string): Promise<ApiResponse<Edge>> {
    return apiRequest<ApiResponse<Edge>>(`/rooms/${roomId}/edges/${edgeId}`)
  },

  // Create a new edge
  async createEdge(data: CreateEdgeRequest): Promise<ApiResponse<Edge>> {
    return apiRequest<ApiResponse<Edge>>(`/rooms/${data.roomId}/edges`, {
      method: 'POST',
      data: data,
    })
  },

  // Update an edge
  async updateEdge(
    roomId: string,
    edgeId: string,
    data: UpdateEdgeRequest,
  ): Promise<ApiResponse<Edge>> {
    return apiRequest<ApiResponse<Edge>>(`/rooms/${roomId}/edges/${edgeId}`, {
      method: 'PUT',
      data: data,
    })
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
