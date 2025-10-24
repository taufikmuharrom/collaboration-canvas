import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { IndexeddbPersistence } from 'y-indexeddb'
import type { Node, Edge, FlowNode, FlowEdge, CollaborationState } from '@/types'
import { api } from '@/services/api'

// WebSocket server URL
const WS_URL = 'ws://localhost:3001/ws'

export const useCollaborationStore = defineStore('collaboration', () => {
  // Reactive state
  const currentRoomId = ref<string | null>(null)
  const isConnected = ref(false)
  const isOnline = ref(navigator.onLine)
  const isSyncing = ref(false)
  const lastSyncTime = ref<Date | null>(null)
  const error = ref<string | null>(null)

  // Yjs document and providers
  const ydoc = ref<Y.Doc | null>(null)
  const wsProvider = ref<WebsocketProvider | null>(null)
  const indexeddbProvider = ref<IndexeddbPersistence | null>(null)

  // Yjs maps for nodes and edges
  const yNodes = ref<Y.Map<Node> | null>(null)
  const yEdges = ref<Y.Map<Edge> | null>(null)

  // Local state for Vue Flow
  const nodes = ref<FlowNode[]>([])
  const edges = ref<FlowEdge[]>([])

  // Computed state
  const collaborationState = computed<CollaborationState>(() => ({
    isConnected: isConnected.value,
    isOnline: isOnline.value,
    isSyncing: isSyncing.value,
    lastSyncTime: lastSyncTime.value || undefined,
    error: error.value || undefined,
  }))

  // Initialize collaboration for a room
  async function initializeRoom(roomId: string) {
    try {
      // Clean up existing connections
      await cleanup()

      currentRoomId.value = roomId
      error.value = null

      // Create new Yjs document
      ydoc.value = new Y.Doc()

      // Initialize Yjs maps
      yNodes.value = ydoc.value.getMap('nodes')
      yEdges.value = ydoc.value.getMap('edges')

      // Set up IndexedDB persistence (offline storage)
      indexeddbProvider.value = new IndexeddbPersistence(`room-${roomId}`, ydoc.value)

      // Set up WebSocket provider (real-time collaboration)
      wsProvider.value = new WebsocketProvider(WS_URL, `room-${roomId}`, ydoc.value)

      // Set up event listeners
      setupEventListeners()

      // Load initial data from server
      await loadInitialData(roomId)

      console.log(`Initialized collaboration for room: ${roomId}`)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to initialize room'
      console.error('Failed to initialize room:', err)
    }
  }

  // Set up event listeners for Yjs and providers
  function setupEventListeners() {
    if (!ydoc.value || !wsProvider.value || !yNodes.value || !yEdges.value) return

    // WebSocket connection events
    wsProvider.value.on('status', (event: { status: string }) => {
      isConnected.value = event.status === 'connected'
      if (event.status === 'connected') {
        error.value = null
      }
    })

    wsProvider.value.on('connection-error', (event: Event) => {
      error.value = `Connection error: ${event.type}`
      isConnected.value = false
    })

    // Yjs document update events
    yNodes.value.observe((event) => {
      handleYjsNodesUpdate(event)
    })

    yEdges.value.observe((event) => {
      handleYjsEdgesUpdate(event)
    })

    // Online/offline detection
    window.addEventListener('online', () => {
      isOnline.value = true
      if (wsProvider.value) {
        wsProvider.value.connect()
      }
    })

    window.addEventListener('offline', () => {
      isOnline.value = false
    })
  }

  // Handle Yjs nodes updates
  function handleYjsNodesUpdate(event: Y.YMapEvent<Node>) {
    if (!yNodes.value) return

    event.changes.keys.forEach((change, key) => {
      const node = yNodes.value!.get(key)

      if (change.action === 'add' || change.action === 'update') {
        if (node) {
          updateLocalNode(node)
        }
      } else if (change.action === 'delete') {
        removeLocalNode(key)
      }
    })
  }

  // Handle Yjs edges updates
  function handleYjsEdgesUpdate(event: Y.YMapEvent<Edge>) {
    if (!yEdges.value) return

    event.changes.keys.forEach((change, key) => {
      const edge = yEdges.value!.get(key)

      if (change.action === 'add' || change.action === 'update') {
        if (edge) {
          updateLocalEdge(edge)
        }
      } else if (change.action === 'delete') {
        removeLocalEdge(key)
      }
    })
  }

  // Update local node state
  function updateLocalNode(node: Node) {
    const flowNode: FlowNode = {
      id: node.id,
      position: { x: node.positionX, y: node.positionY },
      data: { label: node.label, ...node.data },
    }

    const existingIndex = nodes.value.findIndex((n) => n.id === node.id)
    if (existingIndex >= 0) {
      nodes.value[existingIndex] = flowNode
    } else {
      nodes.value.push(flowNode)
    }
  }

  // Remove local node
  function removeLocalNode(nodeId: string) {
    const index = nodes.value.findIndex((n) => n.id === nodeId)
    if (index >= 0) {
      nodes.value.splice(index, 1)
    }
  }

  // Update local edge state
  function updateLocalEdge(edge: Edge) {
    const flowEdge: FlowEdge = {
      id: edge.id,
      source: edge.sourceId,
      target: edge.targetId,
      data: edge.data,
    }

    const existingIndex = edges.value.findIndex((e) => e.id === edge.id)
    if (existingIndex >= 0) {
      edges.value[existingIndex] = flowEdge
    } else {
      edges.value.push(flowEdge)
    }
  }

  // Remove local edge
  function removeLocalEdge(edgeId: string) {
    const index = edges.value.findIndex((e) => e.id === edgeId)
    if (index >= 0) {
      edges.value.splice(index, 1)
    }
  }

  // Load initial data from server
  async function loadInitialData(roomId: string) {
    if (!yNodes.value || !yEdges.value) return

    try {
      isSyncing.value = true

      // Load nodes
      const roomResponse = await api.rooms.getRoom(roomId)
      if (roomResponse.success && roomResponse.data) {
        console.log('roomResponse', roomResponse.data.nodes, roomResponse.data.edges)
        roomResponse.data.nodes?.forEach((node: Node) => {
          yNodes.value!.set(node.id, node)
        })
        roomResponse.data.edges?.forEach((edge: Edge) => {
          yEdges.value!.set(edge.id, edge)
        })
      }

      lastSyncTime.value = new Date()
    } catch (err) {
      console.error('Failed to load initial data:', err)
      error.value = 'Failed to load initial data'
    } finally {
      isSyncing.value = false
    }
  }

  // Add a new node
  function addNode(node: Omit<Node, 'id' | 'createdAt' | 'updatedAt'>) {
    if (!yNodes.value || !currentRoomId.value) return

    const newNode: Node = {
      ...node,
      id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      roomId: currentRoomId.value,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    yNodes.value.set(newNode.id, newNode)
    return newNode
  }

  // Update an existing node
  function updateNode(nodeId: string, updates: Partial<Node>) {
    if (!yNodes.value) return

    const existingNode = yNodes.value.get(nodeId)
    if (existingNode) {
      const updatedNode: Node = {
        ...existingNode,
        ...updates,
        updatedAt: new Date().toISOString(),
      }
      yNodes.value.set(nodeId, updatedNode)
      return updatedNode
    }
  }

  // Delete a node
  function deleteNode(nodeId: string) {
    if (!yNodes.value || !yEdges.value) return

    // Remove the node
    yNodes.value.delete(nodeId)

    // Remove all edges connected to this node
    const edgesToDelete: string[] = []
    yEdges.value.forEach((edge, edgeId) => {
      if (edge.sourceId === nodeId || edge.targetId === nodeId) {
        edgesToDelete.push(edgeId)
      }
    })

    edgesToDelete.forEach((edgeId) => {
      yEdges.value!.delete(edgeId)
    })
  }

  // Add a new edge
  function addEdge(edge: Omit<Edge, 'id' | 'createdAt' | 'updatedAt'>) {
    if (!yEdges.value || !currentRoomId.value) return

    const newEdge: Edge = {
      ...edge,
      id: `edge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      roomId: currentRoomId.value,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    yEdges.value.set(newEdge.id, newEdge)
    return newEdge
  }

  // Update an existing edge
  function updateEdge(edgeId: string, updates: Partial<Edge>) {
    if (!yEdges.value) return

    const existingEdge = yEdges.value.get(edgeId)
    if (existingEdge) {
      const updatedEdge: Edge = {
        ...existingEdge,
        ...updates,
        updatedAt: new Date().toISOString(),
      }
      yEdges.value.set(edgeId, updatedEdge)
      return updatedEdge
    }
  }

  // Delete an edge
  function deleteEdge(edgeId: string) {
    if (!yEdges.value) return
    yEdges.value.delete(edgeId)
  }

  // Sync with server (for offline changes)
  async function syncWithServer() {
    if (!currentRoomId.value || !yNodes.value || !yEdges.value) return

    try {
      isSyncing.value = true

      // This is a simplified sync - in a real app, you'd want more sophisticated
      // conflict resolution and incremental sync

      // Here you would implement your sync logic with the server
      // For now, we'll just update the last sync time
      lastSyncTime.value = new Date()
    } catch (err) {
      console.error('Sync failed:', err)
      error.value = 'Sync failed'
    } finally {
      isSyncing.value = false
    }
  }

  // Clean up resources
  async function cleanup() {
    if (wsProvider.value) {
      wsProvider.value.destroy()
      wsProvider.value = null
    }

    if (indexeddbProvider.value) {
      indexeddbProvider.value.destroy()
      indexeddbProvider.value = null
    }

    if (ydoc.value) {
      ydoc.value.destroy()
      ydoc.value = null
    }

    yNodes.value = null
    yEdges.value = null
    nodes.value = []
    edges.value = []
    currentRoomId.value = null
    isConnected.value = false
    error.value = null
  }

  return {
    // State
    currentRoomId,
    nodes,
    edges,
    collaborationState,

    // Actions
    initializeRoom,
    addNode,
    updateNode,
    deleteNode,
    addEdge,
    updateEdge,
    deleteEdge,
    syncWithServer,
    cleanup,
  }
})
