import SwiftUI

struct JoinGameView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var gameEngine: GameEngine
    @EnvironmentObject var appState: AppState
    @EnvironmentObject var authManager: AuthenticationManager

    @State private var gameCode = ""
    @State private var playerName = ""
    @State private var isJoining = false
    @State private var errorMessage: String?
    @State private var showingQRScanner = false

    var body: some View {
        NavigationView {
            VStack(spacing: 30) {
                // Header
                headerSection

                // Input Form
                inputSection

                // Join Button
                joinButton

                // Or divider
                orDivider

                // QR Scanner Button
                qrScannerButton

                Spacer()
            }
            .padding()
            .navigationTitle("Join Game")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
        .onAppear {
            if let username = authManager.currentUser?.username {
                playerName = username
            }
        }
        .sheet(isPresented: $showingQRScanner) {
            QRScannerView { scannedCode in
                handleScannedCode(scannedCode)
            }
        }
    }

    private var headerSection: some View {
        VStack(spacing: 16) {
            Image(systemName: "qrcode.viewfinder")
                .font(.system(size: 60))
                .foregroundColor(.blue)

            Text("Join a Game")
                .font(.title)
                .fontWeight(.bold)

            Text("Enter the game code or scan the QR code from the host's screen")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
    }

    private var inputSection: some View {
        VStack(spacing: 16) {
            // Player Name Input
            VStack(alignment: .leading, spacing: 8) {
                Text("Your Name")
                    .font(.headline)
                    .foregroundColor(.primary)

                TextField("Enter your name", text: $playerName)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
            }

            // Game Code Input
            VStack(alignment: .leading, spacing: 8) {
                Text("Game Code")
                    .font(.headline)
                    .foregroundColor(.primary)

                TextField(
                    "Enter 4-letter code",
                    text: Binding(
                        get: { gameCode },
                        set: { newValue in
                            gameCode = String(newValue.prefix(4).uppercased())
                        }
                    )
                )
                .textFieldStyle(RoundedBorderTextFieldStyle())
            }
        }
    }

    private var joinButton: some View {
        VStack(spacing: 16) {
            if let errorMessage = errorMessage {
                Text(errorMessage)
                    .foregroundColor(.red)
                    .font(.caption)
                    .multilineTextAlignment(.center)
            }

            Button(action: joinGame) {
                HStack {
                    if isJoining {
                        ProgressView()
                            .scaleEffect(0.8)
                            .tint(.white)
                    } else {
                        Image(systemName: "arrow.right.circle.fill")
                    }

                    Text(isJoining ? "Joining..." : "Join Game")
                }
                .frame(maxWidth: .infinity)
                .frame(height: 50)
                .background(
                    LinearGradient(
                        colors: [.blue, .purple],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .foregroundColor(.white)
                .font(.headline)
                .cornerRadius(12)
            }
            .disabled(gameCode.count != 4 || playerName.isEmpty || isJoining)
        }
    }

    private var orDivider: some View {
        HStack {
            Rectangle()
                .fill(Color.secondary.opacity(0.3))
                .frame(height: 1)

            Text("OR")
                .font(.caption)
                .foregroundColor(.secondary)
                .padding(.horizontal)

            Rectangle()
                .fill(Color.secondary.opacity(0.3))
                .frame(height: 1)
        }
    }

    private var qrScannerButton: some View {
        Button(action: { showingQRScanner = true }) {
            HStack {
                Image(systemName: "qrcode.viewfinder")
                Text("Scan QR Code")
            }
            .frame(maxWidth: .infinity)
            .frame(height: 50)
            #if os(iOS)
                .background(Color(.systemGray6))
            #else
                .background(Color(.controlBackgroundColor))
            #endif
            .foregroundColor(.primary)
            .font(.headline)
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.blue, lineWidth: 2)
            )
        }
        .disabled(playerName.isEmpty)
    }

    private func joinGame() {
        guard !gameCode.isEmpty, !playerName.isEmpty else { return }

        isJoining = true
        errorMessage = nil

        Task {
            do {
                try await gameEngine.joinGame(gameCode: gameCode, playerName: playerName)
                await MainActor.run {
                    appState.setAsPlayer()
                    dismiss()
                }
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                    isJoining = false
                }
            }
        }
    }

    private func handleScannedCode(_ code: String) {
        // Parse QR code - expected format: "glass://join/IP/GAMECODE"
        if let url = URL(string: code),
            url.scheme == "glass",
            url.host == "join",
            url.pathComponents.count >= 3
        {

            let extractedGameCode = url.pathComponents[2]
            gameCode = extractedGameCode.uppercased()

            // Auto-join if we have a valid game code and player name
            if gameCode.count == 4 && !playerName.isEmpty {
                joinGame()
            }
        } else {
            errorMessage = "Invalid QR code. Please scan the code from the host's screen."
        }
    }
}

// MARK: - QR Scanner View (Placeholder)
struct QRScannerView: View {
    let onCodeScanned: (String) -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                Text("QR Scanner")
                    .font(.title)
                    .fontWeight(.bold)

                Text("Position the QR code within the frame")
                    .font(.subheadline)
                    .foregroundColor(.secondary)

                // QR Scanner placeholder
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color.black.opacity(0.1))
                    .frame(width: 250, height: 250)
                    .overlay(
                        VStack {
                            Image(systemName: "viewfinder")
                                .font(.system(size: 60))
                                .foregroundColor(.blue)

                            Text("Camera viewfinder")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    )

                // Mock scan button for testing
                Button("Simulate Scan (TEST)") {
                    // Simulate a scanned QR code for testing
                    onCodeScanned("glass://join/192.168.1.100/ABCD")
                    dismiss()
                }
                .buttonStyle(.bordered)
                .foregroundColor(.blue)

                Spacer()
            }
            .padding()
            .navigationTitle("Scan QR Code")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
    }
}

// #Preview {
//     JoinGameView()
//         .environmentObject(GameEngine())
//         .environmentObject(AppState())
//         .environmentObject(AuthenticationManager())
// }
