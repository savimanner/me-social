import type {
  ConnectWorkspaceInput,
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
import { createId, type WorkspaceRepository } from "@me-social/core";
import { nowIso } from "@me-social/core";

export class InMemoryWorkspaceRepository implements WorkspaceRepository {
  private readonly connectionsByUserId = new Map<string, WorkspaceConnection>();
  private readonly sourceItemsByWorkspaceId = new Map<string, SourceItem[]>();
  private readonly feedCardsByUserId = new Map<string, FeedCard[]>();
  private readonly feedbackByUserId = new Map<string, UserFeedback[]>();
  private readonly draftsByUserId = new Map<string, DraftEdit[]>();
  private readonly notionOAuthStates = new Map<string, NotionOAuthState>();
  private readonly notionOAuthSessions = new Map<string, NotionOAuthSession>();

  async getConnection(userId: string): Promise<WorkspaceConnection | null> {
    return this.connectionsByUserId.get(userId) ?? null;
  }

  async upsertConnection(userId: string, input: ConnectWorkspaceInput): Promise<WorkspaceConnection> {
    const existing = this.connectionsByUserId.get(userId);
    const timestamp = nowIso();
    const connection: WorkspaceConnection = {
      id: existing?.id ?? createId("ws"),
      userId,
      workspaceName: input.workspaceName,
      notionWorkspaceId: input.notionWorkspaceId,
      notionDatabaseId: input.notionDatabaseId,
      notionDatabaseTitle: input.notionDatabaseTitle,
      notionAccessTokenRef: input.notionAccessToken,
      mapping: input.mapping,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
      lastSyncedAt: existing?.lastSyncedAt ?? null
    };

    this.connectionsByUserId.set(userId, connection);
    return connection;
  }

  async updateConnectionSyncTime(connectionId: string, lastSyncedAt: string): Promise<void> {
    for (const [userId, connection] of this.connectionsByUserId.entries()) {
      if (connection.id === connectionId) {
        this.connectionsByUserId.set(userId, {
          ...connection,
          lastSyncedAt,
          updatedAt: lastSyncedAt
        });
      }
    }
  }

  async listSourceItems(workspaceId: string): Promise<SourceItem[]> {
    return [...(this.sourceItemsByWorkspaceId.get(workspaceId) ?? [])];
  }

  async getSourceItem(workspaceId: string, itemId: string): Promise<SourceItem | null> {
    return this.sourceItemsByWorkspaceId.get(workspaceId)?.find((item) => item.id === itemId) ?? null;
  }

  async upsertSourceItems(items: SourceItem[]): Promise<void> {
    const grouped = new Map<string, SourceItem[]>();

    for (const item of items) {
      const current = grouped.get(item.workspaceId) ?? this.sourceItemsByWorkspaceId.get(item.workspaceId) ?? [];
      const withoutItem = current.filter((entry) => entry.id !== item.id);
      grouped.set(item.workspaceId, [...withoutItem, item]);
    }

    for (const [workspaceId, workspaceItems] of grouped.entries()) {
      this.sourceItemsByWorkspaceId.set(workspaceId, workspaceItems);
    }
  }

  async createSourceItem(item: SourceItem): Promise<SourceItem> {
    const items = this.sourceItemsByWorkspaceId.get(item.workspaceId) ?? [];
    this.sourceItemsByWorkspaceId.set(item.workspaceId, [...items, item]);
    return item;
  }

  async updateSourceItem(
    workspaceId: string,
    itemId: string,
    patch: UpdateNotionItemInput & { updatedAt: string }
  ): Promise<SourceItem> {
    const items = this.sourceItemsByWorkspaceId.get(workspaceId) ?? [];
    let updated: SourceItem | null = null;

    const nextItems = items.map((item) => {
      if (item.id !== itemId) {
        return item;
      }

      updated = {
        ...item,
        title: patch.title ?? item.title,
        content: patch.body ?? item.content,
        kind: patch.kind ?? item.kind,
        tags: patch.tags ?? item.tags,
        author: patch.author === undefined ? item.author : patch.author,
        sourceTitle: patch.sourceTitle === undefined ? item.sourceTitle : patch.sourceTitle,
        sourceUrl: patch.sourceUrl === undefined ? item.sourceUrl : patch.sourceUrl,
        updatedAt: patch.updatedAt
      };

      return updated;
    });

    if (!updated) {
      throw new Error("Source item not found");
    }

    this.sourceItemsByWorkspaceId.set(workspaceId, nextItems);
    return updated;
  }

  async archiveSourceItem(workspaceId: string, itemId: string, archivedAt: string): Promise<SourceItem> {
    const items = this.sourceItemsByWorkspaceId.get(workspaceId) ?? [];
    let updated: SourceItem | null = null;

    const nextItems = items.map((item) => {
      if (item.id !== itemId) {
        return item;
      }

      updated = {
        ...item,
        status: "archived",
        updatedAt: archivedAt
      };

      return updated;
    });

    if (!updated) {
      throw new Error("Source item not found");
    }

    this.sourceItemsByWorkspaceId.set(workspaceId, nextItems);
    return updated;
  }

  async listFeedCards(userId: string, cursor: string | null, limit: number): Promise<FeedPage> {
    const items = this.feedCardsByUserId.get(userId) ?? [];
    const offset = Number(cursor ?? 0);
    const page = items.slice(offset, offset + limit);
    const nextCursor = offset + limit < items.length ? String(offset + limit) : null;
    return { items: page, nextCursor };
  }

  async getFeedCard(userId: string, cardId: string): Promise<FeedCard | null> {
    return this.feedCardsByUserId.get(userId)?.find((item) => item.id === cardId) ?? null;
  }

  async saveFeedCards(cards: FeedCard[]): Promise<void> {
    if (cards.length === 0) {
      return;
    }

    const userId = cards[0].userId;
    const current = this.feedCardsByUserId.get(userId) ?? [];
    const merged = [...current];

    for (const card of cards) {
      const existingIndex = merged.findIndex(
        (entry) => entry.userId === card.userId && entry.sourceSignature === card.sourceSignature
      );

      if (existingIndex >= 0) {
        merged[existingIndex] = {
          ...merged[existingIndex],
          ...card,
          id: merged[existingIndex]!.id
        };
      } else {
        merged.push(card);
      }
    }

    merged.sort((left, right) => right.score - left.score);
    this.feedCardsByUserId.set(userId, merged);
  }

  async listFeedback(userId: string): Promise<UserFeedback[]> {
    return [...(this.feedbackByUserId.get(userId) ?? [])];
  }

  async recordFeedback(feedback: UserFeedback): Promise<void> {
    const current = this.feedbackByUserId.get(feedback.userId) ?? [];
    this.feedbackByUserId.set(feedback.userId, [...current, feedback]);

    const cards = this.feedCardsByUserId.get(feedback.userId) ?? [];
    this.feedCardsByUserId.set(
      feedback.userId,
      cards.map((card) =>
        card.id === feedback.cardId
          ? {
              ...card,
              status:
                feedback.action === "save"
                  ? "saved"
                  : feedback.action === "dismiss"
                    ? "dismissed"
                    : "approved",
              updatedAt: feedback.createdAt
            }
          : card
      )
    );
  }

  async saveDraft(draft: DraftEdit): Promise<DraftEdit> {
    const current = this.draftsByUserId.get(draft.userId) ?? [];
    this.draftsByUserId.set(draft.userId, [...current, draft]);
    return draft;
  }

  async saveNotionOAuthState(state: NotionOAuthState): Promise<NotionOAuthState> {
    this.notionOAuthStates.set(state.state, state);
    return state;
  }

  async consumeNotionOAuthState(state: string): Promise<NotionOAuthState | null> {
    const stored = this.notionOAuthStates.get(state) ?? null;

    if (stored) {
      this.notionOAuthStates.delete(state);
    }

    return stored;
  }

  async saveNotionOAuthSession(session: NotionOAuthSession): Promise<NotionOAuthSession> {
    this.notionOAuthSessions.set(session.id, session);
    return session;
  }

  async getNotionOAuthSession(userId: string, sessionId: string): Promise<NotionOAuthSession | null> {
    const session = this.notionOAuthSessions.get(sessionId) ?? null;
    return session?.userId === userId ? session : null;
  }

  async consumeNotionOAuthSession(userId: string, sessionId: string): Promise<NotionOAuthSession | null> {
    const session = await this.getNotionOAuthSession(userId, sessionId);

    if (session) {
      this.notionOAuthSessions.delete(sessionId);
    }

    return session;
  }
}
