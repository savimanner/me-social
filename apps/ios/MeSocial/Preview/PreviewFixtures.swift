import Foundation

enum PreviewFixtures {
    static let feedCard = FeedCard(
        id: "card_preview",
        workspaceId: "ws_preview",
        userId: "user_preview",
        headline: "Turn scattered notes into a feed that helps you think better",
        body: "Your old notes already contain the seeds of better work. The useful move is not just resurfacing them, but rewriting them into something you can act on today.",
        rationale: "A preview card built from one note and one book snippet.",
        status: "ready",
        score: 42.0,
        sourceSignature: "sig_preview",
        mediaPrompt: nil,
        sources: [
            FeedCardSource(
                sourceItemId: "src_preview",
                notionPageId: "page_preview",
                title: "Notes on attention",
                kind: .idea,
                excerpt: "Make tools that deepen reflection instead of stretching attention thinner."
            )
        ],
        createdAt: "2026-03-30T12:00:00Z",
        updatedAt: "2026-03-30T12:00:00Z"
    )
}

