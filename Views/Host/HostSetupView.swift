import SwiftUI

struct HostSetupView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var gameEngine: GameEngine
    @EnvironmentObject var appState: AppState

    @State private var gameSettings = GameSettings()
    @State private var isStarting = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    // Header
                    headerSection

                    // Game Settings
                    settingsSection

                    // Start Hosting Button
                    startButton
                }
                .padding()
            }
            .navigationTitle("Host Game")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
    }

    private var headerSection: some View {
        VStack(spacing: 16) {
            Image(systemName: "tv.and.hifispeaker.fill")
                .font(.system(size: 60))
                .foregroundColor(.orange)

            Text("Host a Game")
                .font(.title)
                .fontWeight(.bold)

            Text("Configure your party game settings")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
    }

    private var settingsSection: some View {
        VStack(spacing: 20) {
            // Game Mode
            SettingRow(title: "Game Mode", subtitle: gameSettings.gameMode.displayName) {
                GameModePickerView(selectedMode: $gameSettings.gameMode)
            }

            // Max Players
            SettingRow(title: "Max Players", subtitle: "\(gameSettings.maxPlayers) players") {
                PlayerCountPickerView(playerCount: $gameSettings.maxPlayers)
            }

            // Time Limit
            SettingRow(title: "Time per Challenge", subtitle: "\(Int(gameSettings.timeLimit))s") {
                TimeLimitPickerView(timeLimit: $gameSettings.timeLimit)
            }

            // Score to Win
            SettingRow(title: "Score to Win", subtitle: "\(gameSettings.scoreToWin) points") {
                ScoreToWinPickerView(scoreToWin: $gameSettings.scoreToWin)
            }

            // Challenge Types
            SettingRow(
                title: "Challenge Types", subtitle: "\(gameSettings.challengeTypes.count) selected"
            ) {
                ChallengeTypesView(selectedTypes: $gameSettings.challengeTypes)
            }
        }
    }

    private var startButton: some View {
        VStack(spacing: 16) {
            if let errorMessage = errorMessage {
                Text(errorMessage)
                    .foregroundColor(.red)
                    .font(.caption)
                    .multilineTextAlignment(.center)
            }

            Button(action: startHosting) {
                HStack {
                    if isStarting {
                        ProgressView()
                            .scaleEffect(0.8)
                            .tint(.white)
                    } else {
                        Image(systemName: "play.fill")
                    }

                    Text(isStarting ? "Starting..." : "Start Hosting")
                }
                .frame(maxWidth: .infinity)
                .frame(height: 50)
                .background(
                    LinearGradient(
                        colors: [.orange, .red],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .foregroundColor(.white)
                .font(.headline)
                .cornerRadius(12)
            }
            .disabled(isStarting)

            Text("Players will scan a QR code to join your game")
                .font(.caption)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
    }

    private func startHosting() {
        isStarting = true
        errorMessage = nil

        Task {
            do {
                try await gameEngine.startHosting(settings: gameSettings)
                await MainActor.run {
                    appState.setAsHost()
                    dismiss()
                }
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                    isStarting = false
                }
            }
        }
    }
}

// MARK: - Setting Row
struct SettingRow<Content: View>: View {
    let title: String
    let subtitle: String
    @ViewBuilder let content: Content
    @State private var isExpanded = false

    var body: some View {
        VStack(spacing: 0) {
            Button(action: { withAnimation { isExpanded.toggle() } }) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(title)
                            .font(.headline)
                            .foregroundColor(.primary)

                        Text(subtitle)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }

                    Spacer()

                    Image(systemName: "chevron.right")
                        .foregroundColor(.secondary)
                        .rotationEffect(.degrees(isExpanded ? 90 : 0))
                        .animation(.easeInOut, value: isExpanded)
                }
                .padding()
                #if os(iOS)
                    .background(Color(.systemGray6))
                #else
                    .background(Color(.controlBackgroundColor))
                #endif
                .cornerRadius(12)
            }
            .buttonStyle(PlainButtonStyle())

            if isExpanded {
                content
                    .padding()
                    #if os(macOS)
                        .background(Color(NSColor.controlBackgroundColor))
                    #else
                        .background(Color(.secondarySystemBackground))
                    #endif
                    .cornerRadius(12)
                    .padding(.top, 4)
            }
        }
    }
}

// MARK: - Picker Views
struct GameModePickerView: View {
    @Binding var selectedMode: GameSettings.GameMode

    var body: some View {
        VStack(spacing: 8) {
            ForEach(GameSettings.GameMode.allCases, id: \.self) { mode in
                Button(action: { selectedMode = mode }) {
                    HStack {
                        Text(mode.displayName)
                            .foregroundColor(.primary)

                        Spacer()

                        if selectedMode == mode {
                            Image(systemName: "checkmark")
                                .foregroundColor(.blue)
                        }
                    }
                    .padding(.vertical, 8)
                }
            }
        }
    }
}

struct PlayerCountPickerView: View {
    @Binding var playerCount: Int

    var body: some View {
        HStack {
            Button("-") {
                if playerCount > 2 {
                    playerCount -= 1
                }
            }
            .disabled(playerCount <= 2)

            Spacer()

            Text("\(playerCount)")
                .font(.title2)
                .fontWeight(.semibold)

            Spacer()

            Button("+") {
                if playerCount < 16 {
                    playerCount += 1
                }
            }
            .disabled(playerCount >= 16)
        }
        .buttonStyle(BorderedButtonStyle())
    }
}

struct TimeLimitPickerView: View {
    @Binding var timeLimit: TimeInterval

    private let timeLimits: [TimeInterval] = [15, 30, 45, 60, 90, 120]

    var body: some View {
        VStack(spacing: 8) {
            ForEach(timeLimits, id: \.self) { time in
                Button(action: { timeLimit = time }) {
                    HStack {
                        Text("\(Int(time)) seconds")
                            .foregroundColor(.primary)

                        Spacer()

                        if timeLimit == time {
                            Image(systemName: "checkmark")
                                .foregroundColor(.blue)
                        }
                    }
                    .padding(.vertical, 8)
                }
            }
        }
    }
}

struct ScoreToWinPickerView: View {
    @Binding var scoreToWin: Int

    private let scores = [50, 100, 150, 200, 250, 300]

    var body: some View {
        VStack(spacing: 8) {
            ForEach(scores, id: \.self) { score in
                Button(action: { scoreToWin = score }) {
                    HStack {
                        Text("\(score) points")
                            .foregroundColor(.primary)

                        Spacer()

                        if scoreToWin == score {
                            Image(systemName: "checkmark")
                                .foregroundColor(.blue)
                        }
                    }
                    .padding(.vertical, 8)
                }
            }
        }
    }
}

struct ChallengeTypesView: View {
    @Binding var selectedTypes: [ChallengeType]

    var body: some View {
        VStack(spacing: 8) {
            ForEach(ChallengeType.allCases, id: \.self) { type in
                Button(action: { toggleType(type) }) {
                    HStack {
                        Text(type.displayName)
                            .foregroundColor(.primary)

                        Spacer()

                        if selectedTypes.contains(type) {
                            Image(systemName: "checkmark")
                                .foregroundColor(.blue)
                        }
                    }
                    .padding(.vertical, 8)
                }
            }
        }
    }

    private func toggleType(_ type: ChallengeType) {
        if selectedTypes.contains(type) {
            selectedTypes.removeAll { $0 == type }
        } else {
            selectedTypes.append(type)
        }

        // Ensure at least one type is selected
        if selectedTypes.isEmpty {
            selectedTypes.append(.quiz)
        }
    }
}

// #Preview {
//     HostSetupView()
//         .environmentObject(GameEngine())
//         .environmentObject(AppState())
// }
