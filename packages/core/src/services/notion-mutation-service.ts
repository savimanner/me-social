import type { CreateNotionItemInput, SourceItem, UpdateNotionItemInput } from "@me-social/contracts";
import { nowIso } from "../lib/time.js";
import type { NotionClient } from "../integrations/notion/client.js";
import type { WorkspaceRepository } from "../repositories/workspace-repository.js";

export class NotionMutationService {
  constructor(
    private readonly repository: WorkspaceRepository,
    private readonly notionClient: NotionClient
  ) {}

  async create(userId: string, input: CreateNotionItemInput): Promise<SourceItem> {
    const connection = await this.requireConnection(userId);
    const result = await this.notionClient.createItem(connection, input);
    await this.repository.createSourceItem(result.item);
    return result.item;
  }

  async update(userId: string, itemId: string, input: UpdateNotionItemInput): Promise<SourceItem> {
    const connection = await this.requireConnection(userId);
    const current = await this.repository.getSourceItem(connection.id, itemId);

    if (!current) {
      throw new Error("Source item not found");
    }

    const result = await this.notionClient.updateItem(connection, current.notionPageId, input);
    return this.repository.updateSourceItem(connection.id, itemId, {
      ...input,
      updatedAt: nowIso()
    });
  }

  async archive(userId: string, itemId: string): Promise<SourceItem> {
    const connection = await this.requireConnection(userId);
    const current = await this.repository.getSourceItem(connection.id, itemId);

    if (!current) {
      throw new Error("Source item not found");
    }

    await this.notionClient.archiveItem(connection, current.notionPageId);
    return this.repository.archiveSourceItem(connection.id, itemId, nowIso());
  }

  private async requireConnection(userId: string) {
    const connection = await this.repository.getConnection(userId);

    if (!connection) {
      throw new Error("Workspace connection not found");
    }

    return connection;
  }
}

