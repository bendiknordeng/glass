import SwiftUI

struct GameView: View {
    @EnvironmentObject var gameEngine: GameEngine
    @EnvironmentObject var appState: AppState

    var body: some View {
        Group {
            if appState.isHost {
                HostGameView()
            } else {
                PlayerGameView()
            }
        }
        #if !os(macOS)
            .toolbar(.hidden, for: .navigationBar)
        #endif
    }
}

struct HostGameView: View {
    @EnvironmentObject var gameEngine: GameEngine
    @EnvironmentObject var appState: AppState

    var body: some View {
        ZStack {
            // Background
            LinearGradient(
                colors: [.blue.opacity(0.1), .purple.opacity(0.2)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack(spacing: 0) {
                // Top status bar
                topStatusBar

                // Main content based on game state
                mainContent

                // Bottom controls
                if gameEngine.gameState == .hosting {
                    hostControls
                }
            }
        }
    }

    private var topStatusBar: some View {
        HStack {
            // Game Code
            if let session = gameEngine.currentSession {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Game Code")
                        .font(.caption)
                        .foregroundColor(.secondary)

                    Text(session.gameCode)
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.primary)
                }
            }

            Spacer()

            // Player Count
            HStack(spacing: 8) {
                Image(systemName: "person.2.fill")
                    .foregroundColor(.blue)

                Text("\(gameEngine.currentSession?.players.count ?? 0)")
                    .font(.headline)
                    .fontWeight(.semibold)
            }

            // Exit Button
            Button("End Game") {
                Task {
                    try? await gameEngine.endGame()
                    appState.clearSession()
                }
            }
            .buttonStyle(.bordered)
            .foregroundColor(.red)
        }
        .padding()
        .background(Color.primary.colorInvert())
        .shadow(radius: 1)
    }

    @ViewBuilder
    private var mainContent: some View {
        switch gameEngine.gameState {
        case .hosting:
            hostLobbyView
        case .playing:
            hostGameplayView
        case .scoreboard:
            scoreboardView
        case .finished:
            gameFinishedView
        default:
            EmptyView()
        }
    }

    private var hostLobbyView: some View {
        VStack(spacing: 30) {
            // QR Code
            QRCodeDisplayView(
                gameCode: gameEngine.currentSession?.gameCode ?? "",
                ipAddress: appState.networkInfo?.ipAddress ?? "Unknown"
            )

            // Connected Players
            if let players = gameEngine.currentSession?.players, !players.isEmpty {
                PlayerListView(players: players)
            } else {
                VStack(spacing: 16) {
                    Image(systemName: "person.badge.plus")
                        .font(.system(size: 50))
                        .foregroundColor(.secondary)

                    Text("Waiting for players to join...")
                        .font(.title2)
                        .foregroundColor(.secondary)

                    Text("Players can scan the QR code or enter the game code")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                }
            }

            Spacer()
        }
        .padding()
    }

    private var hostGameplayView: some View {
        VStack(spacing: 20) {
            // Challenge Info
            if let challenge = gameEngine.currentChallenge {
                ChallengeDisplayView(
                    challenge: challenge,
                    timeRemaining: gameEngine.timeRemaining,
                    isHost: true
                )
            }

            // Player Answers (for host to see)
            if !gameEngine.playerAnswers.isEmpty {
                PlayerAnswersView(answers: gameEngine.playerAnswers)
            }

            Spacer()
        }
        .padding()
    }

    private var scoreboardView: some View {
        VStack(spacing: 20) {
            Text("Round Results")
                .font(.largeTitle)
                .fontWeight(.bold)

            if let session = gameEngine.currentSession {
                ScoreboardView(session: session)
            }

            Spacer()
        }
        .padding()
    }

    private var gameFinishedView: some View {
        VStack(spacing: 30) {
            Text("Game Finished!")
                .font(.largeTitle)
                .fontWeight(.bold)

            if let session = gameEngine.currentSession {
                let leaderboard = session.getLeaderboard()
                if let winner = leaderboard.first {
                    VStack(spacing: 16) {
                        Image(systemName: "crown.fill")
                            .font(.system(size: 60))
                            .foregroundColor(.yellow)

                        Text("\(winner.0.name) Wins!")
                            .font(.title)
                            .fontWeight(.bold)

                        Text("\(winner.1) points")
                            .font(.title2)
                            .foregroundColor(.secondary)
                    }
                }

                ScoreboardView(session: session)
            }

            Button("New Game") {
                appState.clearSession()
            }
            .buttonStyle(.borderedProminent)

            Spacer()
        }
        .padding()
    }

    private var hostControls: some View {
        HStack(spacing: 20) {
            Button("Start Game") {
                Task {
                    try? await gameEngine.startGame()
                }
            }
            .buttonStyle(.borderedProminent)
            .disabled((gameEngine.currentSession?.players.count ?? 0) < 2)

            Button("Add Challenge") {
                // TODO: Implement custom challenge creation
            }
            .buttonStyle(.bordered)
        }
        .padding()
        .background(Color.primary.colorInvert())
    }
}

struct PlayerGameView: View {
    @EnvironmentObject var gameEngine: GameEngine
    @EnvironmentObject var appState: AppState

    var body: some View {
        ZStack {
            // Background
            LinearGradient(
                colors: [.green.opacity(0.1), .blue.opacity(0.2)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack(spacing: 20) {
                // Player status
                playerStatusBar

                // Main content
                playerMainContent

                Spacer()
            }
            .padding()
        }
    }

    private var playerStatusBar: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("Connected to")
                    .font(.caption)
                    .foregroundColor(.secondary)

                Text(gameEngine.currentSession?.gameCode ?? "Unknown")
                    .font(.headline)
                    .fontWeight(.bold)
            }

            Spacer()

            Button("Leave Game") {
                gameEngine.disconnect()
                appState.clearSession()
            }
            .buttonStyle(.bordered)
            .foregroundColor(.red)
        }
        .padding()
        .background(Color.primary.colorInvert())
        .cornerRadius(12)
    }

    @ViewBuilder
    private var playerMainContent: some View {
        switch gameEngine.gameState {
        case .waiting:
            playerWaitingView
        case .playing:
            playerGameplayView
        case .scoreboard:
            playerScoreboardView
        case .finished:
            playerGameFinishedView
        default:
            EmptyView()
        }
    }

    private var playerWaitingView: some View {
        VStack(spacing: 20) {
            Image(systemName: "hourglass")
                .font(.system(size: 60))
                .foregroundColor(.blue)

            Text("Waiting for game to start...")
                .font(.title2)
                .fontWeight(.semibold)

            Text("The host will start the game when ready")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
    }

    private var playerGameplayView: some View {
        VStack(spacing: 20) {
            if let challenge = gameEngine.currentChallenge {
                ChallengeDisplayView(
                    challenge: challenge,
                    timeRemaining: gameEngine.timeRemaining,
                    isHost: false
                )

                PlayerAnswerInput(
                    challenge: challenge,
                    onSubmit: { answer in
                        gameEngine.submitAnswer(answer)
                    }
                )
            }
        }
    }

    private var playerScoreboardView: some View {
        VStack(spacing: 20) {
            Text("Round Results")
                .font(.title)
                .fontWeight(.bold)

            Text("Next round starting soon...")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
    }

    private var playerGameFinishedView: some View {
        VStack(spacing: 20) {
            Text("Game Finished!")
                .font(.title)
                .fontWeight(.bold)

            Text("Thanks for playing!")
                .font(.subheadline)
                .foregroundColor(.secondary)

            Button("Back to Menu") {
                appState.clearSession()
            }
            .buttonStyle(.borderedProminent)
        }
    }
}

// Preview removed for Swift Package Manager compatibility
