import Foundation

// MARK: - WebSocket Messages
struct GameMessage: Codable {
    let type: MessageType
    let data: MessageData
    let timestamp: Date
    let senderId: String?

    init(type: MessageType, data: MessageData, senderId: String? = nil) {
        self.type = type
        self.data = data
        self.timestamp = Date()
        self.senderId = senderId
    }
}

enum MessageType: String, Codable {
    case playerJoin = "player_join"
    case playerLeave = "player_leave"
    case gameStart = "game_start"
    case challengeStart = "challenge_start"
    case playerAnswer = "player_answer"
    case roundEnd = "round_end"
    case gameEnd = "game_end"
    case scoreUpdate = "score_update"
    case error = "error"
    case heartbeat = "heartbeat"
}

enum MessageData: Codable {
    case playerJoin(PlayerJoinData)
    case playerLeave(PlayerLeaveData)
    case gameStart(GameStartData)
    case challengeStart(ChallengeStartData)
    case playerAnswer(PlayerAnswerData)
    case roundEnd(RoundEndData)
    case gameEnd(GameEndData)
    case scoreUpdate(ScoreUpdateData)
    case error(ErrorData)
    case heartbeat

    struct PlayerJoinData: Codable {
        let player: Player
        let gameCode: String
    }

    struct PlayerLeaveData: Codable {
        let playerId: String
    }

    struct GameStartData: Codable {
        let session: GameSession
    }

    struct ChallengeStartData: Codable {
        let challenge: Challenge
        let roundNumber: Int
    }

    struct PlayerAnswerData: Codable {
        let playerId: String
        let answer: String
        let responseTime: TimeInterval
    }

    struct RoundEndData: Codable {
        let scores: [UUID: Int]
        let responses: [UUID: String]
        let correctAnswer: String?
        let nextRoundDelay: Int

        init(
            scores: [UUID: Int], responses: [UUID: String], correctAnswer: String? = nil,
            nextRoundDelay: Int = 5
        ) {
            self.scores = scores
            self.responses = responses
            self.correctAnswer = correctAnswer
            self.nextRoundDelay = nextRoundDelay
        }
    }

    struct GameEndData: Codable {
        let winner: Player?
        let finalScores: [String: Int]
        let gameStats: GameStats
    }

    struct ScoreUpdateData: Codable {
        let playerId: String
        let newScore: Int
        let pointsEarned: Int
    }

    struct ErrorData: Codable {
        let message: String
        let code: String?
    }

    struct PlayerResult: Codable {
        let playerId: String
        let answer: String
        let isCorrect: Bool
        let pointsEarned: Int
        let responseTime: TimeInterval
    }

    struct GameStats: Codable {
        let totalRounds: Int
        let totalPlayers: Int
        let duration: TimeInterval
        let averageResponseTime: TimeInterval
    }
}
