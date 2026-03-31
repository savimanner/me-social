import Foundation

enum SourceItemKind: String, Codable, CaseIterable, Identifiable {
    case note
    case bookSnippet = "book_snippet"
    case idea

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .note: "Note"
        case .bookSnippet: "Book Snippet"
        case .idea: "Idea"
        }
    }
}

enum DraftIntent: String, Codable, CaseIterable, Identifiable {
    case rewriteExisting = "rewrite_existing"
    case createNew = "create_new"

    var id: String { rawValue }
}

enum FeedAction: String, Codable {
    case save
    case dismiss
    case approve
}

struct NotionFieldMapping: Codable {
    var title: String = "Title"
    var content: String = "Content"
    var kind: String = "Kind"
    var status: String = "Status"
    var tags: String = "Tags"
    var author: String?
    var sourceTitle: String?
    var sourceURL: String?

    enum CodingKeys: String, CodingKey {
        case title
        case content
        case kind
        case status
        case tags
        case author
        case sourceTitle
        case sourceURL = "sourceUrl"
    }
}

struct WorkspaceConnection: Codable {
    let id: String
    let userId: String
    let workspaceName: String
    let notionWorkspaceId: String
    let notionDatabaseId: String
    let notionDatabaseTitle: String
    let notionAccessTokenRef: String
    let mapping: NotionFieldMapping
    let createdAt: String
    let updatedAt: String
    let lastSyncedAt: String?
}

struct DatabaseOption: Codable, Identifiable, Hashable {
    let id: String
    let title: String
}

struct SessionBootstrap: Codable {
    let userId: String
    let email: String
    let connection: WorkspaceConnection?
    let databases: [DatabaseOption]
}

struct FeedCardSource: Codable, Hashable, Identifiable {
    var id: String { sourceItemId }

    let sourceItemId: String
    let notionPageId: String
    let title: String
    let kind: SourceItemKind
    let excerpt: String
}

struct FeedCard: Codable, Identifiable, Hashable {
    let id: String
    let workspaceId: String
    let userId: String
    let headline: String
    let body: String
    let rationale: String
    let status: String
    let score: Double
    let sourceSignature: String
    let mediaPrompt: String?
    let sources: [FeedCardSource]
    let createdAt: String
    let updatedAt: String
}

struct FeedPage: Codable {
    let items: [FeedCard]
    let nextCursor: String?
}

struct SourceItem: Codable, Identifiable {
    let id: String
    let workspaceId: String
    let notionPageId: String
    let title: String
    let content: String
    let kind: SourceItemKind
    let status: String
    let tags: [String]
    let author: String?
    let sourceTitle: String?
    let sourceURL: String?
    let createdAt: String
    let updatedAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case workspaceId
        case notionPageId
        case title
        case content
        case kind
        case status
        case tags
        case author
        case sourceTitle
        case sourceURL = "sourceUrl"
        case createdAt
        case updatedAt
    }
}

struct DraftEdit: Codable, Identifiable {
    let id: String
    let workspaceId: String
    let userId: String
    let intent: DraftIntent
    let title: String
    let body: String
    let originCardId: String?
    let originSourceItemId: String?
    let prompt: String
    let createdAt: String
    let updatedAt: String
}

struct ConnectWorkspaceInput: Codable {
    let workspaceName: String
    let notionWorkspaceId: String
    let notionDatabaseId: String
    let notionDatabaseTitle: String
    let notionAccessToken: String
    let mapping: NotionFieldMapping
}

struct CreateNotionItemInput: Codable {
    let title: String
    let body: String
    let kind: SourceItemKind
    let tags: [String]
    let author: String?
    let sourceTitle: String?
    let sourceURL: String?

    enum CodingKeys: String, CodingKey {
        case title
        case body
        case kind
        case tags
        case author
        case sourceTitle
        case sourceURL = "sourceUrl"
    }
}

struct UpdateNotionItemInput: Codable {
    var title: String?
    var body: String?
    var kind: SourceItemKind?
    var tags: [String]?
    var author: String?
    var sourceTitle: String?
    var sourceURL: String?

    enum CodingKeys: String, CodingKey {
        case title
        case body
        case kind
        case tags
        case author
        case sourceTitle
        case sourceURL = "sourceUrl"
    }
}

struct DraftGenerationRequest: Codable {
    let cardId: String?
    let sourceItemId: String?
    let intent: DraftIntent
    let prompt: String
}

struct DraftGenerationResponse: Codable {
    let draft: DraftEdit
}

struct FeedRefreshResponse: Codable {
    let items: [FeedCard]
}

struct CardResponse: Codable {
    let card: FeedCard
}

struct FeedbackResponse: Codable {
    let feedback: RecordedFeedback
}

struct RecordedFeedback: Codable {
    let id: String
    let cardId: String
    let userId: String
    let action: FeedAction
    let createdAt: String
}

struct ConnectionResponse: Codable {
    let connection: WorkspaceConnection
}

struct DatabasesResponse: Codable {
    let items: [DatabaseOption]
}

struct SourceItemResponse: Codable {
    let item: SourceItem
}

struct SyncResponse: Codable {
    let items: [SourceItem]
    let syncedAt: String
}

struct NotionDatabaseLookupRequest: Codable {
    let token: String
}

