import Foundation
import WebKit

/// A stable app-only origin gives WebKit one persistent store across launches.
@MainActor
final class GameFiles: NSObject, WKURLSchemeHandler {
    static let scheme = "polygolf"
    static let startURL = URL(string: "polygolf://app/index.html")!
    private let root = Bundle.main.resourceURL!.appendingPathComponent("dist", isDirectory: true)
    private let mimeTypes = [
        "html": "text/html", "js": "text/javascript", "css": "text/css",
        "json": "application/json", "svg": "image/svg+xml", "webp": "image/webp",
        "woff2": "font/woff2", "png": "image/png", "txt": "text/plain"
    ]

    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url, url.host == Self.startURL.host else {
            task.didFailWithError(URLError(.badURL))
            return
        }
        let path = url.path.isEmpty || url.path == "/" ? "index.html" : url.path
        let file = root.appendingPathComponent(path).standardizedFileURL
        guard file.path.hasPrefix(root.standardizedFileURL.path + "/"),
              let data = try? Data(contentsOf: file, options: .mappedIfSafe) else {
            task.didFailWithError(URLError(.fileDoesNotExist))
            return
        }
        let headers = ["Content-Type": mimeTypes[file.pathExtension.lowercased()] ?? "application/octet-stream",
                       "Content-Length": String(data.count), "Access-Control-Allow-Origin": "*"]
        let response = HTTPURLResponse(url: url, statusCode: 200, httpVersion: "HTTP/1.1", headerFields: headers)!
        task.didReceive(response)
        task.didReceive(data)
        task.didFinish()
    }

    // Each bundled file is delivered synchronously in the start callback.
    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}
}
