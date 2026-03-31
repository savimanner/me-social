import SwiftUI

struct OnboardingView: View {
    @Bindable var model: AppModel

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Text("A feed for your best thoughts")
                    .font(.system(size: 36, weight: .bold, design: .serif))
                    .foregroundStyle(Color.black.opacity(0.85))

                Text("Connect a Notion database, map the fields once, and let the app turn notes, book snippets, and ideas into a feed that is actually useful.")
                    .font(.headline)
                    .foregroundStyle(.black.opacity(0.7))

                GroupBox {
                    VStack(alignment: .leading, spacing: 12) {
                        LabeledContent("Workspace name") {
                            TextField("Personal Lab", text: $model.onboarding.workspaceName)
                                .textInputAutocapitalization(.words)
                        }

                        LabeledContent("Notion workspace ID") {
                            TextField("notion_workspace", text: $model.onboarding.notionWorkspaceID)
                                .textInputAutocapitalization(.never)
                                .autocorrectionDisabled()
                        }

                        LabeledContent("Notion token") {
                            SecureField("secret_...", text: $model.onboarding.notionToken)
                                .textInputAutocapitalization(.never)
                                .autocorrectionDisabled()
                        }

                        Button("Load databases") {
                            Task { await model.loadDatabases() }
                        }
                        .buttonStyle(.borderedProminent)
                    }
                } label: {
                    Text("Connect Notion")
                        .font(.headline)
                }

                if !model.onboarding.availableDatabases.isEmpty {
                    GroupBox {
                        VStack(alignment: .leading, spacing: 12) {
                            Picker("Source database", selection: Binding(
                                get: { model.onboarding.selectedDatabase },
                                set: { model.onboarding.selectedDatabase = $0 }
                            )) {
                                ForEach(model.onboarding.availableDatabases, id: \.self) { database in
                                    Text(database.title).tag(Optional(database))
                                }
                            }

                            Text("Field mapping")
                                .font(.headline)

                            mappingRow(title: "Title", value: $model.onboarding.mapping.title)
                            mappingRow(title: "Content", value: $model.onboarding.mapping.content)
                            mappingRow(title: "Kind", value: $model.onboarding.mapping.kind)
                            mappingRow(title: "Status", value: $model.onboarding.mapping.status)
                            mappingRow(title: "Tags", value: $model.onboarding.mapping.tags)
                        }
                    } label: {
                        Text("Source configuration")
                            .font(.headline)
                    }
                }

                Button {
                    Task { await model.connectWorkspace() }
                } label: {
                    HStack {
                        Text("Start my feed")
                        Image(systemName: "arrow.right")
                    }
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .disabled(model.onboarding.selectedDatabase == nil || model.onboarding.notionToken.isEmpty)
            }
            .padding(24)
        }
    }

    private func mappingRow(title: String, value: Binding<String>) -> some View {
        LabeledContent(title) {
            TextField(title, text: value)
                .textInputAutocapitalization(.words)
        }
    }
}

