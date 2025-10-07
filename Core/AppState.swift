import Combine
import SwiftUI

public class AppState: ObservableObject {
    @Published var currentUser: User?
    @Published var isHost: Bool = false
    @Published var currentGameSession: GameSession?
    @Published var connectionState: ConnectionState = .disconnected
    @Published var networkInfo: NetworkInfo?

    enum ConnectionState {
        case disconnected
        case connecting
        case connected
        case error(String)
    }

    struct NetworkInfo {
        let ipAddress: String
        let port: Int
        let gameCode: String
    }

    // MARK: - Game State Management
    func setAsHost() {
        isHost = true
    }

    func setAsPlayer() {
        isHost = false
    }

    func updateConnectionState(_ state: ConnectionState) {
        DispatchQueue.main.async {
            self.connectionState = state
        }
    }

    func setNetworkInfo(ip: String, port: Int, gameCode: String) {
        networkInfo = NetworkInfo(ipAddress: ip, port: port, gameCode: gameCode)
    }

    func clearSession() {
        currentGameSession = nil
        connectionState = .disconnected
        networkInfo = nil
        isHost = false
    }
}
