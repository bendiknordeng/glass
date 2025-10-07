import Foundation

struct GameSession: Codable, Identifiable, Equatable {
    let id: String
    let hostId: String
    var gameCode: String
    var players: [Player] = []
    var currentChallengeId: String?
    var challengeQueue: [String] = []  // Array of challenge IDs
    var status: GameStatus
    var settings: GameSettings
    var scores: [String: Int] = [:]  // playerID: score
    var createdAt: Date
    var startedAt: Date?
    var endedAt: Date?
    var currentRound: Int = 0
    var maxRounds: Int

    // Transient properties for runtime use (not stored in database)
    var currentChallenge: Challenge? = nil
    var challengeQueueObjects: [Challenge] = []

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

    // MARK: - Codable

    enum CodingKeys: String, CodingKey {
        case id
        case hostId = "host_id"
        case gameCode = "game_code"
        case currentChallengeId = "current_challenge_id"
        case challengeQueue = "challenge_queue"
        case status
        case currentRound = "current_round"
        case maxRounds = "max_rounds"
        case createdAt = "created_at"
        case startedAt = "started_at"
        case endedAt = "ended_at"

        // Settings fields (flattened in database)
        case maxPlayers = "max_players"
        case timeLimit = "time_limit"
        case scoreToWin = "score_to_win"
        case gameMode = "game_mode"
        case allowLateJoin = "allow_late_join"
        case showLeaderboardAfterEachRound = "show_leaderboard_after_each_round"
        case challengeTypes = "challenge_types"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)

        id = try container.decode(String.self, forKey: .id)
        hostId = try container.decode(String.self, forKey: .hostId)
        gameCode = try container.decode(String.self, forKey: .gameCode)
        currentChallengeId = try container.decodeIfPresent(String.self, forKey: .currentChallengeId)
        challengeQueue = try container.decodeIfPresent([String].self, forKey: .challengeQueue) ?? []
        status = try container.decode(GameStatus.self, forKey: .status)
        currentRound = try container.decodeIfPresent(Int.self, forKey: .currentRound) ?? 0
        maxRounds = try container.decodeIfPresent(Int.self, forKey: .maxRounds) ?? 10
        createdAt = try container.decode(Date.self, forKey: .createdAt)
        startedAt = try container.decodeIfPresent(Date.self, forKey: .startedAt)
        endedAt = try container.decodeIfPresent(Date.self, forKey: .endedAt)

        // Reconstruct settings from flattened fields
        let maxPlayers = try container.decodeIfPresent(Int.self, forKey: .maxPlayers) ?? 8
        let timeLimit = try container.decodeIfPresent(Double.self, forKey: .timeLimit) ?? 30
        let scoreToWin = try container.decodeIfPresent(Int.self, forKey: .scoreToWin) ?? 100
        let gameMode =
            try container.decodeIfPresent(GameSettings.GameMode.self, forKey: .gameMode) ?? .classic
        let allowLateJoin = try container.decodeIfPresent(Bool.self, forKey: .allowLateJoin) ?? true
        let showLeaderboard =
            try container.decodeIfPresent(Bool.self, forKey: .showLeaderboardAfterEachRound) ?? true
        let challengeTypes =
            try container.decodeIfPresent([ChallengeType].self, forKey: .challengeTypes)
            ?? ChallengeType.allCases

        settings = GameSettings(
            maxPlayers: maxPlayers,
            timeLimit: timeLimit,
            scoreToWin: scoreToWin,
            gameMode: gameMode,
            allowLateJoin: allowLateJoin,
            showLeaderboardAfterEachRound: showLeaderboard,
            challengeTypes: challengeTypes
        )

        // Initialize empty arrays for runtime properties
        players = []
        scores = [:]
        currentChallenge = nil
        challengeQueueObjects = []
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)

        try container.encode(id, forKey: .id)
        try container.encode(hostId, forKey: .hostId)
        try container.encode(gameCode, forKey: .gameCode)
        try container.encodeIfPresent(currentChallengeId, forKey: .currentChallengeId)
        try container.encode(challengeQueue, forKey: .challengeQueue)
        try container.encode(status, forKey: .status)
        try container.encode(currentRound, forKey: .currentRound)
        try container.encode(maxRounds, forKey: .maxRounds)
        try container.encode(createdAt, forKey: .createdAt)
        try container.encodeIfPresent(startedAt, forKey: .startedAt)
        try container.encodeIfPresent(endedAt, forKey: .endedAt)

        // Flatten settings into individual fields
        try container.encode(settings.maxPlayers, forKey: .maxPlayers)
        try container.encode(settings.timeLimit, forKey: .timeLimit)
        try container.encode(settings.scoreToWin, forKey: .scoreToWin)
        try container.encode(settings.gameMode, forKey: .gameMode)
        try container.encode(settings.allowLateJoin, forKey: .allowLateJoin)
        try container.encode(
            settings.showLeaderboardAfterEachRound, forKey: .showLeaderboardAfterEachRound)
        try container.encode(settings.challengeTypes, forKey: .challengeTypes)
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

    // MARK: - Challenge Management

    mutating func setCurrentChallenge(_ challenge: Challenge?) {
        self.currentChallenge = challenge
        self.currentChallengeId = challenge?.id
    }

    mutating func addChallengeToQueue(_ challenge: Challenge) {
        challengeQueue.append(challenge.id)
        challengeQueueObjects.append(challenge)
    }

    mutating func addChallengesToQueue(_ challenges: [Challenge]) {
        let challengeIds = challenges.map { $0.id }
        challengeQueue.append(contentsOf: challengeIds)
        challengeQueueObjects.append(contentsOf: challenges)
    }

    mutating func nextChallenge() -> Challenge? {
        guard !challengeQueue.isEmpty, !challengeQueueObjects.isEmpty else {
            return nil
        }

        challengeQueue.removeFirst()
        let challenge = challengeQueueObjects.removeFirst()
        setCurrentChallenge(challenge)
        return challenge
    }

    func hasQueuedChallenges() -> Bool {
        return !challengeQueue.isEmpty
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
