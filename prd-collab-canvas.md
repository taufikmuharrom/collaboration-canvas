# 🧩 Product Requirements Document (PRD)

## 1. Overview

**Product Name:** Collaborative Node Canvas  
**Objective:**  
Build a **minimal collaborative node canvas application** that allows multiple users to create, connect, and edit nodes in real time. The app should support **multi-room collaboration**, **offline mode**, and **synchronization between local and remote data** using best practices.

---

## 2. Goals & Non-Goals

### 🎯 Goals

- Enable users to collaborate on node-based canvases in real time.
- Allow multiple rooms (each with an isolated collaboration session).
- Provide a smooth offline experience with automatic sync upon reconnection.
- Maintain consistent state between **client (Yjs + IndexedDB)** and **database (PostgreSQL via Prisma)**.
- Provide a clean and minimal UI for node creation, editing, and connection management.

### 🚫 Non-Goals

- No advanced permissions or role-based access control (for MVP).
- No custom node components beyond basic text or block types.
- No versioning or history tracking for this initial release.

---

## 3. Core Features

### 3.1 Room Management

- **List all rooms** the user can join.
- Each room corresponds to a **separate Y-WebSocket instance**.
- **Create / Delete rooms** (CRUD support).
- Sidebar displays **Room List** for quick switching.

### 3.2 Node Management

- **Create, Read, Update, Delete (CRUD)** operations for nodes.
- Each node contains basic metadata (e.g., id, label, position, data).
- Nodes are synced via Yjs (collaborative document).

### 3.3 Edge Management

- **CRUD operations** for edges.
- Allow connecting and disconnecting nodes visually.
- Update edge relationships automatically when nodes move or are deleted.

### 3.4 Collaboration & Synchronization

- **Real-time updates** via Yjs and y-websocket.
- Each room maintains its own Yjs document.
- **Y-IndexedDB** ensures offline persistence.
- Automatic **sync between local (Yjs state)** and **remote DB** using Fastify + Prisma.
- Implement **debounce + transaction-safe sync logic** to avoid conflicts.

### 3.5 Offline Mode

- When offline, changes are stored locally using **Y-IndexedDB**.
- When reconnected, the client automatically **merges and syncs changes** with the server.

### 3.6 UI / UX

- **Sidebar layout:**
  - Top section: Add node button.
  - Middle section: Room list.
  - Bottom section: Connection/Sync status indicator.
- Canvas area for node and edge manipulation.
- Responsive layout using **Tailwind CSS v4**.

---

## 4. Technical Stack

| Layer                   | Technology                  | Purpose                           |
| ----------------------- | --------------------------- | --------------------------------- |
| **Frontend**            | Vue 3 (latest) - TypeScript | Main UI framework                 |
| **Canvas**              | Vue Flow                    | Node-based editor & visualization |
| **State Management**    | Pinia                       | Centralized store management      |
| **Collaboration**       | Yjs + y-websocket           | Real-time CRDT-based syncing      |
| **Offline Persistence** | y-indexeddb                 | Local data storage and recovery   |
| **Backend**             | Fastify (TypeScript)        | REST + WebSocket API layer        |
| **Database**            | PostgreSQL (Neon)           | Persistent data storage           |
| **ORM**                 | Prisma                      | Database modeling and access      |
| **Styling**             | Tailwind CSS v4             | Modern utility-first styling      |

---

## 5. System Architecture

### Frontend

- Vue 3 app using **Composition API** and **Pinia**.
- Vue Flow for rendering and editing nodes/edges.
- Yjs handles document state and CRDT synchronization.
- IndexedDB for offline data caching.

### Backend

- Fastify provides APIs for:
  - Room CRUD (create, list, delete).
  - Node/Edge CRUD endpoints (used for initial sync and persistence).
- Integrates with Prisma ORM for PostgreSQL access.
- Y-WebSocket server handles real-time collaboration sessions.

### Database Schema (Conceptual)

\`\`\`prisma
model Room {
id String @id @default(cuid())
name String
nodes Node[]
edges Edge[]
createdAt DateTime @default(now())
}

model Node {
id String @id @default(cuid())
roomId String
label String
positionX Float
positionY Float
data Json
updatedAt DateTime @updatedAt
room Room @relation(fields: [roomId], references: [id])
}

model Edge {
id String @id @default(cuid())
roomId String
sourceId String
targetId String
data Json
room Room @relation(fields: [roomId], references: [id])
}
\`\`\`

---

## 6. Sync Strategy

1. **Local-first updates** using Yjs.
2. **Persist updates** periodically or on disconnect via Fastify API.
3. **Reconciliation logic** ensures that the DB matches Yjs state after reconnect.
4. Implement optimistic UI updates for smoother collaboration.

---

## 7. MVP Scope

✅ Multi-room system with live collaboration  
✅ Node and edge CRUD  
✅ Offline persistence and resync  
✅ Minimal UI (sidebar + canvas)  
✅ Fastify + Prisma integration

---

## 8. Future Enhancements (Post-MVP)

- User authentication and room permissions.
- Node types with custom data templates.
- Undo/redo and version history.
- Commenting and activity log.
- Export/import canvas state as JSON.
