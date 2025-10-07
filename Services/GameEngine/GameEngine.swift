import Combine
import Foundation

class GameEngine: ObservableObject, @unchecked Sendable {
    @Published var currentSession: GameSession?
    @Published var gameState: GameState = .idle
    @Published var currentChallenge: Challenge?
    @Published var timeRemaining: TimeInterval = 0
    @Published var playerAnswers: [String: String] = [:]

    private let webSocketServer = WebSocketServer()
    private let castingService = CastingService()
    private let supabase = SupabaseService.shared
    private var challengeTimer: Timer?
    private var cancellables = Set<AnyCancellable>()

    enum GameState {
        case idle
        case hosting
        case joining
        case waiting
        case playing
        case scoreboard
        case finished
    }

    init() {
        setupBindings()
    }

    private func setupBindings() {
        webSocketServer.$connectedPlayers
            .sink { [weak self] players in
                self?.updateSessionPlayers(players)
            }
            .store(in: &cancellables)
    }

    // MARK: - Host Functions
    func startHosting(settings: GameSettings? = nil) async throws {
        let gameSettings = settings ?? GameSettings()

        // Create new game session
        guard let hostId = AuthenticationManager.shared.currentUser?.id else {
            throw GameEngineError.notAuthenticated
        }

        let session = GameSession(hostId: hostId, settings: gameSettings)
        currentSession = session

        // Start local WebSocket server
        try await webSocketServer.start()

        // Start casting service
        castingService.startCasting()

        // Sync with Supabase
        if supabase.isConnected {
            try await supabase.createGameSession(session)
        }

        gameState = .hosting
    }

    func startGame() async throws {
        guard var session = currentSession,
            session.players.count >= 2
        else {
            throw GameEngineError.insufficientPlayers
        }

        // Generate challenge queue
        session.challengeQueue = try await generateChallengeQueue(for: session)
        session.status = .inProgress
        session.startedAt = Date()

        currentSession = session
        gameState = .playing

        // Broadcast game start
        webSocketServer.broadcast(
            GameMessage(
                type: .gameStart,
                data: .gameStart(.init(session: session))
            ))

        // Start first challenge
        try await nextChallenge()
    }

    func nextChallenge() async throws {
        guard var session = currentSession else { return }

        // Check if game should end
        if session.currentRound >= session.maxRounds {
            try await endGame()
            return
        }

        // Get next challenge
        guard !session.challengeQueue.isEmpty else {
            throw GameEngineError.noChallengesAvailable
        }

        let challenge = session.challengeQueue.removeFirst()
        session.currentChallenge = challenge
        session.currentRound += 1

        currentSession = session
        currentChallenge = challenge
        timeRemaining = challenge.timeLimit
        playerAnswers.removeAll()

        // Broadcast challenge start
        webSocketServer.broadcast(
            GameMessage(
                type: .challengeStart,
                data: .challengeStart(
                    .init(challenge: challenge, roundNumber: session.currentRound))
            ))

        // Start timer
        startChallengeTimer()
    }

    func endChallenge() async throws {
        challengeTimer?.invalidate()
        challengeTimer = nil

        guard var session = currentSession,
            let challenge = currentChallenge
        else { return }

        // Calculate scores
        let results = calculateRoundResults(challenge: challenge, answers: playerAnswers)

        // Update player scores
        for result in results {
            session.updatePlayerScore(playerId: result.playerId, points: result.pointsEarned)
        }

        currentSession = session

        // Broadcast round end
        let scoresDict = session.players.reduce(into: [UUID: Int]()) { dict, player in
            if let playerId = UUID(uuidString: player.id) {
                dict[playerId] = player.score
            }
        }

        webSocketServer.broadcast(
            GameMessage(
                type: .roundEnd,
                data: .roundEnd(
                    MessageData.RoundEndData(
                        scores: scoresDict,
                        responses: [:],  // Simplified for now
                        correctAnswer: nil,
                        nextRoundDelay: 5
                    ))
            ))

        gameState = .scoreboard

        // Auto-advance after showing results
        Task { @MainActor in
            try await Task.sleep(nanoseconds: 5_000_000_000)  // 5 seconds
            try await self.nextChallenge()
        }
    }

    func endGame() async throws {
        challengeTimer?.invalidate()
        challengeTimer = nil

        guard var session = currentSession else { return }

        session.status = .finished
        session.endedAt = Date()

        let leaderboard = session.getLeaderboard()
        let winner = leaderboard.first?.0

        currentSession = session
        gameState = .finished

        // Broadcast game end
        webSocketServer.broadcast(
            GameMessage(
                type: .gameEnd,
                data: .gameEnd(
                    .init(
                        winner: winner,
                        finalScores: session.scores,
                        gameStats: .init(
                            totalRounds: session.currentRound,
                            totalPlayers: session.players.count,
                            duration: Date().timeIntervalSince(
                                session.startedAt ?? session.createdAt),
                            averageResponseTime: 0  // TODO: Calculate
                        )
                    ))
            ))

        // Update user stats
        updateUserStats(session: session, winner: winner)
    }

    // MARK: - Player Functions
    func joinGame(gameCode: String, playerName: String) async throws {
        // Try to find game session
        let session: GameSession

        if supabase.isConnected {
            guard let foundSession = try await supabase.getGameSession(code: gameCode) else {
                throw GameEngineError.gameNotFound
            }
            session = foundSession
        } else {
            // Local network discovery (placeholder)
            throw GameEngineError.gameNotFound
        }

        // Create player
        let player = Player(name: playerName)

        // Connect to host
        try await webSocketServer.connectToHost(gameCode: gameCode)

        // Send join request
        webSocketServer.send(
            GameMessage(
                type: .playerJoin,
                data: .playerJoin(.init(player: player, gameCode: gameCode)),
                senderId: player.id
            ))

        currentSession = session
        gameState = .waiting
    }

    func submitAnswer(_ answer: String) {
        guard let playerId = AuthenticationManager.shared.currentUser?.id else { return }

        playerAnswers[playerId] = answer

        webSocketServer.send(
            GameMessage(
                type: .playerAnswer,
                data: .playerAnswer(
                    .init(
                        playerId: playerId,
                        answer: answer,
                        responseTime: timeRemaining
                    )),
                senderId: playerId
            ))
    }

    func disconnect() {
        // Stop WebSocket server
        webSocketServer.stop()

        // Stop casting service
        castingService.stopCasting()

        // Clean up timers
        challengeTimer?.invalidate()
        challengeTimer = nil

        // Reset state
        currentSession = nil
        currentChallenge = nil
        gameState = .idle
        playerAnswers.removeAll()
        timeRemaining = 0

        // Cancel any ongoing operations
        cancellables.removeAll()
    }

    // MARK: - Private Methods
    private func generateChallengeQueue(for session: GameSession) async throws -> [Challenge] {
        let challengeTypes = session.settings.challengeTypes
        var challenges: [Challenge] = []

        // Try to load from Supabase first
        if supabase.isConnected {
            for type in challengeTypes {
                let typeChallenges = try await supabase.getChallenges(type: type)
                challenges.append(contentsOf: typeChallenges)
            }
        }

        // Fallback to default challenges if needed
        if challenges.isEmpty {
            challenges = createDefaultChallenges(types: challengeTypes)
        }

        // Shuffle and limit to max rounds
        challenges.shuffle()
        return Array(challenges.prefix(session.maxRounds))
    }

    private func createDefaultChallenges(types: [ChallengeType]) -> [Challenge] {
        var challenges: [Challenge] = []

        for type in types {
            switch type {
            case .quiz:
                challenges.append(
                    Challenge(
                        type: .quiz,
                        title: "General Knowledge",
                        content: .quiz(
                            .init(
                                question: "What is the capital of France?",
                                options: ["London", "Berlin", "Paris", "Madrid"],
                                correctAnswer: 2,
                                explanation: "Paris is the capital and largest city of France."
                            ))
                    ))
            case .category:
                challenges.append(
                    Challenge(
                        type: .category,
                        title: "Name Countries",
                        content: .category(
                            .init(
                                categoryName: "Countries in Europe",
                                examples: ["France", "Germany", "Spain"],
                                acceptedAnswers: [
                                    "France", "Germany", "Spain", "Italy", "Netherlands", "Belgium",
                                    "Switzerland", "Austria", "Poland", "Sweden", "Norway",
                                    "Denmark",
                                ]
                            ))
                    ))
            default:
                challenges.append(
                    Challenge(
                        type: type,
                        title: "\(type.displayName) Challenge",
                        content: .text("Default \(type.displayName) challenge")
                    ))
            }
        }

        return challenges
    }

    private func startChallengeTimer() {
        challengeTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) {
            [weak self] _ in
            guard let self = self else { return }

            if self.timeRemaining > 0 {
                self.timeRemaining -= 1
            } else {
                Task {
                    try await self.endChallenge()
                }
            }
        }
    }

    private func calculateRoundResults(challenge: Challenge, answers: [String: String])
        -> [MessageData.PlayerResult]
    {
        var results: [MessageData.PlayerResult] = []

        for (playerId, answer) in answers {
            let isCorrect = checkAnswer(challenge: challenge, answer: answer)
            let points =
                isCorrect ? Int(Double(challenge.points) * challenge.difficulty.pointMultiplier) : 0

            results.append(
                MessageData.PlayerResult(
                    playerId: playerId,
                    answer: answer,
                    isCorrect: isCorrect,
                    pointsEarned: points,
                    responseTime: timeRemaining
                ))
        }

        return results
    }

    private func checkAnswer(challenge: Challenge, answer: String) -> Bool {
        switch challenge.content {
        case .quiz(let quizContent):
            guard let answerIndex = Int(answer),
                answerIndex >= 0 && answerIndex < quizContent.options.count
            else {
                return false
            }
            return answerIndex == quizContent.correctAnswer
        case .category:
            return !answer.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        default:
            return !answer.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        }
    }

    private func updateSessionPlayers(_ connectedPlayers: [ConnectedPlayer]) {
        guard var session = currentSession else { return }

        // Update players based on connected players
        session.players = connectedPlayers.map { connectedPlayer in
            Player(id: connectedPlayer.id.uuidString, name: connectedPlayer.name, isHost: false)
        }

        currentSession = session
    }

    private func updateUserStats(session: GameSession, winner: Player?) {
        guard let currentUserId = AuthenticationManager.shared.currentUser?.id else { return }

        // Update stats for current user
        let _ = winner?.id == currentUserId

        // TODO: Update user stats in AuthenticationManager and sync with backend
    }
}

enum GameEngineError: Error, LocalizedError {
    case notAuthenticated
    case insufficientPlayers
    case gameNotFound
    case noChallengesAvailable
    case invalidGameState

    var errorDescription: String? {
        switch self {
        case .notAuthenticated:
            return "User not authenticated"
        case .insufficientPlayers:
            return "Need at least 2 players to start"
        case .gameNotFound:
            return "Game not found"
        case .noChallengesAvailable:
            return "No challenges available"
        case .invalidGameState:
            return "Invalid game state"
        }
    }
}
