import type { CreateNotionItemInput, UpdateNotionItemInput, WorkspaceConnection } from "@me-social/contracts";
import { createId, nowIso, type NotionClient, type NotionSyncResult, type NotionWriteResult } from "@me-social/core";

export class MockNotionClient implements NotionClient {
  async listDatabases() {
    return [
      { id: "db_notes", title: "Notes Feed" },
      { id: "db_ideas", title: "Ideas Inbox" }
    ];
  }

  async syncWorkspace(connection: WorkspaceConnection): Promise<NotionSyncResult> {
    const timestamp = nowIso();

    return {
      syncedAt: timestamp,
      items: [
        {
          id: "src_atomic",
          workspaceId: connection.id,
          notionPageId: "page_atomic",
          title: "Atomic note about leverage",
          content: "The best notes feel small at first and compound later through reuse.",
          kind: "idea" as const,
          status: "active" as const,
          tags: ["systems", "writing"],
          author: null,
          sourceTitle: null,
          sourceUrl: null,
          createdAt: timestamp,
          updatedAt: timestamp
        },
        {
          id: "src_quote",
          workspaceId: connection.id,
          notionPageId: "page_quote",
          title: "Book snippet on attention",
          content: "What you repeatedly return to becomes the shape of your mind.",
          kind: "book_snippet" as const,
          status: "active" as const,
          tags: ["attention", "systems"],
          author: "Unknown",
          sourceTitle: "Reading Notes",
          sourceUrl: null,
          createdAt: timestamp,
          updatedAt: timestamp
        },
        {
          id: "src_note",
          workspaceId: connection.id,
          notionPageId: "page_note",
          title: "Personal note on creator workflows",
          content: "Most social apps optimize for stimulation. This should optimize for reflection and follow-through.",
          kind: "note" as const,
          status: "active" as const,
          tags: ["product", "reflection"],
          author: null,
          sourceTitle: null,
          sourceUrl: null,
          createdAt: timestamp,
          updatedAt: timestamp
        }
      ]
    };
  }

  async createItem(
    connection: WorkspaceConnection,
    input: CreateNotionItemInput
  ): Promise<NotionWriteResult> {
    const timestamp = nowIso();
    return {
      item: {
        id: createId("src"),
        workspaceId: connection.id,
        notionPageId: createId("page"),
        title: input.title,
        content: input.body,
        kind: input.kind,
        status: "active" as const,
        tags: input.tags,
        author: input.author ?? null,
        sourceTitle: input.sourceTitle ?? null,
        sourceUrl: input.sourceUrl ?? null,
        createdAt: timestamp,
        updatedAt: timestamp
      }
    };
  }

  async updateItem(
    connection: WorkspaceConnection,
    notionPageId: string,
    input: UpdateNotionItemInput
  ): Promise<NotionWriteResult> {
    const timestamp = nowIso();
    return {
      item: {
        id: createId("src"),
        workspaceId: connection.id,
        notionPageId,
        title: input.title ?? "Updated item",
        content: input.body ?? "",
        kind: input.kind ?? "note",
        status: "active" as const,
        tags: input.tags ?? [],
        author: input.author ?? null,
        sourceTitle: input.sourceTitle ?? null,
        sourceUrl: input.sourceUrl ?? null,
        createdAt: timestamp,
        updatedAt: timestamp
      }
    };
  }

  async archiveItem(connection: WorkspaceConnection, notionPageId: string): Promise<NotionWriteResult> {
    const timestamp = nowIso();
    return {
      item: {
        id: createId("src"),
        workspaceId: connection.id,
        notionPageId,
        title: "Archived item",
        content: "",
        kind: "note" as const,
        status: "archived" as const,
        tags: [],
        author: null,
        sourceTitle: null,
        sourceUrl: null,
        createdAt: timestamp,
        updatedAt: timestamp
      }
    };
  }
}
