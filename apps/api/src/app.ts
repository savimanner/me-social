import Fastify from "fastify";
import cors from "@fastify/cors";
import type { Env } from "./env.js";
import { createContainer } from "./container.js";
import { registerRoutes } from "./http/routes/register-routes.js";

export async function createApp(env: Env) {
  const app = Fastify({
    logger: env.NODE_ENV !== "test"
  });

  await app.register(cors, {
    origin: true
  });

  const container = createContainer(env);
  await registerRoutes(app, container);

  app.setErrorHandler((error: Error, _request, reply) => {
    app.log.error(error);
    reply.code(500).send({
      error: error.message
    });
  });

  return app;
}
