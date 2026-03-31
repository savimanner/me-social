import Foundation

struct OfflineFeedStore {
    private let url: URL

    init(filename: String = "cached-feed.json") {
        let baseURL = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        let directory = baseURL.appendingPathComponent("MeSocial", isDirectory: true)
        try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        self.url = directory.appendingPathComponent(filename)
    }

    func load() -> FeedPage? {
        guard let data = try? Data(contentsOf: url) else { return nil }
        return try? JSONDecoder.meSocial.decode(FeedPage.self, from: data)
    }

    func save(_ page: FeedPage) {
        guard let data = try? JSONEncoder.meSocial.encode(page) else { return }
        try? data.write(to: url, options: Data.WritingOptions.atomic)
    }
}
