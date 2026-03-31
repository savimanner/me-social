import SwiftUI

@main
struct MeSocialApp: App {
    @State private var model = AppModel()

    var body: some Scene {
        WindowGroup {
            RootView(model: model)
                .task {
                    await model.start()
                }
        }
    }
}

struct RootView: View {
    @Bindable var model: AppModel

    var body: some View {
        NavigationStack {
            ZStack {
                LinearGradient(
                    colors: [
                        Color(red: 0.98, green: 0.93, blue: 0.83),
                        Color(red: 0.91, green: 0.95, blue: 0.88),
                        Color(red: 0.85, green: 0.90, blue: 0.97)
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()

                switch model.phase {
                case .loading:
                    ProgressView("Loading feed")
                        .progressViewStyle(.circular)
                case .onboarding:
                    OnboardingView(model: model)
                case .feed:
                    FeedView(model: model)
                }
            }
            .alert("Something went wrong", isPresented: Binding(
                get: { model.errorMessage != nil },
                set: { newValue in
                    if !newValue { model.errorMessage = nil }
                }
            )) {
                Button("Dismiss", role: .cancel) {}
            } message: {
                Text(model.errorMessage ?? "")
            }
        }
    }
}

