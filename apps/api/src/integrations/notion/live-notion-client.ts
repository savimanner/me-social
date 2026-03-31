import { Client } from "@notionhq/client";
import type {
  CreateNotionItemInput,
  DatabaseOption,
  SourceItem,
  SourceItemKind,
  UpdateNotionItemInput,
  WorkspaceConnection
} from "@me-social/contracts";
import { type NotionClient } from "@me-social/core";

function propertyToText(property: any): string {
  if (!property) {
    return "";
  }

  if ("title" in property && Array.isArray(property.title)) {
    return property.title.map((entry: any) => entry.plain_text).join("");
  }

  if ("rich_text" in property && Array.isArray(property.rich_text)) {
    return property.rich_text.map((entry: any) => entry.plain_text).join("");
  }

  if ("select" in property) {
    return property.select?.name ?? "";
  }

  if ("status" in property) {
    return property.status?.name ?? "";
  }

  if ("url" in property) {
    return property.url ?? "";
  }

  return "";
}

function propertyToTags(property: any): string[] {
  if (!property) {
    return [];
  }

  if ("multi_select" in property && Array.isArray(property.multi_select)) {
    return property.multi_select.map((entry: any) => entry.name);
  }

  return propertyToText(property)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function normalizeKind(value: string): SourceItemKind {
  if (value === "book_snippet" || value === "idea" || value === "note") {
    return value;
  }

  if (value === "book snippet") {
    return "book_snippet";
  }

  return "note";
}

function mapPageToSourceItem(connection: WorkspaceConnection, page: any): SourceItem {
  const properties = page.properties as Record<string, any>;
  const mapping = connection.mapping;

  return {
    id: `src_${page.id.replace(/-/g, "")}`,
    workspaceId: connection.id,
    notionPageId: page.id,
    title: propertyToText(properties[mapping.title]),
    content: propertyToText(properties[mapping.content]),
    kind: normalizeKind(propertyToText(properties[mapping.kind])),
    status: propertyToText(properties[mapping.status]) === "archived" || page.in_trash ? "archived" : "active",
    tags: propertyToTags(properties[mapping.tags]),
    author: mapping.author ? propertyToText(properties[mapping.author]) || null : null,
    sourceTitle: mapping.sourceTitle ? propertyToText(properties[mapping.sourceTitle]) || null : null,
    sourceUrl: mapping.sourceUrl ? propertyToText(properties[mapping.sourceUrl]) || null : null,
    createdAt: page.created_time,
    updatedAt: page.last_edited_time
  };
}

function buildProperties(connection: WorkspaceConnection, input: CreateNotionItemInput | UpdateNotionItemInput) {
  const mapping = connection.mapping;

  return {
    [mapping.title]: input.title
      ? {
          title: [{ text: { content: input.title } }]
        }
      : undefined,
    [mapping.content]: "body" in input && input.body
      ? {
          rich_text: [{ text: { content: input.body } }]
        }
      : undefined,
    [mapping.kind]: input.kind
      ? {
          select: { name: input.kind }
        }
      : undefined,
    [mapping.status]: {
      status: { name: "active" }
    },
    [mapping.tags]: input.tags
      ? {
          multi_select: input.tags.map((tag) => ({ name: tag }))
        }
      : undefined,
    ...(mapping.author && "author" in input
      ? {
          [mapping.author]: input.author
            ? {
                rich_text: [{ text: { content: input.author } }]
              }
            : undefined
        }
      : {}),
    ...(mapping.sourceTitle && "sourceTitle" in input
      ? {
          [mapping.sourceTitle]: input.sourceTitle
            ? {
                rich_text: [{ text: { content: input.sourceTitle } }]
              }
            : undefined
        }
      : {}),
    ...(mapping.sourceUrl && "sourceUrl" in input
      ? {
          [mapping.sourceUrl]: input.sourceUrl
            ? {
                url: input.sourceUrl
              }
            : undefined
        }
      : {})
  };
}

function compactProperties(properties: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(properties).filter(([, value]) => value !== undefined));
}

export class LiveNotionClient implements NotionClient {
  async listDatabases(token: string): Promise<DatabaseOption[]> {
    const notion = new Client({ auth: token });
    const result = await notion.search({
      filter: { property: "object", value: "data_source" },
      page_size: 25
    });

    return result.results
      .filter((entry): entry is any => entry.object === "data_source")
      .map((entry: any) => ({
        id: entry.id,
        title: Array.isArray(entry.title) ? entry.title.map((part: any) => part.plain_text).join("") : "Untitled"
      }));
  }

  async syncWorkspace(connection: WorkspaceConnection) {
    const notion = new Client({ auth: connection.notionAccessTokenRef });
    const items: SourceItem[] = [];
    let cursor: string | undefined;

    do {
      const result = await notion.dataSources.query({
        data_source_id: connection.notionDatabaseId,
        start_cursor: cursor,
        page_size: 50
      });

      items.push(
        ...result.results
          .filter((entry): entry is any => entry.object === "page")
          .map((entry) => mapPageToSourceItem(connection, entry))
      );

      cursor = result.has_more ? result.next_cursor ?? undefined : undefined;
    } while (cursor);

    return {
      items,
      syncedAt: new Date().toISOString()
    };
  }

  async createItem(connection: WorkspaceConnection, input: CreateNotionItemInput) {
    const notion = new Client({ auth: connection.notionAccessTokenRef });
    const page = await notion.pages.create({
      parent: {
        data_source_id: connection.notionDatabaseId
      },
      properties: compactProperties(buildProperties(connection, input)) as any
    });

    return {
      item: mapPageToSourceItem(connection, page as any)
    };
  }

  async updateItem(connection: WorkspaceConnection, notionPageId: string, input: UpdateNotionItemInput) {
    const notion = new Client({ auth: connection.notionAccessTokenRef });
    const page = await notion.pages.update({
      page_id: notionPageId,
      properties: compactProperties(buildProperties(connection, input)) as any
    });

    return {
      item: mapPageToSourceItem(connection, page as any)
    };
  }

  async archiveItem(connection: WorkspaceConnection, notionPageId: string) {
    const notion = new Client({ auth: connection.notionAccessTokenRef });
    const page = await notion.pages.update({
      page_id: notionPageId,
      in_trash: true
    });

    return {
      item: mapPageToSourceItem(connection, page as any)
    };
  }
}
