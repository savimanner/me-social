import Foundation
import Observation

@MainActor
@Observable
final class AppModel {
    enum Phase {
        case loading
        case onboarding
        case feed
    }

    var phase: Phase = .loading
    var bootstrap: SessionBootstrap?
    var feedCards: [FeedCard] = []
    var nextCursor: String?
    var selectedCard: FeedCard?
    var generatedDraft: DraftEdit?
    var isWorking = false
    var errorMessage: String?

    var onboarding = OnboardingState()

    private let cache = OfflineFeedStore()
    private(set) var apiClient: APIClient

    init(apiClient: APIClient = APIClient()) {
        self.apiClient = apiClient
    }

    func start() async {
        if let cached = cache.load() {
            feedCards = cached.items
            nextCursor = cached.nextCursor
        }

        do {
            let bootstrap = try await apiClient.bootstrap()
            self.bootstrap = bootstrap
            onboarding.apply(bootstrap: bootstrap)
            phase = bootstrap.connection == nil ? .onboarding : .feed

            if bootstrap.connection != nil {
                try await loadFeed(reset: true)
            }
        } catch {
            errorMessage = error.localizedDescription
            phase = .onboarding
        }
    }

    func startNotionOAuth() async -> URL? {
        isWorking = true
        defer { isWorking = false }

        do {
            return try await apiClient.startNotionOAuth()
        } catch {
            errorMessage = error.localizedDescription
            return nil
        }
    }

    func handleIncomingURL(_ url: URL) async {
        guard url.scheme == "mesocial" else { return }

        let components = URLComponents(url: url, resolvingAgainstBaseURL: false)

        if let error = components?.queryItems?.first(where: { $0.name == "error" })?.value {
            errorMessage = error
            return
        }

        guard let sessionID = components?.queryItems?.first(where: { $0.name == "session_id" })?.value else {
            return
        }

        isWorking = true
        defer { isWorking = false }

        do {
            let session = try await apiClient.loadNotionOAuthSession(id: sessionID)
            onboarding.oauthSession = session
            onboarding.workspaceName = session.workspaceName
            onboarding.notionWorkspaceID = session.workspaceId
            onboarding.availableDatabases = session.databases
            onboarding.selectedDatabase = session.databases.first
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func connectWorkspace() async {
        guard let oauthSession = onboarding.oauthSession, let database = onboarding.selectedDatabase else { return }
        isWorking = true
        defer { isWorking = false }

        do {
            let connection = try await apiClient.connectWorkspaceFromOAuth(
                ConnectWorkspaceFromOAuthInput(
                    oauthSessionId: oauthSession.id,
                    notionDatabaseId: database.id,
                    notionDatabaseTitle: database.title,
                    mapping: onboarding.mapping
                )
            )

            bootstrap = SessionBootstrap(
                userId: bootstrap?.userId ?? "user_demo",
                email: bootstrap?.email ?? "demo@me-social.local",
                connection: connection,
                databases: oauthSession.databases
            )

            try await apiClient.syncWorkspace()
            phase = .feed
            try await refreshFeed()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func loadFeed(reset: Bool = false) async throws {
        isWorking = true
        defer { isWorking = false }

        let cursor = reset ? nil : nextCursor
        let page = try await apiClient.feed(cursor: cursor, limit: 10)

        if reset {
            feedCards = page.items
        } else {
            feedCards.append(contentsOf: page.items)
        }

        nextCursor = page.nextCursor
        cache.save(page)
    }

    func refreshFeed() async throws {
        isWorking = true
        defer { isWorking = false }

        let cards = try await apiClient.refreshFeed(limit: 12)
        feedCards = cards
        nextCursor = nil
        cache.save(FeedPage(items: cards, nextCursor: nil))
    }

    func submitFeedback(for card: FeedCard, action: FeedAction) async {
        do {
            try await apiClient.sendFeedback(cardID: card.id, action: action)
            if let index = feedCards.firstIndex(of: card) {
                feedCards.remove(at: index)
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func loadDetail(for card: FeedCard) async {
        do {
            selectedCard = try await apiClient.loadCard(id: card.id)
        } catch {
            errorMessage = error.localizedDescription
            selectedCard = card
        }
    }

    func generateDraft(cardID: String?, sourceItemID: String?, intent: DraftIntent, prompt: String) async {
        isWorking = true
        defer { isWorking = false }

        do {
            generatedDraft = try await apiClient.generateDraft(
                request: DraftGenerationRequest(
                    cardId: cardID,
                    sourceItemId: sourceItemID,
                    intent: intent,
                    prompt: prompt
                )
            )
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func createItem(from editor: EditorState) async {
        isWorking = true
        defer { isWorking = false }

        do {
            _ = try await apiClient.createNotionItem(
                CreateNotionItemInput(
                    title: editor.title,
                    body: editor.body,
                    kind: editor.kind,
                    tags: editor.tags,
                    author: editor.author.isEmpty ? nil : editor.author,
                    sourceTitle: editor.sourceTitle.isEmpty ? nil : editor.sourceTitle,
                    sourceURL: editor.sourceURL.isEmpty ? nil : editor.sourceURL
                )
            )
            try await refreshFeed()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func updateItem(sourceItemID: String, editor: EditorState) async {
        isWorking = true
        defer { isWorking = false }

        do {
            _ = try await apiClient.updateNotionItem(
                id: sourceItemID,
                input: UpdateNotionItemInput(
                    title: editor.title,
                    body: editor.body,
                    kind: editor.kind,
                    tags: editor.tags,
                    author: editor.author,
                    sourceTitle: editor.sourceTitle,
                    sourceURL: editor.sourceURL
                )
            )
            try await refreshFeed()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func archiveItem(sourceItemID: String) async {
        isWorking = true
        defer { isWorking = false }

        do {
            _ = try await apiClient.archiveNotionItem(id: sourceItemID)
            try await refreshFeed()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

@Observable
final class OnboardingState {
    var workspaceName = "Personal Lab"
    var notionWorkspaceID = ""
    var oauthSession: NotionOAuthSession?
    var availableDatabases: [DatabaseOption] = []
    var selectedDatabase: DatabaseOption?
    var mapping = NotionFieldMapping()

    func apply(bootstrap: SessionBootstrap) {
        if let connection = bootstrap.connection {
            workspaceName = connection.workspaceName
            notionWorkspaceID = connection.notionWorkspaceId
            selectedDatabase = DatabaseOption(id: connection.notionDatabaseId, title: connection.notionDatabaseTitle)
            mapping = connection.mapping
            availableDatabases = bootstrap.databases
        }
    }
}

struct EditorState {
    var title: String
    var body: String
    var kind: SourceItemKind
    var tags: [String]
    var author: String
    var sourceTitle: String
    var sourceURL: String

    static func from(card: FeedCard, draft: DraftEdit?) -> EditorState {
        EditorState(
            title: draft?.title ?? card.headline,
            body: draft?.body ?? card.body,
            kind: card.sources.first?.kind ?? .note,
            tags: [],
            author: "",
            sourceTitle: "",
            sourceURL: ""
        )
    }
}
