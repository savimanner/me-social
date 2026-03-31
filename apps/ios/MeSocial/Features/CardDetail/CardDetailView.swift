import SwiftUI

struct CardDetailView: View {
    @Bindable var model: AppModel
    let card: FeedCard

    @State private var prompt = "Push this into a sharper idea with one concrete next step."
    @State private var editorState: EditorState

    init(model: AppModel, card: FeedCard) {
        self.model = model
        self.card = card
        _editorState = State(initialValue: .from(card: card, draft: nil))
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                FeedCardCell(card: model.selectedCard ?? card)

                VStack(alignment: .leading, spacing: 8) {
                    Text("Why this showed up")
                        .font(.headline)

                    Text((model.selectedCard ?? card).rationale)
                        .foregroundStyle(.secondary)
                }

                VStack(alignment: .leading, spacing: 10) {
                    Text("Sources")
                        .font(.headline)

                    ForEach((model.selectedCard ?? card).sources) { source in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(source.title)
                                .font(.subheadline.bold())
                            Text(source.excerpt)
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                        }
                        .padding(12)
                        .background(Color.white.opacity(0.74), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                    }
                }

                VStack(alignment: .leading, spacing: 12) {
                    Text("Build on this")
                        .font(.headline)

                    TextField("Tell the model what to do", text: $prompt, axis: .vertical)
                        .textFieldStyle(.roundedBorder)

                    Picker("Intent", selection: Binding(
                        get: { model.generatedDraft?.intent ?? .createNew },
                        set: { _ in }
                    )) {
                        Text("Create new").tag(DraftIntent.createNew)
                        Text("Rewrite").tag(DraftIntent.rewriteExisting)
                    }
                    .disabled(true)

                    Button("Generate editable draft") {
                        Task {
                            await model.generateDraft(
                                cardID: card.id,
                                sourceItemID: card.sources.first?.sourceItemId,
                                intent: .createNew,
                                prompt: prompt
                            )

                            if let generatedDraft = model.generatedDraft {
                                editorState = .from(card: card, draft: generatedDraft)
                            }
                        }
                    }
                    .buttonStyle(.borderedProminent)
                }

                VStack(alignment: .leading, spacing: 12) {
                    Text("Editor")
                        .font(.headline)

                    TextField("Title", text: $editorState.title)
                        .textFieldStyle(.roundedBorder)

                    TextEditor(text: $editorState.body)
                        .frame(minHeight: 220)
                        .padding(12)
                        .background(Color.white.opacity(0.75), in: RoundedRectangle(cornerRadius: 20, style: .continuous))

                    Picker("Kind", selection: $editorState.kind) {
                        ForEach(SourceItemKind.allCases) { kind in
                            Text(kind.displayName).tag(kind)
                        }
                    }
                    .pickerStyle(.segmented)

                    TextField("Tags (comma separated)", text: Binding(
                        get: { editorState.tags.joined(separator: ", ") },
                        set: { editorState.tags = $0.split(separator: ",").map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty } }
                    ))
                    .textFieldStyle(.roundedBorder)

                    TextField("Author", text: $editorState.author)
                        .textFieldStyle(.roundedBorder)
                    TextField("Source title", text: $editorState.sourceTitle)
                        .textFieldStyle(.roundedBorder)
                    TextField("Source URL", text: $editorState.sourceURL)
                        .textFieldStyle(.roundedBorder)

                    HStack {
                        Button("Create as new note") {
                            Task { await model.createItem(from: editorState) }
                        }
                        .buttonStyle(.borderedProminent)

                        if let sourceItemID = card.sources.first?.sourceItemId {
                            Button("Rewrite source") {
                                Task { await model.updateItem(sourceItemID: sourceItemID, editor: editorState) }
                            }
                            .buttonStyle(.bordered)

                            Button("Archive source", role: .destructive) {
                                Task { await model.archiveItem(sourceItemID: sourceItemID) }
                            }
                            .buttonStyle(.bordered)
                        }
                    }
                }
            }
            .padding(20)
        }
        .navigationTitle("Detail")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await model.loadDetail(for: card)
        }
    }
}

