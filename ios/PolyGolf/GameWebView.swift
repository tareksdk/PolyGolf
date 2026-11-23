import SwiftUI
import WebKit

struct GameWebView: UIViewRepresentable {
    let url: URL
    let openPage: ((URL) -> Void)?
    let onError: (String) -> Void

    func makeCoordinator() -> Coordinator { Coordinator(self) }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.setURLSchemeHandler(GameFiles(), forURLScheme: GameFiles.scheme)
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("-freshPracticeSession") {
            config.websiteDataStore = .nonPersistent()
        }
        #endif
        config.allowsInlineMediaPlayback = true
        config.userContentController.add(context.coordinator, name: "golfFeedback")
        let view = WKWebView(frame: .zero, configuration: config)
        view.navigationDelegate = context.coordinator
        view.uiDelegate = context.coordinator
        view.isOpaque = false
        view.backgroundColor = .clear
        view.scrollView.contentInsetAdjustmentBehavior = .never
        view.scrollView.bounces = false
        view.allowsBackForwardNavigationGestures = false
        #if DEBUG
        view.isInspectable = true
        #endif
        context.coordinator.webView = view
        if openPage != nil {
            NotificationCenter.default.addObserver(context.coordinator, selector: #selector(Coordinator.suspendGame),
                                                   name: UIApplication.willResignActiveNotification, object: nil)
        }
        view.load(URLRequest(url: url))
        return view
    }

    func updateUIView(_ view: WKWebView, context: Context) {}

    static func dismantleUIView(_ view: WKWebView, coordinator: Coordinator) {
        NotificationCenter.default.removeObserver(coordinator)
        view.configuration.userContentController.removeScriptMessageHandler(forName: "golfFeedback")
        view.navigationDelegate = nil
        view.uiDelegate = nil
        view.stopLoading()
    }

    @MainActor
    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
        let parent: GameWebView
        weak var webView: WKWebView?

        init(_ parent: GameWebView) { self.parent = parent }

        @objc func suspendGame() {
            webView?.evaluateJavaScript("window.dispatchEvent(new Event('polygolf-suspend'))")
        }

        func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
            guard message.frameInfo.isMainFrame, message.frameInfo.request.url?.scheme == GameFiles.scheme,
                  let feedback = message.body as? String else { return }
            switch feedback {
            case "tick": UISelectionFeedbackGenerator().selectionChanged()
            case "swing": UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            default: break
            }
        }

        func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let target = action.request.url else { decisionHandler(.cancel); return }
            if target.scheme == GameFiles.scheme && target.host == GameFiles.startURL.host {
                if let openPage = parent.openPage, !["", "/", "/index.html"].contains(target.path),
                   target.pathExtension == "html" {
                    decisionHandler(.cancel)
                    openPage(target)
                } else {
                    decisionHandler(.allow)
                }
                return
            }
            decisionHandler(.cancel)
            if ["https", "http", "mailto"].contains(target.scheme),
               action.navigationType == .linkActivated || action.targetFrame == nil {
                UIApplication.shared.open(target)
            }
        }

        func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                     for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
            if action.targetFrame == nil, let target = action.request.url,
               target.scheme == GameFiles.scheme, target.host == GameFiles.startURL.host {
                webView.load(action.request)
            }
            return nil
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            report(error)
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            report(error)
        }

        func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
            parent.onError("The game was interrupted. Reopen the course to continue.")
        }

        private func report(_ error: Error) {
            guard (error as NSError).code != NSURLErrorCancelled else { return }
            parent.onError(error.localizedDescription)
        }
    }
}
