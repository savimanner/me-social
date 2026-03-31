import {
  DraftService,
  FeedbackService,
  FeedService,
  NotionMutationService,
  type NotionClient,
  WorkspaceService
} from "@me-social/core";
import { Pool } from "pg";
import { DevAuthVerifier } from "./auth/auth-verifier.js";
import { SupabaseAuthVerifier } from "./auth/supabase-auth-verifier.js";
import type { Env } from "./env.js";
import { MockLlmProvider } from "./integrations/llm/mock-llm-provider.js";
import { OpenRouterProvider } from "./integrations/llm/openrouter-provider.js";
import { LiveNotionClient } from "./integrations/notion/live-notion-client.js";
import { MockNotionClient } from "./integrations/notion/mock-notion-client.js";
import { InMemoryWorkspaceRepository } from "./repositories/in-memory-workspace-repository.js";
import { PostgresWorkspaceRepository } from "./repositories/postgres-workspace-repository.js";
import { NotionOAuthService } from "./services/notion-oauth-service.js";

export function createContainer(env: Env) {
  const repository = env.DATABASE_URL
    ? new PostgresWorkspaceRepository(new Pool({ connectionString: env.DATABASE_URL }))
    : new InMemoryWorkspaceRepository();

  const notionClient: NotionClient =
    env.NOTION_MODE === "live" ? new LiveNotionClient() : new MockNotionClient();
  const llmProvider = env.OPENROUTER_API_KEY ? new OpenRouterProvider(env) : new MockLlmProvider();

  const authVerifier =
    env.SUPABASE_JWKS_URL && env.SUPABASE_ISSUER
      ? new SupabaseAuthVerifier(
          env.SUPABASE_JWKS_URL,
          env.SUPABASE_ISSUER || undefined,
          env.SUPABASE_AUDIENCE || undefined,
          env.DEV_DEFAULT_USER_ID,
          env.DEV_DEFAULT_EMAIL
        )
      : new DevAuthVerifier(env.DEV_DEFAULT_USER_ID, env.DEV_DEFAULT_EMAIL);

  return {
    authVerifier,
    repository,
    workspaceService: new WorkspaceService(repository, notionClient),
    feedService: new FeedService(repository, llmProvider),
    feedbackService: new FeedbackService(repository),
    draftService: new DraftService(repository, llmProvider),
    notionMutationService: new NotionMutationService(repository, notionClient),
    notionOAuthService: new NotionOAuthService(env, notionClient, repository),
    notionClient
  };
}

export type AppContainer = ReturnType<typeof createContainer>;
