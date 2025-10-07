import CoreImage
import CoreImage.CIFilterBuiltins
import SwiftUI

#if canImport(UIKit)
    import UIKit
#endif

// MARK: - Enhanced PlayerCard with Modern Design

struct ModernPlayerCard: View {
    let player: Player
    @State private var isAnimating = false

    var body: some View {
        HStack(spacing: 16) {
            // Enhanced player avatar
            ZStack {
                Circle()
                    .fill(
                        RadialGradient(
                            colors: [
                                player.color.swiftUIColor.opacity(0.3), player.color.swiftUIColor,
                            ],
                            center: .topLeading,
                            startRadius: 0,
                            endRadius: 30
                        )
                    )
                    .frame(width: 48, height: 48)
                    .overlay(
                        Circle()
                            .stroke(player.color.swiftUIColor, lineWidth: 2)
                    )

                Text(String(player.name.prefix(1).uppercased()))
                    .font(.system(size: 18, weight: .bold, design: .rounded))
                    .foregroundColor(.white)
            }
            .scaleEffect(isAnimating ? 1.05 : 1.0)
            .animation(
                .easeInOut(duration: 1.5).repeatForever(autoreverses: true), value: isAnimating)

            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(player.name)
                        .font(.system(size: 16, weight: .semibold, design: .rounded))
                        .foregroundColor(.primary)
                        .lineLimit(1)

                    if player.isHost {
                        Image(systemName: "crown.fill")
                            .foregroundColor(.yellow)
                            .font(.system(size: 12))
                            .shadow(color: .yellow.opacity(0.3), radius: 2)
                    }
                }

                Text("\(player.score) points")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.secondary)
            }

            Spacer()

            // Score indicator
            VStack {
                Text("\(player.score)")
                    .font(.system(size: 20, weight: .bold, design: .rounded))
                    .foregroundColor(player.color.swiftUIColor)

                Text("PTS")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(.secondary)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(.ultraThinMaterial)
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(player.color.swiftUIColor.opacity(0.3), lineWidth: 1)
                )
        )
        .onAppear {
            isAnimating = true
        }
    }
}

struct QRCodeDisplayView: View {
    let gameCode: String
    let ipAddress: String

    var body: some View {
        VStack(spacing: 16) {
            Text("Join Game")
                .font(.title2)
                .fontWeight(.bold)

            // QR Code
            #if canImport(UIKit)
                Image(uiImage: generateQRCode())
                    .interpolation(.none)
                    .resizable()
                    .frame(width: 200, height: 200)
            #else
                Rectangle()
                    .fill(Color.gray.opacity(0.3))
                    .frame(width: 200, height: 200)
                    .overlay(
                        Text("QR Code\nnot available\non macOS")
                            .multilineTextAlignment(.center)
                            .font(.caption)
                            .foregroundColor(.gray)
                    )
            #endif

            VStack(spacing: 8) {
                Text("Game Code:")
                    .font(.caption)
                    .foregroundColor(.secondary)

                Text(gameCode)
                    .font(.title)
                    .fontWeight(.bold)
                    .kerning(2)
                    .padding()
                    .background(Color.gray.opacity(0.1))
                    .cornerRadius(8)
            }
            .padding()
            .background(Color.gray.opacity(0.1))
            .cornerRadius(12)
        }
    }

    #if canImport(UIKit)
        private func generateQRCode() -> UIImage {
            let qrContent = "glass://join/\(ipAddress)/\(gameCode)"

            let context = CIContext()
            let filter = CIFilter.qrCodeGenerator()

            filter.message = Data(qrContent.utf8)

            if let outputImage = filter.outputImage {
                // Scale up the QR code
                let transform = CGAffineTransform(scaleX: 10, y: 10)
                let scaledImage = outputImage.transformed(by: transform)

                if let cgImage = context.createCGImage(scaledImage, from: scaledImage.extent) {
                    return UIImage(cgImage: cgImage)
                }
            }

            // Fallback to placeholder
            return UIImage()
        }
    #endif
}

struct PlayerListView: View {
    let players: [Player]

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Connected Players")
                .font(.headline)
                .fontWeight(.semibold)

            LazyVGrid(
                columns: [
                    GridItem(.adaptive(minimum: 150))
                ], spacing: 12
            ) {
                ForEach(players) { player in
                    PlayerCard(player: player)
                }
            }
        }
    }
}

struct PlayerCard: View {
    let player: Player
    @State private var isAnimating = false

    var body: some View {
        HStack(spacing: 12) {
            // Enhanced Player Color Indicator with glassmorphism
            ZStack {
                Circle()
                    .fill(
                        RadialGradient(
                            colors: [
                                player.color.swiftUIColor.opacity(0.3),
                                player.color.swiftUIColor,
                            ],
                            center: .topLeading,
                            startRadius: 0,
                            endRadius: 20
                        )
                    )
                    .frame(width: 32, height: 32)
                    .overlay(
                        Circle()
                            .stroke(player.color.swiftUIColor, lineWidth: 2)
                    )
                    .shadow(color: player.color.swiftUIColor.opacity(0.4), radius: 4, x: 0, y: 2)

                Text(String(player.name.prefix(1).uppercased()))
                    .font(.system(size: 12, weight: .bold, design: .rounded))
                    .foregroundColor(.white)
            }
            .scaleEffect(isAnimating ? 1.05 : 1.0)
            .animation(
                .easeInOut(duration: 2).repeatForever(autoreverses: true), value: isAnimating)

            VStack(alignment: .leading, spacing: 2) {
                HStack {
                    Text(player.name)
                        .font(.system(size: 16, weight: .semibold, design: .rounded))
                        .foregroundColor(.primary)
                        .lineLimit(1)

                    if player.isHost {
                        Image(systemName: "crown.fill")
                            .foregroundColor(.yellow)
                            .font(.system(size: 12))
                            .shadow(color: .yellow.opacity(0.3), radius: 2)
                    }
                }

                Text("\(player.score) pts")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(player.color.swiftUIColor)
            }

            Spacer()

            if player.isHost {
                Text("HOST")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(.yellow)
                    .cornerRadius(8)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(.ultraThinMaterial)
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(player.color.swiftUIColor.opacity(0.3), lineWidth: 1)
                )
        )
        .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
        .onAppear {
            isAnimating = true
        }
    }
}

struct ChallengeDisplayView: View {
    let challenge: Challenge
    let timeRemaining: TimeInterval
    let isHost: Bool

    var body: some View {
        VStack(spacing: 20) {
            // Timer
            TimerView(timeRemaining: timeRemaining, totalTime: challenge.timeLimit)

            // Challenge Type Badge
            HStack {
                Text(challenge.type.displayName)
                    .font(.caption)
                    .fontWeight(.semibold)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(challenge.type == .quiz ? Color.blue : Color.orange)
                    .foregroundColor(.white)
                    .cornerRadius(12)

                Spacer()

                Text("\(challenge.points) pts")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(.secondary)
            }

            // Challenge Title
            Text(challenge.title)
                .font(.title)
                .fontWeight(.bold)
                .multilineTextAlignment(.center)

            // Challenge Content
            ChallengeContentView(content: challenge.content, isHost: isHost)
        }
        .padding()
        .background(Color.primary.colorInvert())
        .cornerRadius(16)
        .shadow(radius: 2)
    }
}

struct ChallengeContentView: View {
    let content: ChallengeContent
    let isHost: Bool

    var body: some View {
        switch content {
        case .quiz(let quizContent):
            QuizContentView(quiz: quizContent, isHost: isHost)
        case .category(let categoryContent):
            CategoryContentView(category: categoryContent)
        case .text(let text):
            Text(text)
                .font(.body)
                .multilineTextAlignment(.center)
        case .image(let imageName):
            AsyncImage(url: URL(string: imageName)) { image in
                image
                    .resizable()
                    .scaledToFit()
            } placeholder: {
                Rectangle()
                    .fill(Color.gray.opacity(0.3))
                    .frame(height: 200)
            }
            .cornerRadius(12)
        case .coordinates(let latitude, let longitude):
            VStack {
                Text("Guess this location!")
                    .font(.headline)

                Text("Lat: \(latitude, specifier: "%.4f"), Lon: \(longitude, specifier: "%.4f")")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
    }
}

struct QuizContentView: View {
    let quiz: ChallengeContent.QuizContent
    let isHost: Bool

    var body: some View {
        VStack(spacing: 16) {
            Text(quiz.question)
                .font(.headline)
                .multilineTextAlignment(.center)

            if !isHost {
                VStack(spacing: 8) {
                    ForEach(Array(quiz.options.enumerated()), id: \.offset) { index, option in
                        Text("\(index + 1). \(option)")
                            .font(.body)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding()
                            .background(Color.gray.opacity(0.1))
                            .cornerRadius(8)
                    }
                }
            }
        }
    }
}

struct CategoryContentView: View {
    let category: ChallengeContent.CategoryContent

    var body: some View {
        VStack(spacing: 12) {
            Text("Name items in:")
                .font(.subheadline)
                .foregroundColor(.secondary)

            Text(category.categoryName)
                .font(.headline)
                .fontWeight(.semibold)

            if !category.examples.isEmpty {
                Text("Examples: \(category.examples.joined(separator: ", "))")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }
        }
    }
}

struct TimerView: View {
    let timeRemaining: TimeInterval
    let totalTime: TimeInterval

    private var progress: Double {
        guard totalTime > 0 else { return 0 }
        return timeRemaining / totalTime
    }

    var body: some View {
        ZStack {
            // Background circle
            Circle()
                .stroke(Color.gray.opacity(0.3), lineWidth: 6)

            // Progress circle
            Circle()
                .trim(from: 0, to: progress)
                .stroke(
                    progress > 0.3 ? Color.blue : Color.red,
                    style: StrokeStyle(lineWidth: 6, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))
                .animation(.linear, value: progress)

            // Time text
            Text("\(Int(timeRemaining))")
                .font(.title)
                .fontWeight(.bold)
                .foregroundColor(progress > 0.3 ? .primary : .red)
        }
        .frame(width: 80, height: 80)
    }
}

struct PlayerAnswerInput: View {
    let challenge: Challenge
    let onSubmit: (String) -> Void

    @State private var answer = ""
    @State private var selectedOptionIndex: Int?
    @State private var hasSubmitted = false

    var body: some View {
        VStack(spacing: 16) {
            if hasSubmitted {
                VStack(spacing: 8) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 40))
                        .foregroundColor(.green)

                    Text("Answer Submitted!")
                        .font(.headline)
                        .foregroundColor(.green)
                }
            } else {
                switch challenge.content {
                case .quiz(let quizContent):
                    QuizAnswerInput(
                        quiz: quizContent,
                        selectedIndex: $selectedOptionIndex,
                        onSubmit: submitQuizAnswer
                    )
                default:
                    TextAnswerInput(
                        answer: $answer,
                        onSubmit: submitTextAnswer
                    )
                }
            }
        }
        .padding()
        #if os(iOS)
            .background(Color(.systemGray6))
        #else
            .background(Color(.controlBackgroundColor))
        #endif
        .cornerRadius(16)
    }

    private func submitQuizAnswer() {
        guard let index = selectedOptionIndex else { return }
        hasSubmitted = true
        onSubmit(String(index))
    }

    private func submitTextAnswer() {
        guard !answer.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        hasSubmitted = true
        onSubmit(answer)
    }
}

struct QuizAnswerInput: View {
    let quiz: ChallengeContent.QuizContent
    @Binding var selectedIndex: Int?
    let onSubmit: () -> Void

    var body: some View {
        VStack(spacing: 12) {
            Text("Select your answer:")
                .font(.headline)

            ForEach(Array(quiz.options.enumerated()), id: \.offset) { index, option in
                Button(action: { selectedIndex = index }) {
                    HStack {
                        Text("\(index + 1)")
                            .font(.headline)
                            .fontWeight(.bold)
                            .frame(width: 30, height: 30)
                            .background(
                                selectedIndex == index ? Color.blue : Color.gray.opacity(0.3)
                            )
                            .foregroundColor(selectedIndex == index ? .white : .primary)
                            .clipShape(Circle())

                        Text(option)
                            .font(.body)
                            .foregroundColor(.primary)

                        Spacer()
                    }
                    .padding()
                    .background(selectedIndex == index ? Color.blue.opacity(0.1) : Color.clear)
                    .cornerRadius(12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(selectedIndex == index ? Color.blue : Color.clear, lineWidth: 2)
                    )
                }
                .buttonStyle(PlainButtonStyle())
            }

            Button("Submit Answer") {
                onSubmit()
            }
            .buttonStyle(.borderedProminent)
            .disabled(selectedIndex == nil)
        }
    }
}

struct TextAnswerInput: View {
    @Binding var answer: String
    let onSubmit: () -> Void

    var body: some View {
        VStack(spacing: 16) {
            TextField("Type your answer...", text: $answer)
                .textFieldStyle(RoundedBorderTextFieldStyle())
                .onSubmit {
                    onSubmit()
                }

            Button("Submit Answer") {
                onSubmit()
            }
            .buttonStyle(.borderedProminent)
            .disabled(answer.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
        }
        .dismissKeyboardOnTap()
    }
}

struct ScoreboardView: View {
    let session: GameSession

    var body: some View {
        VStack(spacing: 16) {
            let leaderboard = session.getLeaderboard()

            ForEach(Array(leaderboard.enumerated()), id: \.offset) { index, entry in
                HStack {
                    // Rank
                    Text("\(index + 1)")
                        .font(.headline)
                        .fontWeight(.bold)
                        .frame(width: 30)

                    // Player color
                    Circle()
                        .fill(entry.0.color.swiftUIColor)
                        .frame(width: 24, height: 24)

                    // Player name
                    Text(entry.0.name)
                        .font(.headline)

                    Spacer()

                    // Score
                    Text("\(entry.1)")
                        .font(.headline)
                        .fontWeight(.semibold)
                        .foregroundColor(index == 0 ? .yellow : .primary)
                }
                .padding()
                #if os(iOS)
                    .background(index == 0 ? Color.yellow.opacity(0.1) : Color(.systemGray6))
                #else
                    .background(
                        index == 0 ? Color.yellow.opacity(0.1) : Color(.controlBackgroundColor))
                #endif
                .cornerRadius(12)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(index == 0 ? Color.yellow : Color.clear, lineWidth: 2)
                )
            }
        }
    }
}

struct PlayerAnswersView: View {
    let answers: [String: String]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Player Answers")
                .font(.headline)
                .fontWeight(.semibold)

            ForEach(Array(answers.keys), id: \.self) { playerId in
                HStack {
                    Text("Player")
                        .font(.subheadline)
                        .foregroundColor(.secondary)

                    Spacer()

                    Text(answers[playerId] ?? "")
                        .font(.subheadline)
                        .fontWeight(.medium)
                }
                .padding(.horizontal)
                .padding(.vertical, 8)
                .background(Color.gray.opacity(0.1))
                .cornerRadius(8)
            }
        }
    }
}

// Preview removed for Swift Package Manager compatibility
