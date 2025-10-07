import Foundation
import SwiftUI

struct Player: Codable, Identifiable {
    let id: String
    var name: String
    var color: PlayerColor
    var score: Int = 0
    var isReady: Bool = false
    var isHost: Bool = false
    var connectionId: String?
    var joinedAt: Date

    init(
        id: String = UUID().uuidString, name: String, color: PlayerColor = .blue,
        isHost: Bool = false
    ) {
        self.id = id
        self.name = name
        self.color = color
        self.isHost = isHost
        self.joinedAt = Date()
    }
}

enum PlayerColor: String, Codable, CaseIterable {
    case red = "red"
    case blue = "blue"
    case green = "green"
    case yellow = "yellow"
    case purple = "purple"
    case orange = "orange"
    case pink = "pink"
    case teal = "teal"

    var swiftUIColor: Color {
        switch self {
        case .red: return .red
        case .blue: return .blue
        case .green: return .green
        case .yellow: return .yellow
        case .purple: return .purple
        case .orange: return .orange
        case .pink: return .pink
        case .teal: return .teal
        }
    }

    static func availableColors(excluding usedColors: [PlayerColor]) -> [PlayerColor] {
        PlayerColor.allCases.filter { !usedColors.contains($0) }
    }
}
