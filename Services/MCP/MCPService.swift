import Combine
import Foundation

// MARK: - MCP Service Protocol
protocol MCPCompatible {
    var schema: MCPSchema { get }
    func executeCommand(_ command: MCPCommand) async throws -> MCPResponse
}

// JSONValue helper for Codable compatibility
enum JSONValue: Codable {
    case string(String)
    case int(Int)
    case double(Double)
    case bool(Bool)
    case array([JSONValue])
    case object([String: JSONValue])
    case null

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()

        if let string = try? container.decode(String.self) {
            self = .string(string)
        } else if let int = try? container.decode(Int.self) {
            self = .int(int)
        } else if let double = try? container.decode(Double.self) {
            self = .double(double)
        } else if let bool = try? container.decode(Bool.self) {
            self = .bool(bool)
        } else if let array = try? container.decode([JSONValue].self) {
            self = .array(array)
        } else if let object = try? container.decode([String: JSONValue].self) {
            self = .object(object)
        } else {
            self = .null
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()

        switch self {
        case .string(let string): try container.encode(string)
        case .int(let int): try container.encode(int)
        case .double(let double): try container.encode(double)
        case .bool(let bool): try container.encode(bool)
        case .array(let array): try container.encode(array)
        case .object(let object): try container.encode(object)
        case .null: try container.encodeNil()
        }
    }
}

struct MCPCommand: Codable {
    let service: String
    let method: String
    let parameters: [String: JSONValue]
    let id: String

    init(
        service: String, method: String, parameters: [String: JSONValue] = [:],
        id: String = UUID().uuidString
    ) {
        self.service = service
        self.method = method
        self.parameters = parameters
        self.id = id
    }
}

struct MCPResponse: Codable {
    let id: String
    let success: Bool
    let data: [String: JSONValue]?
    let error: String?

    init(id: String, success: Bool, data: [String: JSONValue]? = nil, error: String? = nil) {
        self.id = id
        self.success = success
        self.data = data
        self.error = error
    }
}

// MARK: - MCP Data Structures
struct MCPSchema: Codable {
    let name: String
    let version: String
    let description: String
    let capabilities: [String]
    let methods: [MCPMethod]
}

struct MCPMethod: Codable {
    let name: String
    let parameters: [MCPParameter]
    let description: String
    let returnType: String?
}

struct MCPParameter: Codable {
    let name: String
    let type: String
    let required: Bool
    let description: String?
    let defaultValue: String?

    init(
        name: String, type: String, required: Bool, description: String? = nil,
        defaultValue: String? = nil
    ) {
        self.name = name
        self.type = type
        self.required = required
        self.description = description
        self.defaultValue = defaultValue
    }
}

struct MCPTool: Codable, Identifiable {
    var id: UUID = UUID()
    let name: String
    let description: String
    let capabilities: [String]

    private enum CodingKeys: String, CodingKey {
        case name, description, capabilities
    }
}

enum MCPError: Error, LocalizedError {
    case serviceNotFound(String)
    case methodNotFound(String)
    case invalidParameters(String)
    case executionFailed(String)

    var errorDescription: String? {
        switch self {
        case .serviceNotFound(let service):
            return "Service not found: \(service)"
        case .methodNotFound(let method):
            return "Method not found: \(method)"
        case .invalidParameters(let message):
            return "Invalid parameters: \(message)"
        case .executionFailed(let message):
            return "Execution failed: \(message)"
        }
    }
}

// MARK: - MCP Service Manager
class MCPService: ObservableObject {
    static let shared = MCPService()

    @Published var isConnected = false
    @Published var availableTools: [MCPTool] = []

    private var registeredServices: [String: MCPCompatible] = [:]
    private var cancellables = Set<AnyCancellable>()

    private init() {
        setupDefaultServices()
    }

    private func setupDefaultServices() {
        // Register built-in services
        register(GameGeneratorService(), as: "game-generator")
        register(AnalyticsService(), as: "analytics")
        register(ChallengeService(), as: "challenge-service")
    }

    func register(_ service: MCPCompatible, as name: String) {
        registeredServices[name] = service
        updateAvailableTools()
    }

    func getSchema() -> [String: MCPSchema] {
        registeredServices.mapValues { $0.schema }
    }

    func executeCommand(_ command: MCPCommand) async throws -> MCPResponse {
        guard let service = registeredServices[command.service] else {
            throw MCPError.serviceNotFound(command.service)
        }

        return try await service.executeCommand(command)
    }

    private func updateAvailableTools() {
        availableTools = registeredServices.map { (key, value) in
            MCPTool(
                name: key,
                description: value.schema.description,
                capabilities: value.schema.capabilities
            )
        }
    }
}

// MARK: - Game Generator Service
class GameGeneratorService: MCPCompatible {
    var schema: MCPSchema {
        MCPSchema(
            name: "game-generator",
            version: "1.0.0",
            description: "Generate game challenges and questions using AI",
            capabilities: ["challenge_generation", "content_creation", "difficulty_adjustment"],
            methods: [
                MCPMethod(
                    name: "generateChallenge",
                    parameters: [
                        MCPParameter(
                            name: "type", type: "string", required: true,
                            description: "Type of challenge"),
                        MCPParameter(
                            name: "difficulty", type: "string", required: false,
                            description: "Difficulty level"),
                        MCPParameter(
                            name: "theme", type: "string", required: false,
                            description: "Challenge theme"),
                    ],
                    description: "Generate a new game challenge",
                    returnType: "Challenge"
                )
            ]
        )
    }

    func executeCommand(_ command: MCPCommand) async throws -> MCPResponse {
        switch command.method {
        case "generateChallenge":
            return try await generateChallenge(parameters: command.parameters, id: command.id)
        default:
            throw MCPError.methodNotFound(command.method)
        }
    }

    private func generateChallenge(parameters: [String: JSONValue], id: String) async throws
        -> MCPResponse
    {
        guard case .string(let typeString) = parameters["type"],
            let challengeType = ChallengeType(rawValue: typeString)
        else {
            throw MCPError.invalidParameters("Invalid or missing challenge type")
        }

        let difficulty =
            if case .string(let difficultyString) = parameters["difficulty"] {
                difficultyString
            } else {
                "medium"
            }

        let theme: String? =
            if case .string(let themeString) = parameters["theme"] {
                themeString
            } else {
                nil
            }

        // Simulate AI generation
        let challenge = await simulateAIGeneration(
            type: challengeType, difficulty: difficulty, theme: theme)

        // Convert challenge to response data
        let challengeData: [String: JSONValue] = [
            "id": .string(challenge.id),
            "type": .string(challenge.type.rawValue),
            "title": .string(challenge.title),
            "difficulty": .string(challenge.difficulty.rawValue),
            "points": .int(challenge.points),
            "timeLimit": .int(Int(challenge.timeLimit)),
        ]

        return MCPResponse(id: id, success: true, data: ["challenge": .object(challengeData)])
    }

    private func simulateAIGeneration(type: ChallengeType, difficulty: String, theme: String?) async
        -> Challenge
    {
        // Simulate network delay
        try? await Task.sleep(nanoseconds: 1_000_000_000)

        switch type {
        case .quiz:
            return Challenge(
                type: .quiz,
                title: theme != nil ? "\(theme!) Quiz Challenge" : "General Knowledge Quiz",
                difficulty: Difficulty(rawValue: difficulty) ?? .medium,
                content: .quiz(
                    .init(
                        question: "What is the capital of France?",
                        options: ["London", "Berlin", "Paris", "Madrid"],
                        correctAnswer: 2,
                        explanation: "Paris is the capital and largest city of France."
                    ))
            )
        case .category:
            return Challenge(
                type: .category,
                title: theme != nil ? "Name \(theme!) Items" : "Name Animals",
                difficulty: Difficulty(rawValue: difficulty) ?? .medium,
                content: .category(
                    .init(
                        categoryName: theme ?? "Animals",
                        examples: ["Dog", "Cat", "Elephant"],
                        acceptedAnswers: [
                            "Dog", "Cat", "Elephant", "Lion", "Tiger", "Bear", "Wolf", "Fox",
                            "Rabbit", "Horse",
                        ]
                    ))
            )
        default:
            return Challenge(
                type: type,
                title: "\(type.displayName) Challenge",
                difficulty: Difficulty(rawValue: difficulty) ?? .medium,
                content: .text("Generated \(type.displayName) challenge")
            )
        }
    }
}

// MARK: - Analytics Service
class AnalyticsService: MCPCompatible {
    var schema: MCPSchema {
        MCPSchema(
            name: "analytics",
            version: "1.0.0",
            description: "Track game metrics and player behavior",
            capabilities: ["event_tracking", "metrics_collection", "performance_analysis"],
            methods: [
                MCPMethod(
                    name: "trackEvent",
                    parameters: [
                        MCPParameter(
                            name: "event", type: "string", required: true, description: "Event name"
                        ),
                        MCPParameter(
                            name: "properties", type: "object", required: false,
                            description: "Event properties"),
                    ],
                    description: "Track a game event",
                    returnType: "void"
                ),
                MCPMethod(
                    name: "getMetrics",
                    parameters: [
                        MCPParameter(
                            name: "timeframe", type: "string", required: false,
                            description: "Time range for metrics")
                    ],
                    description: "Get game metrics",
                    returnType: "Metrics"
                ),
            ]
        )
    }

    func executeCommand(_ command: MCPCommand) async throws -> MCPResponse {
        switch command.method {
        case "trackEvent":
            return try await trackEvent(parameters: command.parameters, id: command.id)
        case "getMetrics":
            return try await getMetrics(parameters: command.parameters, id: command.id)
        default:
            throw MCPError.methodNotFound(command.method)
        }
    }

    private func trackEvent(parameters: [String: JSONValue], id: String) async throws -> MCPResponse
    {
        guard case .string(let event) = parameters["event"] else {
            throw MCPError.invalidParameters("Missing event name")
        }

        let properties =
            if case .object(let props) = parameters["properties"] {
                props
            } else {
                [String: JSONValue]()
            }

        // Log the event (in production, send to analytics service)
        print("📊 Analytics Event: \(event) with properties: \(properties)")

        return MCPResponse(id: id, success: true)
    }

    private func getMetrics(parameters: [String: JSONValue], id: String) async throws -> MCPResponse
    {
        let timeframe =
            if case .string(let tf) = parameters["timeframe"] {
                tf
            } else {
                "7d"
            }

        // Simulate metrics data
        let metrics: [String: JSONValue] = [
            "totalGames": .int(150),
            "activeUsers": .int(45),
            "averageGameDuration": .int(1200),
            "popularChallengeTypes": .array([
                .string("quiz"), .string("category"), .string("creative"),
            ]),
            "timeframe": .string(timeframe),
        ]

        return MCPResponse(id: id, success: true, data: ["metrics": .object(metrics)])
    }
}

// MARK: - Challenge Service
class ChallengeService: MCPCompatible {
    var schema: MCPSchema {
        MCPSchema(
            name: "challenge-service",
            version: "1.0.0",
            description: "Manage and customize game challenges",
            capabilities: ["challenge_management", "custom_content", "difficulty_balancing"],
            methods: [
                MCPMethod(
                    name: "createCustomChallenge",
                    parameters: [
                        MCPParameter(
                            name: "title", type: "string", required: true,
                            description: "Challenge title"),
                        MCPParameter(
                            name: "type", type: "string", required: true,
                            description: "Challenge type"),
                        MCPParameter(
                            name: "content", type: "object", required: true,
                            description: "Challenge content"),
                    ],
                    description: "Create a custom challenge",
                    returnType: "Challenge"
                )
            ]
        )
    }

    func executeCommand(_ command: MCPCommand) async throws -> MCPResponse {
        switch command.method {
        case "createCustomChallenge":
            return try await createCustomChallenge(parameters: command.parameters, id: command.id)
        default:
            throw MCPError.methodNotFound(command.method)
        }
    }

    private func createCustomChallenge(parameters: [String: JSONValue], id: String) async throws
        -> MCPResponse
    {
        guard case .string(let title) = parameters["title"],
            case .string(let typeString) = parameters["type"],
            let challengeType = ChallengeType(rawValue: typeString),
            case .object(_) = parameters["content"]
        else {
            throw MCPError.invalidParameters("Missing or invalid required parameters")
        }

        let challenge = Challenge(
            type: challengeType,
            title: title,
            difficulty: .medium,
            content: .text("Custom challenge content")
        )

        let challengeData: [String: JSONValue] = [
            "id": .string(challenge.id),
            "type": .string(challenge.type.rawValue),
            "title": .string(challenge.title),
            "difficulty": .string(challenge.difficulty.rawValue),
            "points": .int(challenge.points),
            "timeLimit": .int(Int(challenge.timeLimit)),
        ]

        return MCPResponse(id: id, success: true, data: ["challenge": .object(challengeData)])
    }
}
