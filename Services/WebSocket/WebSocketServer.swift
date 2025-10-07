import Combine
import Foundation
import Network
import Starscream

// Explicitly specify Starscream's WebSocket to avoid ambiguity
typealias GlassWebSocket = Starscream.WebSocket

class WebSocketServer: NSObject, ObservableObject {
    @Published var connectedPlayers: [ConnectedPlayer] = []
    @Published var isServerRunning = false
    @Published var serverPort: UInt16 = 8080

    private var listener: NWListener?
    private var connections: [UUID: PlayerConnection] = [:]
    private var cancellables = Set<AnyCancellable>()

    override init() {
        super.init()
    }

    // MARK: - Server Functions (Host)
    func start(port: UInt16 = 8080) async throws {
        guard !isServerRunning else { return }

        let parameters = NWParameters.tcp
        parameters.allowLocalEndpointReuse = true

        listener = try NWListener(using: parameters, on: NWEndpoint.Port(integerLiteral: port))

        listener?.newConnectionHandler = { [weak self] connection in
            Task { @MainActor [weak self] in
                self?.handleNewConnection(connection)
            }
        }

        listener?.stateUpdateHandler = { [weak self] state in
            Task { @MainActor [weak self] in
                switch state {
                case .ready:
                    self?.isServerRunning = true
                    self?.serverPort = port
                    print("WebSocket server started on port \(port)")
                case .failed(let error):
                    print("Server failed: \(error)")
                    self?.isServerRunning = false
                default:
                    break
                }
            }
        }

        listener?.start(queue: .main)
    }

    func stop() {
        listener?.cancel()
        listener = nil

        // Close all connections
        connections.values.forEach { $0.close() }
        connections.removeAll()

        Task { @MainActor [weak self] in
            self?.isServerRunning = false
            self?.connectedPlayers.removeAll()
        }
    }

    func broadcast(_ message: GameMessage) {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601

        guard let data = try? encoder.encode(message) else {
            print("Failed to encode message")
            return
        }

        connections.values.forEach { playerConnection in
            playerConnection.send(data)
        }
    }

    func send(to playerId: UUID, message: GameMessage) {
        guard let connection = connections[playerId] else { return }

        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601

        guard let data = try? encoder.encode(message) else {
            print("Failed to encode message")
            return
        }

        connection.send(data)
    }

    // MARK: - Client Functions (Player)
    private var clientSocket: GlassWebSocket?

    func connectToHost(gameCode: String) async throws {
        // In a real implementation, you would discover the host's IP address
        // For now, this is a placeholder
        let hostIP = "192.168.1.100"  // This should be discovered via mDNS/Bonjour
        let url = URL(string: "ws://\(hostIP):8080")!

        var request = URLRequest(url: url)
        request.setValue(gameCode, forHTTPHeaderField: "Game-Code")

        clientSocket = WebSocket(request: request)
        clientSocket?.delegate = self
        clientSocket?.connect()
    }

    func send(_ message: GameMessage) {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601

        guard let data = try? encoder.encode(message),
            let jsonString = String(data: data, encoding: .utf8)
        else {
            print("Failed to encode message")
            return
        }

        clientSocket?.write(string: jsonString)
    }

    func disconnect() {
        clientSocket?.disconnect()
        clientSocket = nil
    }

    // MARK: - Private Methods
    private func handleNewConnection(_ connection: NWConnection) {
        let playerId = UUID()
        let playerConnection = PlayerConnection(id: playerId, connection: connection)
        connections[playerId] = playerConnection

        connection.start(queue: .main)
        receiveMessage(from: playerConnection)

        print("New player connected: \(playerId)")
    }

    private func receiveMessage(from playerConnection: PlayerConnection) {
        playerConnection.connection.receive(minimumIncompleteLength: 1, maximumLength: 65536) {
            [weak self] data, _, isComplete, error in

            Task { @MainActor in
                if let error = error {
                    print("Receive error: \(error)")
                    self?.removeConnection(playerConnection.id)
                    return
                }

                if let data = data {
                    self?.processMessage(data: data, from: playerConnection)
                }

                if !isComplete {
                    self?.receiveMessage(from: playerConnection)
                } else {
                    self?.removeConnection(playerConnection.id)
                }
            }
        }
    }

    private func processMessage(data: Data, from playerConnection: PlayerConnection) {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601

        guard let message = try? decoder.decode(GameMessage.self, from: data) else {
            print("Failed to decode message")
            return
        }

        handleMessage(message, from: playerConnection)
    }

    private func handleMessage(_ message: GameMessage, from playerConnection: PlayerConnection) {
        switch message.type {
        case .playerJoin:
            if case .playerJoin(let joinData) = message.data {
                handlePlayerJoin(joinData.player, connection: playerConnection)
            }
        case .playerLeave:
            removeConnection(playerConnection.id)
        case .playerAnswer:
            // Forward to game engine
            NotificationCenter.default.post(
                name: .playerAnswerReceived,
                object: message
            )
        default:
            print("Unhandled message type: \(message.type)")
        }
    }

    private func handlePlayerJoin(_ player: Player, connection: PlayerConnection) {
        let connectedPlayer = ConnectedPlayer(
            id: UUID(uuidString: player.id) ?? UUID(),
            name: player.name,
            score: player.score,
            isReady: player.isReady
        )

        Task { @MainActor [weak self] in
            self?.connectedPlayers.append(connectedPlayer)
        }

        // Send welcome message
        let welcomeMessage = GameMessage(
            type: .gameStart,
            data: .gameStart(.init(session: GameSession(hostId: "", gameCode: "")))
        )

        connection.send(try! JSONEncoder().encode(welcomeMessage))
    }

    private func removeConnection(_ id: UUID) {
        connections.removeValue(forKey: id)

        Task { @MainActor [weak self] in
            self?.connectedPlayers.removeAll { $0.id == id }
        }

        print("Player disconnected: \(id)")
    }

    func getLocalIPAddress() -> String? {
        var address: String?
        var ifaddr: UnsafeMutablePointer<ifaddrs>?

        if getifaddrs(&ifaddr) == 0 {
            var ptr = ifaddr
            while ptr != nil {
                defer { ptr = ptr?.pointee.ifa_next }

                let interface = ptr?.pointee
                let addrFamily = interface?.ifa_addr.pointee.sa_family

                if addrFamily == UInt8(AF_INET) {
                    let name = String(cString: (interface!.ifa_name))
                    if name == "en0" {  // WiFi interface
                        var hostname = [CChar](repeating: 0, count: Int(NI_MAXHOST))
                        getnameinfo(
                            interface?.ifa_addr, socklen_t((interface?.ifa_addr.pointee.sa_len)!),
                            &hostname, socklen_t(hostname.count),
                            nil, socklen_t(0), NI_NUMERICHOST)
                        address = String(cString: hostname)
                    }
                }
            }
            freeifaddrs(ifaddr)
        }

        return address
    }
}

// MARK: - WebSocketDelegate
extension WebSocketServer: WebSocketDelegate {
    func didReceive(event: WebSocketEvent, client: WebSocketClient) {
        switch event {
        case .connected(let headers):
            print("Connected to host: \(headers)")
        case .disconnected(let reason, let code):
            print("Disconnected: \(reason) with code: \(code)")
        case .text(let string):
            if let data = string.data(using: .utf8) {
                processClientMessage(data: data)
            }
        case .binary(let data):
            processClientMessage(data: data)
        case .error(let error):
            print("WebSocket error: \(error?.localizedDescription ?? "Unknown")")
        default:
            break
        }
    }

    private func processClientMessage(data: Data) {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601

        guard let message = try? decoder.decode(GameMessage.self, from: data) else {
            print("Failed to decode client message")
            return
        }

        // Post notification for game engine to handle
        Task { @MainActor in
            NotificationCenter.default.post(
                name: .gameMessageReceived,
                object: message
            )
        }
    }
}

// MARK: - Supporting Types
class PlayerConnection {
    let id: UUID
    let connection: NWConnection

    init(id: UUID, connection: NWConnection) {
        self.id = id
        self.connection = connection
    }

    func send(_ data: Data) {
        connection.send(
            content: data,
            completion: .contentProcessed { error in
                if let error = error {
                    print("Send error: \(error)")
                }
            })
    }

    func close() {
        connection.cancel()
    }
}

struct ConnectedPlayer: Identifiable {
    let id: UUID
    var name: String
    var score: Int = 0
    var isReady: Bool = false

    init(id: UUID, name: String, score: Int = 0, isReady: Bool = false) {
        self.id = id
        self.name = name
        self.score = score
        self.isReady = isReady
    }
}

// MARK: - Notifications
extension Notification.Name {
    static let playerAnswerReceived = Notification.Name("playerAnswerReceived")
    static let gameMessageReceived = Notification.Name("gameMessageReceived")
}
