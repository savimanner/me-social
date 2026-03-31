import type {
  DatabaseOption,
  NotionOAuthSession,
  NotionOAuthStartResponse
} from "@me-social/contracts";
import { createId, nowIso, type NotionClient, type WorkspaceRepository } from "@me-social/core";
import type { Env } from "../env.js";

type TokenExchangeResponse = {
  access_token: string;
  workspace_id: string;
  workspace_name?: string | null;
};

export class NotionOAuthService {
  constructor(
    private readonly env: Env,
    private readonly notionClient: NotionClient,
    private readonly repository: WorkspaceRepository
  ) {}

  async createAuthorizationStart(userId: string): Promise<NotionOAuthStartResponse> {
    const state = createId("notion_state");
    await this.repository.saveNotionOAuthState({
      state,
      userId,
      createdAt: nowIso()
    });

    if (this.env.NOTION_MODE === "mock") {
      return {
        state,
        authorizationUrl: `${this.env.APP_PUBLIC_URL}/notion/oauth/mock-authorize?state=${encodeURIComponent(state)}`
      };
    }

    if (!this.env.NOTION_CLIENT_ID || !this.env.NOTION_CLIENT_SECRET || !this.env.NOTION_OAUTH_REDIRECT_URI) {
      throw new Error("Missing Notion OAuth environment variables");
    }

    const url = new URL("https://api.notion.com/v1/oauth/authorize");
    url.searchParams.set("client_id", this.env.NOTION_CLIENT_ID);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("owner", "user");
    url.searchParams.set("redirect_uri", this.env.NOTION_OAUTH_REDIRECT_URI);
    url.searchParams.set("state", state);

    return {
      state,
      authorizationUrl: url.toString()
    };
  }

  async handleMockAuthorization(state: string): Promise<string> {
    const pending = await this.consumePendingState(state);
    const databases = await this.notionClient.listDatabases("mock-token");
    const session = await this.storeSession({
      userId: pending.userId,
      workspaceId: "mock_workspace",
      workspaceName: "Mock Notion Workspace",
      accessToken: "mock-token",
      databases
    });

    return this.buildAppRedirectURL({ sessionId: session.id });
  }

  async handleOAuthCallback(code: string | undefined, state: string | undefined, error?: string): Promise<string> {
    if (error) {
      return this.buildAppRedirectURL({ error });
    }

    if (!code || !state) {
      return this.buildAppRedirectURL({ error: "missing_oauth_code" });
    }

    const pending = await this.consumePendingState(state);
    const token = await this.exchangeCodeForToken(code);
    const databases = await this.notionClient.listDatabases(token.access_token);
    const session = await this.storeSession({
      userId: pending.userId,
      workspaceId: token.workspace_id,
      workspaceName: token.workspace_name || "Notion Workspace",
      accessToken: token.access_token,
      databases
    });

    return this.buildAppRedirectURL({ sessionId: session.id });
  }

  async getSession(userId: string, sessionId: string): Promise<NotionOAuthSession> {
    const session = await this.repository.getNotionOAuthSession(userId, sessionId);

    if (!session || session.userId !== userId) {
      throw new Error("Notion OAuth session not found");
    }

    return session;
  }

  async consumeSession(userId: string, sessionId: string): Promise<NotionOAuthSession> {
    const session = await this.repository.consumeNotionOAuthSession(userId, sessionId);

    if (!session) {
      throw new Error("Notion OAuth session not found");
    }

    return session;
  }

  private async consumePendingState(state: string) {
    const pending = await this.repository.consumeNotionOAuthState(state);

    if (!pending) {
      throw new Error("Invalid Notion OAuth state");
    }

    return pending;
  }

  private async storeSession({
    userId,
    workspaceId,
    workspaceName,
    accessToken,
    databases
  }: {
    userId: string;
    workspaceId: string;
    workspaceName: string;
    accessToken: string;
    databases: DatabaseOption[];
  }): Promise<NotionOAuthSession> {
    const session: NotionOAuthSession = {
      id: createId("notion_oauth"),
      userId,
      workspaceId,
      workspaceName,
      accessToken,
      databases,
      createdAt: nowIso()
    };

    return this.repository.saveNotionOAuthSession(session);
  }

  private buildAppRedirectURL({
    sessionId,
    error
  }: {
    sessionId?: string;
    error?: string;
  }): string {
    const url = new URL(this.env.IOS_APP_CALLBACK_URI);

    if (sessionId) {
      url.searchParams.set("session_id", sessionId);
    }

    if (error) {
      url.searchParams.set("error", error);
    }

    return url.toString();
  }

  private async exchangeCodeForToken(code: string): Promise<TokenExchangeResponse> {
    const basicAuth = Buffer.from(`${this.env.NOTION_CLIENT_ID}:${this.env.NOTION_CLIENT_SECRET}`).toString("base64");
    const response = await fetch("https://api.notion.com/v1/oauth/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: this.env.NOTION_OAUTH_REDIRECT_URI
      })
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Notion OAuth exchange failed: ${message}`);
    }

    return response.json() as Promise<TokenExchangeResponse>;
  }
}
