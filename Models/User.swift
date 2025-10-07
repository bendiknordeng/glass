import Foundation

struct User: Codable, Identifiable {
    let id: String
    var username: String
    var email: String?
    var avatar: String?
    var stats: UserStats
    var createdAt: Date
    var lastActive: Date

    init(id: String = UUID().uuidString, username: String, email: String? = nil) {
        self.id = id
        self.username = username
        self.email = email
        self.avatar = nil
        self.stats = UserStats()
        self.createdAt = Date()
        self.lastActive = Date()
    }

    // Custom coding keys for Supabase compatibility
    enum CodingKeys: String, CodingKey {
        case id
        case username
        case email
        case avatar
        case stats
        case createdAt = "created_at"
        case lastActive = "last_active"
    }
}

struct UserStats: Codable {
    var gamesPlayed: Int = 0
    var gamesWon: Int = 0
    var totalScore: Int = 0
    var averageScore: Double {
        gamesPlayed > 0 ? Double(totalScore) / Double(gamesPlayed) : 0
    }
    var winRate: Double {
        gamesPlayed > 0 ? Double(gamesWon) / Double(gamesPlayed) : 0
    }

    // Custom coding keys for Supabase compatibility
    enum CodingKeys: String, CodingKey {
        case gamesPlayed = "games_played"
        case gamesWon = "games_won"
        case totalScore = "total_score"
    }
}
