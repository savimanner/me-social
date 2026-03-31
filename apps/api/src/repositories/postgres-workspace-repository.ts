import type {
  ConnectWorkspaceInput,
  DraftEdit,
  FeedCard,
  FeedPage,
  NotionFieldMapping,
  NotionOAuthSession,
  NotionOAuthState,
  SourceItem,
  UpdateNotionItemInput,
  UserFeedback,
  WorkspaceConnection
} from "@me-social/contracts";
import type { WorkspaceRepository } from "@me-social/core";
import { createId } from "@me-social/core";
import { Pool } from "pg";

type ConnectionRow = {
  id: string;
  user_id: string;
  workspace_name: string;
  notion_workspace_id: string;
  notion_database_id: string;
  notion_database_title: string;
  notion_access_token_ref: string;
  mapping: NotionFieldMapping;
  created_at: string;
  updated_at: string;
  last_synced_at: string | null;
};

type SourceItemRow = {
  id: string;
  workspace_id: string;
  notion_page_id: string;
  title: string;
  content: string;
  kind: SourceItem["kind"];
  status: SourceItem["status"];
  tags: string[];
  author: string | null;
  source_title: string | null;
  source_url: string | null;
  created_at: string;
  updated_at: string;
};

type FeedCardRow = {
  id: string;
  workspace_id: string;
  user_id: string;
  headline: string;
  body: string;
  rationale: string;
  status: FeedCard["status"];
  score: number;
  source_signature: string;
  media_prompt: string | null;
  sources: FeedCard["sources"];
  created_at: string;
  updated_at: string;
};

type FeedbackRow = {
  id: string;
  card_id: string;
  user_id: string;
  action: UserFeedback["action"];
  created_at: string;
};

type DraftRow = {
  id: string;
  workspace_id: string;
  user_id: string;
  intent: DraftEdit["intent"];
  title: string;
  body: string;
  origin_card_id: string | null;
  origin_source_item_id: string | null;
  prompt: string;
  created_at: string;
  updated_at: string;
};

type OAuthStateRow = {
  state: string;
  user_id: string;
  created_at: string;
};

type OAuthSessionRow = {
  id: string;
  user_id: string;
  workspace_id: string;
  workspace_name: string;
  access_token: string;
  databases: NotionOAuthSession["databases"];
  created_at: string;
};

function mapConnection(row: ConnectionRow): WorkspaceConnection {
  return {
    id: row.id,
    userId: row.user_id,
    workspaceName: row.workspace_name,
    notionWorkspaceId: row.notion_workspace_id,
    notionDatabaseId: row.notion_database_id,
    notionDatabaseTitle: row.notion_database_title,
    notionAccessTokenRef: row.notion_access_token_ref,
    mapping: row.mapping,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastSyncedAt: row.last_synced_at
  };
}

function mapSourceItem(row: SourceItemRow): SourceItem {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    notionPageId: row.notion_page_id,
    title: row.title,
    content: row.content,
    kind: row.kind,
    status: row.status,
    tags: row.tags ?? [],
    author: row.author,
    sourceTitle: row.source_title,
    sourceUrl: row.source_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapFeedCard(row: FeedCardRow): FeedCard {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    userId: row.user_id,
    headline: row.headline,
    body: row.body,
    rationale: row.rationale,
    status: row.status,
    score: Number(row.score),
    sourceSignature: row.source_signature,
    mediaPrompt: row.media_prompt,
    sources: row.sources,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapFeedback(row: FeedbackRow): UserFeedback {
  return {
    id: row.id,
    cardId: row.card_id,
    userId: row.user_id,
    action: row.action,
    createdAt: row.created_at
  };
}

function mapDraft(row: DraftRow): DraftEdit {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    userId: row.user_id,
    intent: row.intent,
    title: row.title,
    body: row.body,
    originCardId: row.origin_card_id,
    originSourceItemId: row.origin_source_item_id,
    prompt: row.prompt,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapOAuthState(row: OAuthStateRow): NotionOAuthState {
  return {
    state: row.state,
    userId: row.user_id,
    createdAt: row.created_at
  };
}

function mapOAuthSession(row: OAuthSessionRow): NotionOAuthSession {
  return {
    id: row.id,
    userId: row.user_id,
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    accessToken: row.access_token,
    databases: row.databases,
    createdAt: row.created_at
  };
}

export class PostgresWorkspaceRepository implements WorkspaceRepository {
  constructor(private readonly pool: Pool) {}

  async getConnection(userId: string): Promise<WorkspaceConnection | null> {
    const result = await this.pool.query<ConnectionRow>(
      `select * from workspace_connections where user_id = $1 limit 1`,
      [userId]
    );

    return result.rows[0] ? mapConnection(result.rows[0]) : null;
  }

  async upsertConnection(userId: string, input: ConnectWorkspaceInput): Promise<WorkspaceConnection> {
    const timestamp = new Date().toISOString();
    const result = await this.pool.query<ConnectionRow>(
      `insert into workspace_connections (
        id, user_id, workspace_name, notion_workspace_id, notion_database_id, notion_database_title,
        notion_access_token_ref, mapping, created_at, updated_at, last_synced_at
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      on conflict (user_id) do update set
        workspace_name = excluded.workspace_name,
        notion_workspace_id = excluded.notion_workspace_id,
        notion_database_id = excluded.notion_database_id,
        notion_database_title = excluded.notion_database_title,
        notion_access_token_ref = excluded.notion_access_token_ref,
        mapping = excluded.mapping,
        updated_at = excluded.updated_at
      returning *`,
      [
        createId("ws"),
        userId,
        input.workspaceName,
        input.notionWorkspaceId,
        input.notionDatabaseId,
        input.notionDatabaseTitle,
        input.notionAccessToken,
        input.mapping,
        timestamp,
        timestamp,
        null
      ]
    );

    return mapConnection(result.rows[0]!);
  }

  async updateConnectionSyncTime(connectionId: string, lastSyncedAt: string): Promise<void> {
    await this.pool.query(
      `update workspace_connections set last_synced_at = $2, updated_at = $2 where id = $1`,
      [connectionId, lastSyncedAt]
    );
  }

  async listSourceItems(workspaceId: string): Promise<SourceItem[]> {
    const result = await this.pool.query<SourceItemRow>(
      `select * from source_items where workspace_id = $1 order by updated_at desc`,
      [workspaceId]
    );
    return result.rows.map(mapSourceItem);
  }

  async getSourceItem(workspaceId: string, itemId: string): Promise<SourceItem | null> {
    const result = await this.pool.query<SourceItemRow>(
      `select * from source_items where workspace_id = $1 and id = $2 limit 1`,
      [workspaceId, itemId]
    );
    return result.rows[0] ? mapSourceItem(result.rows[0]) : null;
  }

  async upsertSourceItems(items: SourceItem[]): Promise<void> {
    for (const item of items) {
      await this.createOrReplaceSourceItem(item);
    }
  }

  async createSourceItem(item: SourceItem): Promise<SourceItem> {
    await this.createOrReplaceSourceItem(item);
    return item;
  }

  async updateSourceItem(
    workspaceId: string,
    itemId: string,
    patch: UpdateNotionItemInput & { updatedAt: string }
  ): Promise<SourceItem> {
    const result = await this.pool.query<SourceItemRow>(
      `update source_items set
        title = coalesce($3, title),
        content = coalesce($4, content),
        kind = coalesce($5, kind),
        tags = coalesce($6, tags),
        author = coalesce($7, author),
        source_title = coalesce($8, source_title),
        source_url = coalesce($9, source_url),
        updated_at = $10
      where workspace_id = $1 and id = $2
      returning *`,
      [
        workspaceId,
        itemId,
        patch.title ?? null,
        patch.body ?? null,
        patch.kind ?? null,
        patch.tags ?? null,
        patch.author ?? null,
        patch.sourceTitle ?? null,
        patch.sourceUrl ?? null,
        patch.updatedAt
      ]
    );

    if (!result.rows[0]) {
      throw new Error("Source item not found");
    }

    return mapSourceItem(result.rows[0]);
  }

  async archiveSourceItem(workspaceId: string, itemId: string, archivedAt: string): Promise<SourceItem> {
    const result = await this.pool.query<SourceItemRow>(
      `update source_items set status = 'archived', updated_at = $3 where workspace_id = $1 and id = $2 returning *`,
      [workspaceId, itemId, archivedAt]
    );

    if (!result.rows[0]) {
      throw new Error("Source item not found");
    }

    return mapSourceItem(result.rows[0]);
  }

  async listFeedCards(userId: string, cursor: string | null, limit: number): Promise<FeedPage> {
    const offset = Number(cursor ?? 0);
    const result = await this.pool.query<FeedCardRow>(
      `select * from feed_cards where user_id = $1 order by score desc, created_at desc offset $2 limit $3`,
      [userId, offset, limit]
    );
    const countResult = await this.pool.query<{ count: string }>(
      `select count(*)::text as count from feed_cards where user_id = $1`,
      [userId]
    );

    const total = Number(countResult.rows[0]?.count ?? 0);
    return {
      items: result.rows.map(mapFeedCard),
      nextCursor: offset + limit < total ? String(offset + limit) : null
    };
  }

  async getFeedCard(userId: string, cardId: string): Promise<FeedCard | null> {
    const result = await this.pool.query<FeedCardRow>(
      `select * from feed_cards where user_id = $1 and id = $2 limit 1`,
      [userId, cardId]
    );
    return result.rows[0] ? mapFeedCard(result.rows[0]) : null;
  }

  async saveFeedCards(cards: FeedCard[]): Promise<void> {
    for (const card of cards) {
      await this.pool.query(
        `insert into feed_cards (
          id, workspace_id, user_id, headline, body, rationale, status, score, source_signature,
          media_prompt, sources, created_at, updated_at
        ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        on conflict (user_id, source_signature) do update set
          headline = excluded.headline,
          body = excluded.body,
          rationale = excluded.rationale,
          status = excluded.status,
          score = excluded.score,
          media_prompt = excluded.media_prompt,
          sources = excluded.sources,
          updated_at = excluded.updated_at`,
        [
          card.id,
          card.workspaceId,
          card.userId,
          card.headline,
          card.body,
          card.rationale,
          card.status,
          card.score,
          card.sourceSignature,
          card.mediaPrompt,
          JSON.stringify(card.sources),
          card.createdAt,
          card.updatedAt
        ]
      );
    }
  }

  async listFeedback(userId: string): Promise<UserFeedback[]> {
    const result = await this.pool.query<FeedbackRow>(
      `select * from user_feedback where user_id = $1 order by created_at desc`,
      [userId]
    );
    return result.rows.map(mapFeedback);
  }

  async recordFeedback(feedback: UserFeedback): Promise<void> {
    await this.pool.query(
      `insert into user_feedback (id, card_id, user_id, action, created_at) values ($1,$2,$3,$4,$5)`,
      [feedback.id, feedback.cardId, feedback.userId, feedback.action, feedback.createdAt]
    );

    const status =
      feedback.action === "save" ? "saved" : feedback.action === "dismiss" ? "dismissed" : "approved";

    await this.pool.query(
      `update feed_cards set status = $3, updated_at = $4 where id = $1 and user_id = $2`,
      [feedback.cardId, feedback.userId, status, feedback.createdAt]
    );
  }

  async saveDraft(draft: DraftEdit): Promise<DraftEdit> {
    const result = await this.pool.query<DraftRow>(
      `insert into draft_edits (
        id, workspace_id, user_id, intent, title, body, origin_card_id, origin_source_item_id,
        prompt, created_at, updated_at
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      on conflict (id) do update set
        title = excluded.title,
        body = excluded.body,
        prompt = excluded.prompt,
        updated_at = excluded.updated_at
      returning *`,
      [
        draft.id,
        draft.workspaceId,
        draft.userId,
        draft.intent,
        draft.title,
        draft.body,
        draft.originCardId,
        draft.originSourceItemId,
        draft.prompt,
        draft.createdAt,
        draft.updatedAt
      ]
    );

    return mapDraft(result.rows[0]!);
  }

  async saveNotionOAuthState(state: NotionOAuthState): Promise<NotionOAuthState> {
    const result = await this.pool.query<OAuthStateRow>(
      `insert into notion_oauth_states (state, user_id, created_at)
       values ($1, $2, $3)
       on conflict (state) do update set
         user_id = excluded.user_id,
         created_at = excluded.created_at
       returning *`,
      [state.state, state.userId, state.createdAt]
    );

    return mapOAuthState(result.rows[0]!);
  }

  async consumeNotionOAuthState(state: string): Promise<NotionOAuthState | null> {
    const result = await this.pool.query<OAuthStateRow>(
      `delete from notion_oauth_states where state = $1 returning *`,
      [state]
    );

    return result.rows[0] ? mapOAuthState(result.rows[0]) : null;
  }

  async saveNotionOAuthSession(session: NotionOAuthSession): Promise<NotionOAuthSession> {
    const result = await this.pool.query<OAuthSessionRow>(
      `insert into notion_oauth_sessions (id, user_id, workspace_id, workspace_name, access_token, databases, created_at)
       values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (id) do update set
         user_id = excluded.user_id,
         workspace_id = excluded.workspace_id,
         workspace_name = excluded.workspace_name,
         access_token = excluded.access_token,
         databases = excluded.databases,
         created_at = excluded.created_at
       returning *`,
      [
        session.id,
        session.userId,
        session.workspaceId,
        session.workspaceName,
        session.accessToken,
        JSON.stringify(session.databases),
        session.createdAt
      ]
    );

    return mapOAuthSession(result.rows[0]!);
  }

  async getNotionOAuthSession(userId: string, sessionId: string): Promise<NotionOAuthSession | null> {
    const result = await this.pool.query<OAuthSessionRow>(
      `select * from notion_oauth_sessions where id = $1 and user_id = $2 limit 1`,
      [sessionId, userId]
    );

    return result.rows[0] ? mapOAuthSession(result.rows[0]) : null;
  }

  async consumeNotionOAuthSession(userId: string, sessionId: string): Promise<NotionOAuthSession | null> {
    const result = await this.pool.query<OAuthSessionRow>(
      `delete from notion_oauth_sessions where id = $1 and user_id = $2 returning *`,
      [sessionId, userId]
    );

    return result.rows[0] ? mapOAuthSession(result.rows[0]) : null;
  }

  private async createOrReplaceSourceItem(item: SourceItem) {
    await this.pool.query(
      `insert into source_items (
        id, workspace_id, notion_page_id, title, content, kind, status, tags, author,
        source_title, source_url, created_at, updated_at
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      on conflict (id) do update set
        title = excluded.title,
        content = excluded.content,
        kind = excluded.kind,
        status = excluded.status,
        tags = excluded.tags,
        author = excluded.author,
        source_title = excluded.source_title,
        source_url = excluded.source_url,
        updated_at = excluded.updated_at`,
      [
        item.id,
        item.workspaceId,
        item.notionPageId,
        item.title,
        item.content,
        item.kind,
        item.status,
        item.tags,
        item.author,
        item.sourceTitle,
        item.sourceUrl,
        item.createdAt,
        item.updatedAt
      ]
    );
  }
}
