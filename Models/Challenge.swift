import Foundation

struct Challenge: Codable, Identifiable {
    let id: String
    var type: ChallengeType
    var title: String
    var description: String?
    var timeLimit: TimeInterval
    var points: Int
    var difficulty: Difficulty
    var content: ChallengeContent
    var tags: [String]

    init(
        id: String = UUID().uuidString,
        type: ChallengeType,
        title: String,
        description: String? = nil,
        timeLimit: TimeInterval = 30,
        points: Int = 10,
        difficulty: Difficulty = .medium,
        content: ChallengeContent,
        tags: [String] = []
    ) {
        self.id = id
        self.type = type
        self.title = title
        self.description = description
        self.timeLimit = timeLimit
        self.points = points
        self.difficulty = difficulty
        self.content = content
        self.tags = tags
    }
}

enum ChallengeType: String, Codable, CaseIterable {
    case quiz = "quiz"
    case drinking = "drinking"
    case category = "category"
    case geoguessing = "geoguessing"
    case creative = "creative"
    case truth = "truth"
    case dare = "dare"
    case reaction = "reaction"

    var displayName: String {
        switch self {
        case .quiz: return "Quiz"
        case .drinking: return "Drinking Game"
        case .category: return "Category"
        case .geoguessing: return "Geography"
        case .creative: return "Creative"
        case .truth: return "Truth"
        case .dare: return "Dare"
        case .reaction: return "Reaction Time"
        }
    }
}

enum Difficulty: String, Codable, CaseIterable {
    case easy = "easy"
    case medium = "medium"
    case hard = "hard"

    var pointMultiplier: Double {
        switch self {
        case .easy: return 1.0
        case .medium: return 1.5
        case .hard: return 2.0
        }
    }
}

enum ChallengeContent: Codable {
    case quiz(QuizContent)
    case category(CategoryContent)
    case text(String)
    case image(String)  // URL or asset name
    case coordinates(latitude: Double, longitude: Double)

    struct QuizContent: Codable {
        let question: String
        let options: [String]
        let correctAnswer: Int
        let explanation: String?
    }

    struct CategoryContent: Codable {
        let categoryName: String
        let examples: [String]
        let acceptedAnswers: [String]?
    }
}
