import Foundation
import SpectaclesKit
import UIKit

final class DemoAuthentication: Authentication {}

struct BondingData: Bonding, Identifiable {
    let id: String
}

@MainActor
final class Model: ObservableObject {
    static let lensName = "SECOND CHANCE"
    static let requestText = "secondchance.call.request"

    var (deeplinkStream, deeplinkContinuation) = AsyncStream<URL>.makeStream()
    let bondingManager: any BondingManager
    var currentSession: SpectaclesSession?

    @Published var bondings: [BondingData] = []
    @Published var sessionStarted = false
    @Published var status = "Pair with SECOND CHANCE to receive call requests."
    @Published var pendingCall = false
    @Published var localBridgeURL: String {
        didSet { UserDefaults.standard.set(localBridgeURL, forKey: "SecondChanceBridgeURL") }
    }
    @Published var bridgeListening = false
    private var bridgeTask: Task<Void, Never>?
    private var lastBridgeRequestId: Int?
    @Published var phoneNumber: String {
        didSet { UserDefaults.standard.set(phoneNumber, forKey: "SecondChanceTestNumber") }
    }

    init() {
        phoneNumber = UserDefaults.standard.string(forKey: "SecondChanceTestNumber") ?? ""
        localBridgeURL = UserDefaults.standard.string(forKey: "SecondChanceBridgeURL") ?? "http://10.8.176.66:4173"
        let identifier = ClientIdentifier(
            clientId: Bundle.main.bundleIdentifier ?? "org.secondchance.phonebridge",
            appName: "Second Chance Phone"
        )!
        bondingManager = BuilderFactory.create()
            .setIdentifier(identifier)
            .setVersion("1.0")
            .setAuth(DemoAuthentication())
            .build()
        refreshBondings()
    }

    func pushDeeplinkURL(url: URL) { deeplinkContinuation.yield(url) }

    func refreshBondings() {
        bondings = bondingManager.availableBondings().map { BondingData(id: $0.id) }
    }

    func bind() {
        Task {
            (deeplinkStream, deeplinkContinuation) = AsyncStream<URL>.makeStream()
            let result = await bondingManager.bind(
                request: .singleLensByName(lensName: Self.lensName),
                deeplinkAsyncStream: deeplinkStream
            )
            switch result {
            case .success:
                refreshBondings()
                status = "Paired. Start the session while the Lens is open."
            case .failure(let error):
                status = "Pairing failed: \(error.localizedDescription)"
            }
        }
    }

    func unbind(id: String) {
        Task {
            (deeplinkStream, deeplinkContinuation) = AsyncStream<URL>.makeStream()
            let result = await bondingManager.unbind(id: id, deeplinkAsyncStream: deeplinkStream)
            switch result {
            case .success:
                refreshBondings()
                status = "Pairing removed."
            case .failure(let error):
                status = "Unable to unpair: \(error.localizedDescription)"
            }
        }
    }

    func startSession(binding: any Bonding) {
        do {
            currentSession = try bondingManager.createSession(
                bonding: binding,
                request: SessionRequest(
                    autoReconnect: true,
                    acceptUnfusedSpectacles: true,
                    acceptUntrustedLenses: true
                ),
                delegateBuilder: { _ in self }
            )
            sessionStarted = true
            status = "Connecting to Spectacles…"
            if let session = currentSession {
                Task { [weak self] in
                    for await connection in session.connectionStatusStream {
                        switch connection {
                        case .connected:
                            self?.status = "Connected. Say ‘Call my contact’ to the glasses."
                        case .disconnected:
                            self?.status = "Disconnected. Reopen the Lens and session."
                        case .error(let error):
                            self?.status = "Connection error: \(error.localizedDescription)"
                        default: break
                        }
                    }
                }
            }
        } catch {
            status = "Session failed: \(error.localizedDescription)"
        }
    }

    func stopSession() {
        currentSession?.close(reason: nil)
        currentSession = nil
        sessionStarted = false
        pendingCall = false
        status = "Session stopped."
    }

    private struct BridgeState: Decodable {
        let requestId: Int
        let requestedAt: Double
    }

    func startLocalBridge() {
        guard !bridgeListening else { return }
        guard let base = URL(string: localBridgeURL.trimmingCharacters(in: .whitespacesAndNewlines)),
              base.scheme == "http", let host = base.host, !host.isEmpty,
              let endpoint = URL(string: "/api/phone/state", relativeTo: base)?.absoluteURL else {
            status = "Enter this Mac's local http:// address first."
            return
        }
        bridgeListening = true
        lastBridgeRequestId = nil
        status = "Connecting to the local Mac bridge…"
        bridgeTask = Task { [weak self] in
            guard let self else { return }
            while !Task.isCancelled && self.bridgeListening {
                do {
                    var request = URLRequest(url: endpoint)
                    request.cachePolicy = .reloadIgnoringLocalCacheData
                    request.timeoutInterval = 5
                    let (data, response) = try await URLSession.shared.data(for: request)
                    guard (response as? HTTPURLResponse)?.statusCode == 200 else {
                        throw URLError(.badServerResponse)
                    }
                    let state = try JSONDecoder().decode(BridgeState.self, from: data)
                    if let previous = self.lastBridgeRequestId,
                       state.requestId > previous,
                       Date().timeIntervalSince1970 * 1000 - state.requestedAt < 30_000 {
                        self.pendingCall = true
                        self.status = "The glasses requested a call. Confirm on this iPhone."
                    } else if self.lastBridgeRequestId == nil {
                        self.status = "Local bridge ready. Say ‘Call my contact’ to the glasses."
                    }
                    self.lastBridgeRequestId = state.requestId
                } catch {
                    if !Task.isCancelled {
                        self.status = "Mac bridge unavailable: \(error.localizedDescription)"
                    }
                }
                try? await Task.sleep(for: .seconds(2))
            }
        }
    }

    func stopLocalBridge() {
        bridgeListening = false
        bridgeTask?.cancel()
        bridgeTask = nil
        status = "Local bridge stopped."
    }

    var normalizedNumber: String? {
        let trimmed = phoneNumber.trimmingCharacters(in: .whitespacesAndNewlines)
        let digits = trimmed.filter(\.isNumber)
        guard digits.count >= 7, digits.count <= 15,
              trimmed.allSatisfy({ $0.isNumber || $0 == "+" || $0 == " " || $0 == "-" || $0 == "(" || $0 == ")" }),
              !["911", "112", "999", "000"].contains(digits) else { return nil }
        return (trimmed.hasPrefix("+") ? "+" : "") + digits
    }

    func openDialer() {
        guard let number = normalizedNumber, let url = URL(string: "tel:\(number)") else {
            status = "Enter a valid non-emergency number on this phone first."
            return
        }
        UIApplication.shared.open(url) { [weak self] opened in
            Task { @MainActor in
                self?.status = opened
                    ? "iPhone opened the system call confirmation. Confirm on the phone."
                    : "iPhone could not open the Phone app."
                self?.pendingCall = !opened
            }
        }
    }

    fileprivate func receiveCallRequest() {
        pendingCall = true
        status = "The glasses requested a call. iPhone confirmation is required."
        if UIApplication.shared.applicationState == .active { openDialer() }
    }
}

extension Model: SpectaclesRequestDelegate {
    nonisolated func processServiceRequest(_ request: SpectaclesRequest) async {
        switch request {
        case .api(let apiRequest):
            switch apiRequest {
            case .call(let callRequest):
                let text = String(data: callRequest.params, encoding: .utf8) ?? ""
                guard text == Self.requestText else {
                    callRequest.finish(throwing: .badRequest)
                    return
                }
                await receiveCallRequest()
                callRequest.yield(Data("phone_request_received".utf8), isComplete: true)
            case .notify(let notifyRequest):
                let text = String(data: notifyRequest.params, encoding: .utf8) ?? ""
                if text == Self.requestText { await receiveCallRequest() }
            }
        case .asset(let assetRequest):
            if case .load(let asset) = assetRequest {
                asset.complete(throwing: .notFound)
            }
        }
    }
}
