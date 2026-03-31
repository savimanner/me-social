import Foundation

struct APIClient {
    var baseURL: URL
    var bearerToken: String?

    init(baseURL: URL = URL(string: "http://127.0.0.1:3000")!, bearerToken: String? = nil) {
        self.baseURL = baseURL
        self.bearerToken = bearerToken
    }

    func bootstrap() async throws -> SessionBootstrap {
        try await send(path: "/session/bootstrap", method: "GET")
    }

    func startNotionOAuth() async throws -> URL {
        let response: NotionOAuthStartResponse = try await send(path: "/notion/oauth/start", method: "GET")

        guard let url = URL(string: response.authorizationUrl) else {
            throw APIError.server("Invalid Notion authorization URL")
        }

        return url
    }

    func loadNotionOAuthSession(id: String) async throws -> NotionOAuthSession {
        let response: NotionOAuthSessionResponse = try await send(path: "/notion/oauth/session/\(id)", method: "GET")
        return response.session
    }

    func connectWorkspace(_ input: ConnectWorkspaceInput) async throws -> WorkspaceConnection {
        let response: ConnectionResponse = try await send(path: "/workspace/connection", method: "POST", body: input)
        return response.connection
    }

    func connectWorkspaceFromOAuth(_ input: ConnectWorkspaceFromOAuthInput) async throws -> WorkspaceConnection {
        let response: ConnectionResponse = try await send(path: "/workspace/connection/oauth", method: "POST", body: input)
        return response.connection
    }

    func syncWorkspace() async throws {
        let _: SyncResponse = try await send(path: "/workspace/sync", method: "POST")
    }

    func feed(cursor: String? = nil, limit: Int = 10) async throws -> FeedPage {
        var components = URLComponents(url: baseURL.appendingPathComponent("feed"), resolvingAgainstBaseURL: false)!
        components.queryItems = [
            URLQueryItem(name: "limit", value: String(limit)),
            URLQueryItem(name: "cursor", value: cursor)
        ].filter { $0.value != nil }

        let request = try makeRequest(url: components.url!, method: "GET")
        return try await perform(request)
    }

    func refreshFeed(limit: Int = 12) async throws -> [FeedCard] {
        let response: FeedRefreshResponse = try await send(path: "/feed/refresh", method: "POST", body: ["limit": limit])
        return response.items
    }

    func loadCard(id: String) async throws -> FeedCard {
        let response: CardResponse = try await send(path: "/cards/\(id)", method: "GET")
        return response.card
    }

    func sendFeedback(cardID: String, action: FeedAction) async throws {
        let _: FeedbackResponse = try await send(path: "/cards/\(cardID)/feedback", method: "POST", body: ["action": action.rawValue])
    }

    func generateDraft(request: DraftGenerationRequest) async throws -> DraftEdit {
        let response: DraftGenerationResponse = try await send(path: "/drafts/generate", method: "POST", body: request)
        return response.draft
    }

    func createNotionItem(_ input: CreateNotionItemInput) async throws -> SourceItem {
        let response: SourceItemResponse = try await send(path: "/notion/items", method: "POST", body: input)
        return response.item
    }

    func updateNotionItem(id: String, input: UpdateNotionItemInput) async throws -> SourceItem {
        let response: SourceItemResponse = try await send(path: "/notion/items/\(id)", method: "PATCH", body: input)
        return response.item
    }

    func archiveNotionItem(id: String) async throws -> SourceItem {
        let response: SourceItemResponse = try await send(path: "/notion/items/\(id)/archive", method: "POST")
        return response.item
    }

    private func send<Response: Decodable>(
        path: String,
        method: String
    ) async throws -> Response {
        let url = path.hasPrefix("http")
            ? URL(string: path)!
            : baseURL.appendingPathComponent(path.trimmingCharacters(in: CharacterSet(charactersIn: "/")))
        let request = try makeRequest(url: url, method: method)
        return try await perform(request)
    }

    private func send<Response: Decodable, RequestBody: Encodable>(
        path: String,
        method: String,
        body: RequestBody
    ) async throws -> Response {
        let url = path.hasPrefix("http")
            ? URL(string: path)!
            : baseURL.appendingPathComponent(path.trimmingCharacters(in: CharacterSet(charactersIn: "/")))
        var request = try makeRequest(url: url, method: method)
        request.httpBody = try JSONEncoder.meSocial.encode(body)
        return try await perform(request)
    }

    private func perform<Response: Decodable>(_ request: URLRequest) async throws -> Response {
        let (data, response) = try await URLSession.shared.data(for: request)
        let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 500

        if !(200 ... 299).contains(statusCode) {
            let message = String(data: data, encoding: .utf8) ?? "Unknown server error"
            throw APIError.server(message)
        }

        return try JSONDecoder.meSocial.decode(Response.self, from: data)
    }

    private func makeRequest(url: URL, method: String) throws -> URLRequest {
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let bearerToken {
            request.setValue("Bearer \(bearerToken)", forHTTPHeaderField: "Authorization")
        }

        return request
    }
}

enum APIError: LocalizedError {
    case server(String)

    var errorDescription: String? {
        switch self {
        case let .server(message):
            return message
        }
    }
}

extension JSONEncoder {
    static let meSocial: JSONEncoder = {
        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .useDefaultKeys
        return encoder
    }()
}

extension JSONDecoder {
    static let meSocial: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .useDefaultKeys
        return decoder
    }()
}
