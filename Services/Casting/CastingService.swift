// import GoogleCast // Commented out for initial testing
import AVKit
import Combine
import Foundation
import SwiftUI

#if canImport(UIKit)
    import UIKit

    class CastingService: NSObject, ObservableObject {
        @Published var isConnected = false
        @Published var castingDevice: CastDevice?
        @Published var isCasting = false

        private var cancellables = Set<AnyCancellable>()

        override init() {
            super.init()
            // setupChromecast() // Disabled for initial testing
            setupAirPlay()
        }

        // MARK: - Chromecast Setup (Disabled for testing)
        private func setupChromecast() {
            /*
            guard let appId = ProcessInfo.processInfo.environment["CHROMECAST_APP_ID"],
                  !appId.isEmpty else {
                print("Chromecast App ID not configured")
                return
            }
            
            let criteria = GCKDiscoveryCriteria(applicationID: appId)
            let options = GCKCastOptions(discoveryCriteria: criteria)
            
            GCKCastContext.setSharedInstanceWith(options)
            GCKCastContext.sharedInstance().presentCastInstructionsViewControllerOnce = true
            
            // Set up session manager
            GCKCastContext.sharedInstance().sessionManager.add(self)
            */
        }

        // MARK: - AirPlay Setup
        private func setupAirPlay() {
            // AirPlay setup is handled automatically by AVKit
            // We just need to configure the display preferences
        }

        // MARK: - Public Methods
        func startCasting() {
            // For AirPlay, the system handles most of the setup
            // Chromecast functionality disabled for testing
            isCasting = true
            print("📺 Casting started (AirPlay mode)")
        }

        func stopCasting() {
            // GCKCastContext.sharedInstance().sessionManager.endSession()
            isCasting = false
            print("📺 Casting stopped")
        }

        func sendGameData(_ data: [String: Any]) {
            guard isCasting else { return }

            // Placeholder for testing
            print("📺 Sending game data: \(data)")

            /*
            if let session = GCKCastContext.sharedInstance().sessionManager.currentCastSession {
                sendChromecastData(data, to: session)
            }
            */

            // For AirPlay, we would use a different mechanism
            // This might involve setting up a local web server that serves the game UI
        }

        // MARK: - Chromecast Methods (Disabled for testing)
        /*
        private func startChromecastSession(_ session: GCKCastSession) {
            guard let remoteMediaClient = session.remoteMediaClient else { return }
        
            // Set up media info for the game display
            let metadata = GCKMediaMetadata(metadataType: .generic)
            metadata.setString("Glass Party Game", forKey: kGCKMetadataKeyTitle)
        
            let mediaInfo = GCKMediaInformation(
                contentID: "glass://game-display",
                streamType: .none,
                contentType: "application/x-glass-game",
                metadata: metadata,
                streamDuration: 0,
                customData: nil
            )
        
            remoteMediaClient.loadMedia(mediaInfo)
        
            isConnected = true
            castingDevice = CastDevice(name: session.device.friendlyName, type: .chromecast)
        }
        
        private func sendChromecastData(_ data: [String: Any], to session: GCKCastSession) {
            guard let jsonData = try? JSONSerialization.data(withJSONObject: data),
                  let jsonString = String(data: jsonData, encoding: .utf8) else { return }
        
            session.sendMessage(jsonString, to: "urn:x-cast:com.glass.game")
        }
        */

        // MARK: - AirPlay Methods
        func setupAirPlayView() -> AirPlayView {
            return AirPlayView()
        }

        // MARK: - Display Content Management
        func displayGameState(_ gameState: GameDisplayState) {
            let displayData: [String: Any] = [
                "type": "gameState",
                "data": [
                    "players": gameState.players.map { player in
                        [
                            "id": player.id,
                            "name": player.name,
                            "score": player.score,
                            "color": player.color.rawValue,
                        ]
                    },
                    "currentChallenge": gameState.currentChallenge.map { challenge in
                        [
                            "id": challenge.id,
                            "title": challenge.title,
                            "type": challenge.type.rawValue,
                            "timeLimit": challenge.timeLimit,
                        ]
                    } as Any,
                    "timeRemaining": gameState.timeRemaining,
                    "round": gameState.currentRound,
                ],
            ]

            sendGameData(displayData)
        }

        func displayResults(_ results: GameResults) {
            let displayData: [String: Any] = [
                "type": "results",
                "data": [
                    "results": results.playerResults.map { result in
                        [
                            "playerId": result.playerId,
                            "answer": result.answer,
                            "isCorrect": result.isCorrect,
                            "pointsEarned": result.pointsEarned,
                            "responseTime": result.responseTime,
                        ]
                    },
                    "leaderboard": results.leaderboard.map { entry in
                        [
                            "playerId": entry.playerId,
                            "score": entry.score,
                            "rank": entry.rank,
                        ]
                    },
                ],
            ]

            sendGameData(displayData)
        }
    }

    // MARK: - GCKSessionManagerListener (Disabled for testing)
    /*
    extension CastingService: GCKSessionManagerListener {
        func sessionManager(_ sessionManager: GCKSessionManager, didStart session: GCKSession) {
            print("Chromecast session started")
            if let castSession = session as? GCKCastSession {
                startChromecastSession(castSession)
            }
        }
    
        func sessionManager(_ sessionManager: GCKSessionManager, didEnd session: GCKSession, withError error: Error?) {
            print("Chromecast session ended")
            isConnected = false
            castingDevice = nil
            isCasting = false
        }
    
        func sessionManager(_ sessionManager: GCKSessionManager, didFailToStart session: GCKSession, withError error: Error) {
            print("Failed to start Chromecast session: \(error)")
        }
    }
    */
    struct CastDevice {
        let name: String
        let type: CastDeviceType

        enum CastDeviceType {
            case chromecast
            case airplay
        }
    }

    struct GameDisplayState {
        let players: [Player]
        let currentChallenge: Challenge?
        let timeRemaining: TimeInterval
        let currentRound: Int
    }

    struct GameResults {
        let playerResults: [PlayerResult]
        let leaderboard: [LeaderboardEntry]

        struct PlayerResult {
            let playerId: String
            let answer: String
            let isCorrect: Bool
            let pointsEarned: Int
            let responseTime: TimeInterval
        }

        struct LeaderboardEntry {
            let playerId: String
            let score: Int
            let rank: Int
        }
    }

    // MARK: - AirPlay View
    import SwiftUI

    struct AirPlayView: UIViewControllerRepresentable {
        func makeUIViewController(context: Context) -> UIViewController {
            let viewController = UIViewController()

            // Create AirPlay button
            let airPlayButton = AVRoutePickerView()
            airPlayButton.backgroundColor = UIColor.clear
            airPlayButton.activeTintColor = UIColor.systemBlue
            airPlayButton.tintColor = UIColor.systemGray

            viewController.view.addSubview(airPlayButton)
            airPlayButton.translatesAutoresizingMaskIntoConstraints = false
            NSLayoutConstraint.activate([
                airPlayButton.centerXAnchor.constraint(equalTo: viewController.view.centerXAnchor),
                airPlayButton.centerYAnchor.constraint(equalTo: viewController.view.centerYAnchor),
                airPlayButton.widthAnchor.constraint(equalToConstant: 44),
                airPlayButton.heightAnchor.constraint(equalToConstant: 44),
            ])

            return viewController
        }

        func updateUIViewController(_ uiViewController: UIViewController, context: Context) {
            // Update if needed
        }
    }
#else
    // macOS fallback - no casting service
    class CastingService: NSObject, ObservableObject {
        @Published var isConnected = false
        @Published var castingDevice: CastDevice?
        @Published var isCasting = false

        override init() {
            super.init()
            print("Casting not available on macOS")
        }

        func startCasting() {
            print("Casting not available on macOS")
        }

        func stopCasting() {
            print("Casting not available on macOS")
        }

        func castGameSession(_ session: GameSession) {
            print("Casting not available on macOS")
        }
    }

    struct CastDevice {
        let name: String
        let id: String
    }

    struct AirPlayButton: View {
        var body: some View {
            Text("AirPlay not available on macOS")
                .foregroundColor(.gray)
                .font(.caption)
        }
    }
#endif
