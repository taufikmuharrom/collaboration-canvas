<template>
  <div class="h-screen flex bg-gray-50">
    <!-- Sidebar -->
    <div class="w-72 bg-white shadow-lg border-r border-gray-200 flex flex-col">
      <!-- Header -->
      <div class="p-6 border-b border-gray-200">
        <h1 class="text-2xl font-bold text-gray-900 mb-2">Collaboration Canvas</h1>
        <p class="text-sm text-gray-600">Real-time collaborative workspace</p>
      </div>

      <!-- Connection Status -->
      <div class="px-6 py-3 border-b border-gray-100">
        <div class="flex items-center gap-2">
          <div
            class="w-2 h-2 rounded-full"
            :class="{
              'bg-green-500': getConnectionStatus() === 'Connected',
              'bg-yellow-500': getConnectionStatus() === 'Connecting...',
              'bg-red-500': getConnectionStatus() === 'Offline',
            }"
          ></div>
          <span class="text-sm font-medium text-gray-700">{{ getConnectionStatus() }}</span>
        </div>
      </div>

      <!-- Room Management -->
      <div class="flex-1 overflow-y-auto">
        <!-- Create Room Section -->
        <div class="p-6 border-b border-gray-100">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Create Room</h3>
          <div class="flex gap-2">
            <input
              v-model="newRoomName"
              @keyup.enter="createRoom"
              placeholder="Enter room name..."
              class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
            <button
              @click="createRoom"
              :disabled="!newRoomName.trim()"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              Create
            </button>
          </div>
        </div>

        <!-- Rooms List -->
        <div class="p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Rooms</h3>
          <div class="space-y-2">
            <div
              v-for="room in rooms"
              :key="room.id"
              class="group flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer"
              :class="{
                'bg-blue-100 border-blue-400': currentRoomId === room.id,
                'bg-white': currentRoomId !== room.id,
              }"
              @click="switchRoom(room.id)"
            >
              <div class="flex-1">
                <h4 class="font-medium text-gray-900">{{ room.name }}</h4>
                <p class="text-xs text-gray-500 mt-1">
                  Created {{ new Date(room.createdAt).toLocaleDateString() }}
                </p>
              </div>
              <div
                class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <button
                  @click.stop="deleteRoom(room.id)"
                  class="p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded transition-colors"
                  title="Delete room"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    ></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div v-if="rooms.length === 0" class="text-center py-8">
            <p class="text-sm text-gray-500">No rooms yet</p>
          </div>
        </div>

        <!-- Canvas Controls -->
        <div v-if="currentRoomId" class="p-6 border-t border-gray-100">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Canvas Tools</h3>
          <div class="space-y-3">
            <button
              @click="addNewNode"
              class="w-full flex items-center gap-3 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                ></path>
              </svg>
              Add Node
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Canvas Area -->
    <div class="flex-1 relative">
      <div v-if="!currentRoomId" class="h-full flex items-center justify-center bg-gray-100">
        <div class="text-center">
          <h2 class="text-xl font-semibold text-gray-700 mb-2">Select a Room</h2>
          <p class="text-gray-500">Choose a room from the sidebar to start collaborating</p>
        </div>
      </div>

      <VueFlow
        v-else
        v-model:nodes="nodes"
        v-model:edges="edges"
        @nodes-change="onNodesChange"
        @edges-change="onEdgesChange"
        @connect="onConnect"
        @node-drag-stop="onNodeDragStop"
        class="vue-flow-canvas h-full"
        :default-viewport="{ zoom: 1 }"
        :min-zoom="0.2"
        :max-zoom="4"
        fit-view-on-init
      >
        <Background pattern="dots" :gap="20" />
        <Controls />
        <MiniMap />

        <!-- Custom Node Template -->
      </VueFlow>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { VueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import type { NodeChange, EdgeChange, Connection, NodeDragEvent } from '@vue-flow/core'
import { useCollaborationStore } from '@/stores/collaboration'
import { api } from '@/services/api'
import type { Room } from '@/types'
import { storeToRefs } from 'pinia'

// Store
const collaborationStore = useCollaborationStore()

// Reactive state
const rooms = ref<Room[]>([])
const newRoomName = ref('')
const selectedNodes = ref<string[]>([])

const selectedEdges = ref<string[]>([])

// Computed
const { nodes, edges, currentRoomId, collaborationState } = storeToRefs(collaborationStore)
const nodeCounter = ref(1)

// Methods
function getConnectionStatus() {
  if (!collaborationState.value.isOnline) return 'Offline'
  if (!collaborationState.value.isConnected) return 'Connecting...'
  return 'Connected'
}

async function loadRooms() {
  try {
    const response = await api.rooms.getRooms()
    if (response.success && response.data) {
      rooms.value = response.data
    }
  } catch (error) {
    console.error('Failed to load rooms:', error)
  }
}

async function createRoom() {
  if (!newRoomName.value.trim()) return

  try {
    const response = await api.rooms.createRoom({ name: newRoomName.value.trim() })
    if (response.success && response.data) {
      rooms.value.push(response.data)
      newRoomName.value = ''
      // Automatically switch to the new room
      await switchRoom(response.data.id)
    }
  } catch (error) {
    console.error('Failed to create room:', error)
  }
}

async function deleteRoom(roomId: string) {
  if (!confirm('Are you sure you want to delete this room?')) return

  try {
    const response = await api.rooms.deleteRoom(roomId)
    if (response.success) {
      rooms.value = rooms.value.filter((room) => room.id !== roomId)
      if (currentRoomId.value === roomId) {
        await collaborationStore.cleanup()
      }
    }
  } catch (error) {
    console.error('Failed to delete room:', error)
  }
}

async function switchRoom(roomId: string) {
  if (roomId === currentRoomId.value) return

  try {
    await collaborationStore.initializeRoom(roomId)
  } catch (error) {
    console.error('Failed to switch room:', error)
  }
}

async function addNewNode() {
  if (!currentRoomId.value) return

  collaborationStore.addNode({
    roomId: currentRoomId.value,
    label: `Node ${nodeCounter.value++}`,
    positionX: Math.random() * 400 + 100,
    positionY: Math.random() * 300 + 100,
    data: {},
  })
}

// Vue Flow event handlers
function onNodesChange(changes: NodeChange[]) {
  changes.forEach((change) => {
    if (change.type === 'select') {
      if (change.selected) {
        if (!selectedNodes.value.includes(change.id)) {
          selectedNodes.value.push(change.id)
        }
      } else {
        selectedNodes.value = selectedNodes.value.filter((id) => id !== change.id)
      }
    }
  })
}

function onEdgesChange(changes: EdgeChange[]) {
  changes.forEach((change) => {
    if (change.type === 'select') {
      if (change.selected) {
        if (!selectedEdges.value.includes(change.id)) {
          selectedEdges.value.push(change.id)
        }
      } else {
        selectedEdges.value = selectedEdges.value.filter((id) => id !== change.id)
      }
    }
  })
}

async function onConnect(connection: Connection) {
  if (connection.source && connection.target && currentRoomId.value) {
    await collaborationStore.addEdge({
      roomId: currentRoomId.value,
      sourceId: connection.source,
      targetId: connection.target,
      data: {},
    })
  }
}

watch(currentRoomId, async (newRoomId) => {
  if (newRoomId) {
    console.log('Switching to room:', newRoomId)
  }
})

async function onNodeDragStop(event: NodeDragEvent) {
  const tasks = (event.nodes ?? []).map((node) => {
    const x = node.position?.x ?? 0
    const y = node.position?.y ?? 0
    return collaborationStore.updateNode(node.id, { positionX: x, positionY: y })
  })
  await Promise.all(tasks)
}

// Keyboard event handlers
async function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Delete' || event.key === 'Backspace') {
    // Delete selected nodes
    for (const nodeId of selectedNodes.value) {
      await collaborationStore.deleteNode(nodeId)
    }

    // Delete selected edges
    for (const edgeId of selectedEdges.value) {
      await collaborationStore.deleteEdge(edgeId)
    }

    // Clear selections
    selectedNodes.value = []
    selectedEdges.value = []
  }
}

// Lifecycle
onMounted(async () => {
  await loadRooms()

  // Initialize with first room if available
  if (rooms.value && rooms.value.length > 0 && rooms.value[0]) {
    await switchRoom(rooms.value[0].id)
  }

  // Add keyboard event listener
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  collaborationStore.cleanup()
  // Remove keyboard event listener
  document.removeEventListener('keydown', handleKeyDown)
})
</script>

<style>
/* these are necessary styles for vue flow */
@import '@vue-flow/core/dist/style.css';

/* this contains the default theme, these are optional styles */
@import '@vue-flow/core/dist/theme-default.css';
</style>
