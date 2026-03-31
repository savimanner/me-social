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

export interface WorkspaceRepository {
  getConnection(userId: string): Promise<WorkspaceConnection | null>;
  upsertConnection(userId: string, input: ConnectWorkspaceInput): Promise<WorkspaceConnection>;
  updateConnectionSyncTime(connectionId: string, lastSyncedAt: string): Promise<void>;
  listSourceItems(workspaceId: string): Promise<SourceItem[]>;
  getSourceItem(workspaceId: string, itemId: string): Promise<SourceItem | null>;
  upsertSourceItems(items: SourceItem[]): Promise<void>;
  createSourceItem(item: SourceItem): Promise<SourceItem>;
  updateSourceItem(
    workspaceId: string,
    itemId: string,
    patch: UpdateNotionItemInput & { updatedAt: string }
  ): Promise<SourceItem>;
  archiveSourceItem(workspaceId: string, itemId: string, archivedAt: string): Promise<SourceItem>;
  listFeedCards(userId: string, cursor: string | null, limit: number): Promise<FeedPage>;
  getFeedCard(userId: string, cardId: string): Promise<FeedCard | null>;
  saveFeedCards(cards: FeedCard[]): Promise<void>;
  listFeedback(userId: string): Promise<UserFeedback[]>;
  recordFeedback(feedback: UserFeedback): Promise<void>;
  saveDraft(draft: DraftEdit): Promise<DraftEdit>;
  saveNotionOAuthState(state: NotionOAuthState): Promise<NotionOAuthState>;
  consumeNotionOAuthState(state: string): Promise<NotionOAuthState | null>;
  saveNotionOAuthSession(session: NotionOAuthSession): Promise<NotionOAuthSession>;
  getNotionOAuthSession(userId: string, sessionId: string): Promise<NotionOAuthSession | null>;
  consumeNotionOAuthSession(userId: string, sessionId: string): Promise<NotionOAuthSession | null>;
}
