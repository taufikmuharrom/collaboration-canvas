import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { IndexeddbPersistence } from 'y-indexeddb'
import type { Node, Edge, FlowNode, FlowEdge, CollaborationState } from '@/types'
import type { UpdateNodeRequest } from '@/types'
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

  watch(isOnline, (newState) => {
    if (newState) {
      console.log('ONLINE - Starting sync...')
      syncWithServer()
    } else {
      console.log('OFFLINE')
    }
  })

  // Initialize collaboration for a room
  async function initializeRoom(roomId: string) {
    try {
      // Clean up existing connections
      await cleanup()

      currentRoomId.value = roomId
      error.value = null

      // Load offline queue from localStorage
      loadOfflineQueue()

      // Create new Yjs document
      ydoc.value = new Y.Doc()

      // Initialize Yjs maps
      yNodes.value = ydoc.value.getMap('nodes')
      yEdges.value = ydoc.value.getMap('edges')

      // Set up IndexedDB persistence (offline storage)
      indexeddbProvider.value = new IndexeddbPersistence(`room-${roomId}`, ydoc.value)

      // Set up WebSocket provider (real-time collaboration)
      wsProvider.value = new WebsocketProvider(WS_URL, `room-${roomId}`, ydoc.value)

      // Wait for initial content to be loaded from IndexedDB
      indexeddbProvider.value?.once('synced', () => {
        console.log('initial content loaded', yNodes.value?.toJSON())
      })

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
    if (!yNodes.value || !yEdges.value || !isOnline.value) return

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
  async function addNode(node: Omit<Node, 'id' | 'createdAt' | 'updatedAt'>) {
    if (!yNodes.value || !currentRoomId.value) return
    
    if (!isOnline.value) {
      const dummyNode: Node = {
        ...node,
        id: `temporary-${Date.now()}-${Math.random().toString(36)}`,
        roomId: currentRoomId.value,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      yNodes.value.set(dummyNode.id, dummyNode)
      
      // Add to offline queue for later sync
      addToOfflineQueue({
        type: 'create_node',
        data: dummyNode,
        roomId: currentRoomId.value
      })
      
      return dummyNode
    }
    // Persist to database first to get canonical cuid ID
    try {
      const res = await api.nodes.createNode({
        roomId: currentRoomId.value,
        label: node.label,
        positionX: node.positionX,
        positionY: node.positionY,
        data: node.data,
      })
      if (res.success && res.data) {
        const created = res.data
        const createdNode: Node = {
          id: created.id,
          roomId: created.roomId,
          label: created.label,
          positionX: created.positionX,
          positionY: created.positionY,
          data: created.data ?? {},
          createdAt: created.createdAt,
          updatedAt: created.updatedAt,
        }
        // Update Yjs for real-time collaboration with server ID
        yNodes.value.set(createdNode.id, createdNode)
        return createdNode
      }
    } catch (error) {
      console.error('Failed to persist node to database:', error)
      // Fallback: create a local ephemeral node (not persisted)
      const ephemeral: Node = {
        ...node,
        id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        roomId: currentRoomId.value,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      yNodes.value.set(ephemeral.id, ephemeral)
      return ephemeral
    }
  }

  // Update an existing node
  async function updateNode(nodeId: string, updates: Partial<Node>) {
    if (!yNodes.value || !currentRoomId.value) return

    const existingNode = yNodes.value.get(nodeId)
    if (existingNode) {
      // Optimistic local/Yjs update for real-time collaboration
      const updatedNode: Node = {
        ...existingNode,
        ...updates,
        updatedAt: new Date().toISOString(),
      }
      yNodes.value.set(nodeId, updatedNode)

      // Persist to server: use focused API when only position changes
      try {
        const posXPresent = updates.positionX !== undefined
        const posYPresent = updates.positionY !== undefined
        const onlyPosition =
          (posXPresent || posYPresent) && updates.label === undefined && updates.data === undefined

        if (onlyPosition) {
          const res = await api.nodes.updateNodePosition(
            currentRoomId.value,
            nodeId,
            updates.positionX ?? existingNode.positionX,
            updates.positionY ?? existingNode.positionY,
          )
          if (res.success && res.data) {
            yNodes.value.set(nodeId, res.data)
          }
        } else {
          const payload: UpdateNodeRequest = {}
          if (updates.label !== undefined) payload.label = updates.label
          if (updates.positionX !== undefined) payload.positionX = updates.positionX
          if (updates.positionY !== undefined) payload.positionY = updates.positionY
          if (updates.data !== undefined) payload.data = updates.data

          const res = await api.nodes.updateNode(currentRoomId.value, nodeId, payload)
          if (res.success && res.data) {
            const serverNode = res.data
            const reconciled: Node = {
              id: serverNode.id,
              roomId: serverNode.roomId,
              label: serverNode.label,
              positionX: serverNode.positionX,
              positionY: serverNode.positionY,
              data: serverNode.data ?? {},
              createdAt: serverNode.createdAt,
              updatedAt: serverNode.updatedAt,
            }
            // Update Yjs with server canonical values
            yNodes.value.set(nodeId, reconciled)
          }
        }
      } catch (error) {
        console.error('Failed to persist node update:', error)
      }

      return updatedNode
    }
  }

  // Delete a node
  async function deleteNode(nodeId: string) {
    if (!yNodes.value || !yEdges.value) return

    // Remove the node from Yjs
    yNodes.value.delete(nodeId)

    // Remove all edges connected to this node from Yjs
    const edgesToDelete: string[] = []
    yEdges.value.forEach((edge, edgeId) => {
      if (edge.sourceId === nodeId || edge.targetId === nodeId) {
        edgesToDelete.push(edgeId)
      }
    })

    edgesToDelete.forEach((edgeId) => {
      yEdges.value!.delete(edgeId)
    })

    // Persist deletion to database
    try {
      await api.nodes.deleteNode(currentRoomId.value!, nodeId)
      // Delete connected edges from database
      for (const edgeId of edgesToDelete) {
        await api.edges.deleteEdge(currentRoomId.value!, edgeId)
      }
    } catch (error) {
      console.error('Failed to delete node from database:', error)
    }
  }

  // Add a new edge
  async function addEdge(edge: Omit<Edge, 'id' | 'createdAt' | 'updatedAt'>) {
    if (!yEdges.value || !currentRoomId.value) return

    // Optimistic: add ephemeral edge to Yjs immediately for UI responsiveness
    const ephemeral: Edge = {
      ...edge,
      id: `edge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      roomId: currentRoomId.value,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    yEdges.value.set(ephemeral.id, ephemeral)

    // Persist to database and reconcile ID
    try {
      const res = await api.edges.createEdge({
        roomId: currentRoomId.value,
        sourceId: edge.sourceId,
        targetId: edge.targetId,
        data: edge.data,
      })
      if (res.success && res.data) {
        const created = res.data
        const createdEdge: Edge = {
          id: created.id,
          roomId: created.roomId,
          sourceId: created.sourceId,
          targetId: created.targetId,
          data: created.data ?? {},
          createdAt: created.createdAt,
          updatedAt: created.updatedAt,
        }
        // Replace ephemeral with canonical server edge
        yEdges.value.set(createdEdge.id, createdEdge)
        yEdges.value.delete(ephemeral.id)
        return createdEdge
      }
    } catch (error) {
      console.error('Failed to persist edge to database:', error)
      // Keep ephemeral edge for offline use
      return ephemeral
    }
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
  async function deleteEdge(edgeId: string) {
    if (!yEdges.value) return

    // Remove from Yjs
    yEdges.value.delete(edgeId)

    // Persist deletion to database
    try {
      await api.edges.deleteEdge(currentRoomId.value!, edgeId)
    } catch (error) {
      console.error('Failed to delete edge from database:', error)
    }
  }

  // Sync with server (for offline changes)
  async function syncWithServer() {
    if (!currentRoomId.value || !yNodes.value || !yEdges.value) return

    try {
      isSyncing.value = true

      // Process offline queue
      if (offlineQueue.value.length > 0) {
        console.log(`Processing ${offlineQueue.value.length} offline operations`)
        
        for (const operation of offlineQueue.value) {
          try {
            switch (operation.type) {
              case 'create_node':
                const nodeData = operation.data as Node
                const res = await api.nodes.createNode({
                  roomId: operation.roomId,
                  label: nodeData.label,
                  positionX: nodeData.positionX,
                  positionY: nodeData.positionY,
                  data: nodeData.data,
                })
                if (res.success && res.data) {
                  // Replace temporary node with server node
                  yNodes.value.delete(nodeData.id)
                  const serverNode: Node = {
                    id: res.data.id,
                    roomId: res.data.roomId,
                    label: res.data.label,
                    positionX: res.data.positionX,
                    positionY: res.data.positionY,
                    data: res.data.data ?? {},
                    createdAt: res.data.createdAt,
                    updatedAt: res.data.updatedAt,
                  }
                  yNodes.value.set(serverNode.id, serverNode)
                }
                break
              // Add more cases for other operations as needed
            }
          } catch (error) {
            console.error('Failed to sync operation:', operation, error)
          }
        }
        
        // Clear processed operations
        clearOfflineQueue()
      }

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

// Offline queue for sync operations
interface OfflineOperation {
  id: string
  type: 'create_node' | 'update_node' | 'delete_node' | 'create_edge' | 'update_edge' | 'delete_edge'
  data: Node | Edge | Partial<Node> | Partial<Edge> | { nodeId: string } | { edgeId: string }
  timestamp: number
  roomId: string
}

const offlineQueue = ref<OfflineOperation[]>([])

// Add operation to offline queue
function addToOfflineQueue(operation: Omit<OfflineOperation, 'id' | 'timestamp'>) {
  const queueItem: OfflineOperation = {
    ...operation,
    id: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now()
  }
  offlineQueue.value.push(queueItem)
  
  // Store in localStorage for persistence across sessions
  localStorage.setItem('collaboration-offline-queue', JSON.stringify(offlineQueue.value))
}

// Load offline queue from localStorage
function loadOfflineQueue() {
  try {
    const stored = localStorage.getItem('collaboration-offline-queue')
    if (stored) {
      offlineQueue.value = JSON.parse(stored)
    }
  } catch (error) {
    console.error('Failed to load offline queue:', error)
    offlineQueue.value = []
  }
}

// Clear offline queue
function clearOfflineQueue() {
  offlineQueue.value = []
  localStorage.removeItem('collaboration-offline-queue')
}
