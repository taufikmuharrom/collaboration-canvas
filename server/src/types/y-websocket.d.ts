declare module 'y-websocket/bin/utils' {
  import type { IncomingMessage } from 'http';
  import type { WebSocket } from 'ws';
  export function setupWSConnection(ws: WebSocket, req: IncomingMessage): void;
}