import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  ConnectWorkspaceFromOAuthInputSchema,
  ConnectWorkspaceInputSchema,
  CreateNotionItemInputSchema,
  GenerateDraftRequestSchema,
  NotionOAuthStartResponseSchema,
  RecordFeedbackInputSchema,
  UpdateNotionItemInputSchema
} from "@me-social/contracts";
import { z } from "zod";
import type { AppContainer } from "../../container.js";

const FeedQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(10)
});

const RefreshFeedSchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(12)
});

const NotionDatabaseListSchema = z.object({
  token: z.string().min(1)
});

async function requireAuth(container: AppContainer, request: FastifyRequest) {
  return container.authVerifier.verify(request.headers.authorization);
}

export async function registerRoutes(app: FastifyInstance, container: AppContainer) {
  app.get("/health", async () => ({
    status: "ok"
  }));

  app.get("/notion/oauth/callback", async (request, reply) => {
    const query = z
      .object({
        code: z.string().optional(),
        state: z.string().optional(),
        error: z.string().optional()
      })
      .safeParse(request.query);

    if (!query.success) {
      return reply.code(400).send({ error: query.error.flatten() });
    }

    const redirectUrl = await container.notionOAuthService.handleOAuthCallback(
      query.data.code,
      query.data.state,
      query.data.error
    );

    return reply.redirect(redirectUrl, 302);
  });

  app.get("/notion/oauth/mock-authorize", async (request, reply) => {
    const query = z.object({ state: z.string().min(1) }).safeParse(request.query);

    if (!query.success) {
      return reply.code(400).send({ error: query.error.flatten() });
    }

    const redirectUrl = await container.notionOAuthService.handleMockAuthorization(query.data.state);
    return reply.redirect(redirectUrl, 302);
  });

  app.get("/session/bootstrap", async (request) => {
    const auth = await requireAuth(container, request);
    return container.workspaceService.bootstrap(auth.userId, auth.email);
  });

  app.get("/notion/oauth/start", async (request, reply) => {
    const auth = await requireAuth(container, request);
    const response = await container.notionOAuthService.createAuthorizationStart(auth.userId);
    const parsed = NotionOAuthStartResponseSchema.safeParse(response);

    if (!parsed.success) {
      return reply.code(500).send({ error: parsed.error.flatten() });
    }

    return parsed.data;
  });

  app.get("/notion/oauth/session/:id", async (request, reply) => {
    const auth = await requireAuth(container, request);
    const params = z.object({ id: z.string().min(1) }).safeParse(request.params);

    if (!params.success) {
      return reply.code(400).send({ error: params.error.flatten() });
    }

    const session = await container.notionOAuthService.getSession(auth.userId, params.data.id);
    return { session };
  });

  app.post("/notion/databases/list", async (request, reply) => {
    const body = NotionDatabaseListSchema.safeParse(request.body);

    if (!body.success) {
      return reply.code(400).send({ error: body.error.flatten() });
    }

    const databases = await container.notionClient.listDatabases(body.data.token);
    return { items: databases };
  });

  app.post("/workspace/connection", async (request, reply) => {
    const auth = await requireAuth(container, request);
    const body = ConnectWorkspaceInputSchema.safeParse(request.body);

    if (!body.success) {
      return reply.code(400).send({ error: body.error.flatten() });
    }

    const connection = await container.workspaceService.connect(auth.userId, body.data);
    return { connection };
  });

  app.post("/workspace/connection/oauth", async (request, reply) => {
    const auth = await requireAuth(container, request);
    const body = ConnectWorkspaceFromOAuthInputSchema.safeParse(request.body);

    if (!body.success) {
      return reply.code(400).send({ error: body.error.flatten() });
    }

    const session = await container.notionOAuthService.consumeSession(auth.userId, body.data.oauthSessionId);
    const connection = await container.workspaceService.connect(auth.userId, {
      workspaceName: session.workspaceName,
      notionWorkspaceId: session.workspaceId,
      notionDatabaseId: body.data.notionDatabaseId,
      notionDatabaseTitle: body.data.notionDatabaseTitle,
      notionAccessToken: session.accessToken,
      mapping: body.data.mapping
    });

    return { connection };
  });

  app.post("/workspace/sync", async (request) => {
    const auth = await requireAuth(container, request);
    return container.workspaceService.sync(auth.userId);
  });

  app.get("/feed", async (request, reply) => {
    const auth = await requireAuth(container, request);
    const query = FeedQuerySchema.safeParse(request.query);

    if (!query.success) {
      return reply.code(400).send({ error: query.error.flatten() });
    }

    return container.feedService.getFeed(auth.userId, query.data.cursor ?? null, query.data.limit);
  });

  app.post("/feed/refresh", async (request, reply) => {
    const auth = await requireAuth(container, request);
    const body = RefreshFeedSchema.safeParse(request.body ?? {});

    if (!body.success) {
      return reply.code(400).send({ error: body.error.flatten() });
    }

    try {
      await container.workspaceService.sync(auth.userId);
    } catch {
      // Refresh can still succeed from the local mirror even if sync is unavailable.
    }

    const items = await container.feedService.refreshFeed(auth.userId, body.data.limit);
    return { items };
  });

  app.get("/cards/:id", async (request, reply) => {
    const auth = await requireAuth(container, request);
    const params = z.object({ id: z.string().min(1) }).safeParse(request.params);

    if (!params.success) {
      return reply.code(400).send({ error: params.error.flatten() });
    }

    const card = await container.feedService.getCard(auth.userId, params.data.id);

    if (!card) {
      return reply.code(404).send({ error: "Card not found" });
    }

    return { card };
  });

  app.post("/cards/:id/feedback", async (request, reply) => {
    const auth = await requireAuth(container, request);
    const params = z.object({ id: z.string().min(1) }).safeParse(request.params);
    const body = RecordFeedbackInputSchema.safeParse(request.body);

    if (!params.success || !body.success) {
      return reply.code(400).send({
        error: {
          params: params.success ? null : params.error.flatten(),
          body: body.success ? null : body.error.flatten()
        }
      });
    }

    const feedback = await container.feedbackService.record(auth.userId, params.data.id, body.data.action);
    return { feedback };
  });

  app.post("/drafts/generate", async (request, reply) => {
    const auth = await requireAuth(container, request);
    const body = GenerateDraftRequestSchema.safeParse(request.body);

    if (!body.success) {
      return reply.code(400).send({ error: body.error.flatten() });
    }

    const draft = await container.draftService.generate(auth.userId, body.data);
    return { draft };
  });

  app.post("/notion/items", async (request, reply) => {
    const auth = await requireAuth(container, request);
    const body = CreateNotionItemInputSchema.safeParse(request.body);

    if (!body.success) {
      return reply.code(400).send({ error: body.error.flatten() });
    }

    const item = await container.notionMutationService.create(auth.userId, body.data);
    return { item };
  });

  app.patch("/notion/items/:id", async (request, reply) => {
    const auth = await requireAuth(container, request);
    const params = z.object({ id: z.string().min(1) }).safeParse(request.params);
    const body = UpdateNotionItemInputSchema.safeParse(request.body);

    if (!params.success || !body.success) {
      return reply.code(400).send({
        error: {
          params: params.success ? null : params.error.flatten(),
          body: body.success ? null : body.error.flatten()
        }
      });
    }

    const item = await container.notionMutationService.update(auth.userId, params.data.id, body.data);
    return { item };
  });

  app.post("/notion/items/:id/archive", async (request, reply) => {
    const auth = await requireAuth(container, request);
    const params = z.object({ id: z.string().min(1) }).safeParse(request.params);

    if (!params.success) {
      return reply.code(400).send({ error: params.error.flatten() });
    }

    const item = await container.notionMutationService.archive(auth.userId, params.data.id);
    return { item };
  });
}
