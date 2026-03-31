import type { ConnectWorkspaceInput, SessionBootstrap } from "@me-social/contracts";
import type { NotionClient } from "../integrations/notion/client.js";
import type { WorkspaceRepository } from "../repositories/workspace-repository.js";

export class WorkspaceService {
  constructor(
    private readonly repository: WorkspaceRepository,
    private readonly notionClient: NotionClient
  ) {}

  async bootstrap(userId: string, email: string): Promise<SessionBootstrap> {
    const connection = await this.repository.getConnection(userId);
    const databases = connection
      ? await this.notionClient.listDatabases(connection.notionAccessTokenRef)
      : [];

    return {
      userId,
      email,
      connection,
      databases
    };
  }

  async connect(userId: string, input: ConnectWorkspaceInput) {
    return this.repository.upsertConnection(userId, input);
  }

  async sync(userId: string) {
    const connection = await this.repository.getConnection(userId);

    if (!connection) {
      throw new Error("Workspace connection not found");
    }

    const result = await this.notionClient.syncWorkspace(connection);
    await this.repository.upsertSourceItems(result.items);
    await this.repository.updateConnectionSyncTime(connection.id, result.syncedAt);
    return result;
  }
}

