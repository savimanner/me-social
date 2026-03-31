import SwiftUI

struct FeedView: View {
    @Bindable var model: AppModel

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Me Social")
                        .font(.system(size: 18, weight: .semibold, design: .rounded))
                        .foregroundStyle(.secondary)

                    Text("Your notes, rewritten into a better feed.")
                        .font(.system(size: 34, weight: .bold, design: .serif))
                        .foregroundStyle(.black.opacity(0.86))
                }

                ForEach(model.feedCards) { card in
                    NavigationLink {
                        CardDetailView(model: model, card: card)
                    } label: {
                        FeedCardCell(card: card)
                    }
                    .buttonStyle(.plain)
                    .contextMenu {
                        Button("Save") { Task { await model.submitFeedback(for: card, action: .save) } }
                        Button("Dismiss", role: .destructive) { Task { await model.submitFeedback(for: card, action: .dismiss) } }
                        Button("Approve") { Task { await model.submitFeedback(for: card, action: .approve) } }
                    }
                }

                if let nextCursor = model.nextCursor, !nextCursor.isEmpty {
                    Button("Load more") {
                        Task {
                            try? await model.loadFeed()
                        }
                    }
                    .buttonStyle(.bordered)
                    .frame(maxWidth: .infinity)
                }
            }
            .padding(20)
        }
        .refreshable {
            try? await model.refreshFeed()
        }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    Task { try? await model.refreshFeed() }
                } label: {
                    Image(systemName: "sparkles.rectangle.stack")
                }
            }
        }
    }
}
