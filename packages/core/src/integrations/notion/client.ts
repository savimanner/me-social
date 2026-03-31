import type {
  CreateNotionItemInput,
  DatabaseOption,
  SourceItem,
  UpdateNotionItemInput,
  WorkspaceConnection
} from "@me-social/contracts";

export interface NotionSyncResult {
  items: SourceItem[];
  syncedAt: string;
}

export interface NotionWriteResult {
  item: SourceItem;
}

export interface NotionClient {
  listDatabases(token: string): Promise<DatabaseOption[]>;
  syncWorkspace(connection: WorkspaceConnection): Promise<NotionSyncResult>;
  createItem(connection: WorkspaceConnection, input: CreateNotionItemInput): Promise<NotionWriteResult>;
  updateItem(
    connection: WorkspaceConnection,
    notionPageId: string,
    input: UpdateNotionItemInput
  ): Promise<NotionWriteResult>;
  archiveItem(connection: WorkspaceConnection, notionPageId: string): Promise<NotionWriteResult>;
}

