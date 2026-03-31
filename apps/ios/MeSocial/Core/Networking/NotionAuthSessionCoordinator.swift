import AuthenticationServices
import UIKit

protocol NotionAuthSessionCoordinating {
    @MainActor
    func authenticate(using url: URL, callbackScheme: String) async throws -> URL
}

enum NotionAuthSessionError: LocalizedError {
    case missingCallbackURL
    case cancelled
    case missingPresentationAnchor

    var errorDescription: String? {
        switch self {
        case .missingCallbackURL:
            return "Notion did not return a callback URL."
        case .cancelled:
            return "Notion connection was cancelled."
        case .missingPresentationAnchor:
            return "Unable to present the Notion login sheet."
        }
    }
}

final class NotionAuthSessionCoordinator: NSObject, NotionAuthSessionCoordinating {
    @MainActor
    func authenticate(using url: URL, callbackScheme: String) async throws -> URL {
        guard let anchor = UIApplication.shared.connectedScenes
            .compactMap({ $0 as? UIWindowScene })
            .flatMap(\.windows)
            .first(where: \.isKeyWindow) else {
            throw NotionAuthSessionError.missingPresentationAnchor
        }

        return try await withCheckedThrowingContinuation { continuation in
            let session = ASWebAuthenticationSession(url: url, callbackURLScheme: callbackScheme) { callbackURL, error in
                if let error = error as? ASWebAuthenticationSessionError,
                   error.code == .canceledLogin {
                    continuation.resume(throwing: NotionAuthSessionError.cancelled)
                    return
                }

                if let error {
                    continuation.resume(throwing: error)
                    return
                }

                guard let callbackURL else {
                    continuation.resume(throwing: NotionAuthSessionError.missingCallbackURL)
                    return
                }

                continuation.resume(returning: callbackURL)
            }

            let presentationContext = PresentationContextProvider(anchor: anchor)
            session.prefersEphemeralWebBrowserSession = false
            session.presentationContextProvider = presentationContext

            // Keep the provider alive for the lifetime of the session.
            SessionStore.shared.retain(session: session, provider: presentationContext)
            session.start()
        }
    }
}

private final class PresentationContextProvider: NSObject, ASWebAuthenticationPresentationContextProviding {
    private let anchor: ASPresentationAnchor

    init(anchor: ASPresentationAnchor) {
        self.anchor = anchor
    }

    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        anchor
    }
}

@MainActor
private final class SessionStore {
    static let shared = SessionStore()

    private var session: ASWebAuthenticationSession?
    private var provider: PresentationContextProvider?

    func retain(session: ASWebAuthenticationSession, provider: PresentationContextProvider) {
        self.session = session
        self.provider = provider
    }
}
