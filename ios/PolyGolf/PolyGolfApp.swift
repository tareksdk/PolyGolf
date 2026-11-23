import SwiftUI

@main
struct PolyGolfApp: App {
    var body: some Scene {
        WindowGroup { GameScreen() }
    }
}

private struct LocalPage: Identifiable {
    let url: URL
    var id: URL { url }
}

private struct GameScreen: View {
    @State private var page: LocalPage?
    @State private var loadError: String?
    @State private var attempt = 0

    var body: some View {
        ZStack {
            Color(red: 0.08, green: 0.19, blue: 0.15).ignoresSafeArea()
            GameWebView(url: GameFiles.startURL, openPage: { page = LocalPage(url: $0) },
                        onError: { loadError = $0 })
                .id(attempt)
            if let loadError {
                VStack(spacing: 16) {
                    Image(systemName: "flag.fill").font(.largeTitle)
                    Text("The course couldn’t open").font(.title2.bold())
                    Text(loadError).multilineTextAlignment(.center)
                    Button("Try again") {
                        self.loadError = nil
                        attempt += 1
                    }
                    .buttonStyle(.borderedProminent)
                }
                .padding(28)
                .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 20))
                .padding()
            }
        }
        .statusBarHidden()
        .sheet(item: $page) { item in
            NavigationStack {
                GameWebView(url: item.url, openPage: nil, onError: { message in
                    page = nil
                    loadError = message
                })
                .navigationTitle("PolyGolf")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Done") { page = nil }
                    }
                }
            }
        }
    }
}
