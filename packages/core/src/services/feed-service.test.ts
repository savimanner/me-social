import { describe, expect, it } from "vitest";
import type {
  DraftEdit,
  FeedCard,
  FeedPage,
  NotionOAuthSession,
  NotionOAuthState,
  SourceItem,
  UpdateNotionItemInput,
  UserFeedback,
  WorkspaceConnection
} from "@me-social/contracts";
import { FeedService } from "./feed-service.js";
import type { WorkspaceRepository } from "../repositories/workspace-repository.js";
import type { LlmProvider } from "../integrations/llm/provider.js";

class TestRepository implements WorkspaceRepository {
  constructor(
    private readonly connection: WorkspaceConnection,
    private readonly items: SourceItem[]
  ) {}

  async getConnection() {
    return this.connection;
  }

  async upsertConnection() {
    return this.connection;
  }

  async updateConnectionSyncTime() {}

  async listSourceItems() {
    return this.items;
  }

  async getSourceItem(_workspaceId: string, itemId: string) {
    return this.items.find((item) => item.id === itemId) ?? null;
  }

  async upsertSourceItems() {}

  async createSourceItem(item: SourceItem) {
    return item;
  }

  async updateSourceItem(_workspaceId: string, itemId: string, patch: UpdateNotionItemInput & { updatedAt: string }) {
    const item = this.items.find((entry) => entry.id === itemId);

    if (!item) {
      throw new Error("Not found");
    }

    return {
      ...item,
      ...patch,
      title: patch.title ?? item.title,
      content: patch.body ?? item.content,
      updatedAt: patch.updatedAt
    };
  }

  async archiveSourceItem(_workspaceId: string, itemId: string, archivedAt: string) {
    const item = this.items.find((entry) => entry.id === itemId);

    if (!item) {
      throw new Error("Not found");
    }

    return {
      ...item,
      status: "archived" as const,
      updatedAt: archivedAt
    };
  }

  async listFeedCards(): Promise<FeedPage> {
    return { items: [], nextCursor: null };
  }

  async getFeedCard(): Promise<FeedCard | null> {
    return null;
  }

  async saveFeedCards() {}

  async listFeedback(): Promise<UserFeedback[]> {
    return [];
  }

  async recordFeedback() {}

  async saveDraft(draft: DraftEdit) {
    return draft;
  }

  async saveNotionOAuthState(state: NotionOAuthState) {
    return state;
  }

  async consumeNotionOAuthState(): Promise<NotionOAuthState | null> {
    return null;
  }

  async saveNotionOAuthSession(session: NotionOAuthSession) {
    return session;
  }

  async getNotionOAuthSession(): Promise<NotionOAuthSession | null> {
    return null;
  }

  async consumeNotionOAuthSession(): Promise<NotionOAuthSession | null> {
    return null;
  }
}

const fixedNow = "2026-03-30T10:00:00.000Z";

function sourceItem(id: string, kind: SourceItem["kind"], title: string, tags: string[]): SourceItem {
  return {
    id,
    workspaceId: "ws_1",
    notionPageId: `page_${id}`,
    title,
    content: `${title} content`,
    kind,
    status: "active",
    tags,
    author: null,
    sourceTitle: null,
    sourceUrl: null,
    createdAt: fixedNow,
    updatedAt: fixedNow
  };
}

const provider: LlmProvider = {
  async generateFeedCard({ sources }) {
    return {
      headline: `Built from ${sources.map((item) => item.title).join(" + ")}`,
      body: "Useful generated post body",
      rationale: "Combines fresh and relevant notes",
      sources: sources.map((item) => ({
        sourceItemId: item.id,
        notionPageId: item.notionPageId,
        title: item.title,
        kind: item.kind,
        excerpt: item.content
      }))
    };
  },
  async generateDraft() {
    return {
      title: "Draft",
      body: "Draft body"
    };
  }
};

describe("FeedService", () => {
  it("generates feed cards with source traceability", async () => {
    const repository = new TestRepository(
      {
        id: "ws_1",
        userId: "user_1",
        workspaceName: "Me",
        notionWorkspaceId: "notion_ws_1",
        notionDatabaseId: "db_1",
        notionDatabaseTitle: "Notes",
        notionAccessTokenRef: "secret_ref",
        mapping: {
          title: "Title",
          content: "Content",
          kind: "Kind",
          status: "Status",
          tags: "Tags"
        },
        createdAt: fixedNow,
        updatedAt: fixedNow,
        lastSyncedAt: null
      },
      [sourceItem("1", "idea", "Atomic note", ["systems"]), sourceItem("2", "book_snippet", "Book quote", ["systems"])]
    );

    const service = new FeedService(repository, provider);
    const cards = await service.refreshFeed("user_1", 3);

    expect(cards.length).toBeGreaterThan(0);
    expect(cards[0].sources[0]?.sourceItemId).toBeTruthy();
    expect(cards[0].body).toContain("Useful");
  });
});
