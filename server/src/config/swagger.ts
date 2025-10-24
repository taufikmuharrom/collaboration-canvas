import type { FastifyInstance } from "fastify";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { env } from "./env.js";

export async function registerSwagger(fastify: FastifyInstance): Promise<void> {
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: "Collaboration Canvas API",
        description:
          "OpenAPI documentation for Rooms, Nodes, and Edges management.",
        version: "1.0.0",
      },
      servers: [
        {
          url: `http://${env.HOST}:${env.PORT}/api`,
          description: "Local development server (API base)",
        },
      ],
      tags: [
        { name: "Rooms", description: "Room management endpoints" },
        { name: "Nodes", description: "Node management endpoints" },
        { name: "Edges", description: "Edge management endpoints" },
      ],
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: "/api/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: true,
    },
    uiHooks: {
      onRequest: (_request, _reply, done) => done(),
      preHandler: (_request, _reply, done) => done(),
    },
    staticCSP: true,
  });
}