import Foundation

struct GameSession: Codable, Identifiable, Equatable {
    let id: String
    let hostId: String
    var gameCode: String
    var players: [Player] = []
    var currentChallenge: Challenge?
    var challengeQueue: [Challenge] = []
    var status: GameStatus
    var settings: GameSettings
    var scores: [String: Int] = [:]  // playerID: score
    var createdAt: Date
    var startedAt: Date?
    var endedAt: Date?
    var currentRound: Int = 0
    var maxRounds: Int

    init(
        id: String = UUID().uuidString,
        hostId: String,
        gameCode: String = GameSession.generateGameCode(),
        settings: GameSettings = GameSettings(),
        maxRounds: Int = 10
    ) {
        self.id = id
        self.hostId = hostId
        self.gameCode = gameCode
        self.status = .waiting
        self.settings = settings
        self.createdAt = Date()
        self.maxRounds = maxRounds
    }

    // Helper methods
    mutating func addPlayer(_ player: Player) -> Bool {
        guard players.count < settings.maxPlayers,
            !players.contains(where: { $0.id == player.id })
        else {
            return false
        }

        players.append(player)
        scores[player.id] = 0
        return true
    }

    mutating func removePlayer(withId playerId: String) {
        players.removeAll { $0.id == playerId }
        scores.removeValue(forKey: playerId)
    }

    mutating func updatePlayerScore(playerId: String, points: Int) {
        scores[playerId, default: 0] += points

        if let playerIndex = players.firstIndex(where: { $0.id == playerId }) {
            players[playerIndex].score = scores[playerId] ?? 0
        }
    }

    func getLeaderboard() -> [(Player, Int)] {
        return players.compactMap { player in
            guard let score = scores[player.id] else { return nil }
            return (player, score)
        }.sorted { $0.1 > $1.1 }
    }

    static func generateGameCode() -> String {
        let letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        return String((0..<4).map { _ in letters.randomElement()! })
    }
}

enum GameStatus: String, Codable {
    case waiting = "waiting"
    case starting = "starting"
    case inProgress = "in_progress"
    case paused = "paused"
    case finished = "finished"
    case abandoned = "abandoned"
}

struct GameSettings: Codable {
    var maxPlayers: Int = 8
    var timeLimit: TimeInterval = 30
    var scoreToWin: Int = 100
    var gameMode: GameMode = .classic
    var allowLateJoin: Bool = true
    var showLeaderboardAfterEachRound: Bool = true
    var challengeTypes: [ChallengeType] = ChallengeType.allCases

    enum GameMode: String, Codable, CaseIterable {
        case classic = "classic"
        case party = "party"
        case family = "family"
        case custom = "custom"

        var displayName: String {
            switch self {
            case .classic: return "Classic"
            case .party: return "Party Mode"
            case .family: return "Family Friendly"
            case .custom: return "Custom"
            }
        }

        var defaultChallengeTypes: [ChallengeType] {
            switch self {
            case .classic:
                return [.quiz, .category, .reaction]
            case .party:
                return [.quiz, .drinking, .truth, .dare, .creative]
            case .family:
                return [.quiz, .category, .creative, .geoguessing]
            case .custom:
                return ChallengeType.allCases
            }
        }
    }
}

// MARK: - Equatable
extension GameSession {
    static func == (lhs: GameSession, rhs: GameSession) -> Bool {
        return lhs.id == rhs.id && lhs.status == rhs.status && lhs.currentRound == rhs.currentRound
            && lhs.players.count == rhs.players.count
    }
}
