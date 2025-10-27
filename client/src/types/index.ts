// Core data types matching the Prisma schema
export interface Room {
  id: string
  name: string
  createdAt: string
  updatedAt?: string
  nodes?: Node[]
  edges?: Edge[]
}

export interface Node {
  id: string
  roomId: string
  label: string
  positionX: number
  positionY: number
  data?: Record<string, unknown>
  createdAt?: string
  updatedAt?: string
}

export interface Edge {
  id: string
  roomId: string
  sourceId: string
  targetId: string
  data?: Record<string, unknown>
  createdAt?: string
  updatedAt?: string
}

// Vue Flow specific types
export interface FlowNode {
  id: string
  type?: string
  position: { x: number; y: number }
  data: {
    label: string
    [key: string]: unknown
  }
  selected?: boolean
  dragging?: boolean
}

export interface FlowEdge {
  id: string
  source: string
  target: string
  type?: string
  data?: Record<string, unknown>
  selected?: boolean
}

// API request/response types
export interface CreateRoomRequest {
  name: string
}

export interface CreateNodeRequest {
  roomId: string
  label: string
  positionX: number
  positionY: number
  data?: Record<string, unknown>
}

export interface UpdateNodeRequest {
  label?: string
  positionX?: number
  positionY?: number
  data?: Record<string, unknown>
}

export interface CreateEdgeRequest {
  roomId: string
  sourceId: string
  targetId: string
  data?: Record<string, unknown>
}

export interface UpdateEdgeRequest {
  sourceId?: string
  targetId?: string
  data?: Record<string, unknown>
}

// API response types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Collaboration types
export interface CollaborationState {
  isConnected: boolean
  isOnline: boolean
  isSyncing: boolean
  lastSyncTime?: Date
  error?: string
}

export interface YjsUpdate {
  type: 'node' | 'edge'
  action: 'create' | 'update' | 'delete'
  id: string
  data?: unknown
}

// UI state types
export interface SidebarState {
  isCollapsed: boolean
  activeRoom?: string
}

export interface CanvasState {
  selectedNodes: string[]
  selectedEdges: string[]
  isCreatingEdge: boolean
  draggedNode?: string
}
