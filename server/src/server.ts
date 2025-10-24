import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import { setupWSConnection } from "y-websocket/bin/utils";

import { env } from "./config/env.js";
import { errorHandler } from "./utils/errors.js";
import { responseHandler } from "./utils/response.js";
import { roomRoutes } from "./routes/roomRoutes.js";
import { nodeRoutes } from "./routes/nodeRoutes.js";
import { edgeRoutes } from "./routes/edgeRoutes.js";
import { registerSwagger } from "./config/swagger.js";

// Create Fastify instance
const fastify = Fastify({
  logger:
    env.NODE_ENV === "production"
      ? { level: "info" }
      : {
          level: "debug",
          transport: {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "HH:MM:ss Z",
              ignore: "pid,hostname",
            },
          },
        },
});

// Register plugins
async function registerPlugins(): Promise<void> {
  // CORS
  await fastify.register(cors, {
    origin:
      env.NODE_ENV === "production"
        ? ["https://collaboration-canvas.vercel.app"]
        : true, // Allow all origins in development
    credentials: true,
  });

  // WebSocket plugin
  await fastify.register(websocket);

  // Response handler middleware
  fastify.addHook("onRequest", responseHandler);

  // Swagger / OpenAPI
  await registerSwagger(fastify);
}

// Register routes
async function registerRoutes(): Promise<void> {
  // API routes
  await fastify.register(roomRoutes, { prefix: "/api/rooms" });
  await fastify.register(nodeRoutes, { prefix: "/api/nodes" });
  await fastify.register(edgeRoutes, { prefix: "/api/edges" });

  // Health check endpoint
  fastify.get("/health", async () => {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: env.NODE_ENV,
    };
  });

  // WebSocket endpoint for Yjs
  fastify.register(async function (fastify) {
    fastify.get("/ws", { websocket: true }, (socket, request) => {
      setupWSConnection(socket as any, request.raw);
    });
    fastify.get("/ws/*", { websocket: true }, (socket, request) => {
      setupWSConnection(socket as any, request.raw);
    });
  });
}

// Error handling
function setupErrorHandling(): void {
  fastify.setErrorHandler(errorHandler as any);

  // Handle uncaught exceptions
  process.on("uncaughtException", (error) => {
    fastify.log.fatal(error, "Uncaught exception");
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on("unhandledRejection", (reason, promise) => {
    fastify.log.fatal({ reason, promise }, "Unhandled promise rejection");
    process.exit(1);
  });
}

// Start server
async function start(): Promise<void> {
  try {
    // Setup
    await registerPlugins();
    await registerRoutes();
    setupErrorHandling();

    // Start listening
    const address = await fastify.listen({
      port: env.PORT,
      host: env.HOST,
    });

    fastify.log.info(`Server listening at ${address}`);
    fastify.log.info(`WebSocket endpoint: ws://${env.HOST}:${env.PORT}/ws`);
    fastify.log.info(`Health check: http://${env.HOST}:${env.PORT}/health`);
  } catch (error) {
    fastify.log.fatal(error, "Failed to start server");
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}

export { fastify, start };
export default fastify;
