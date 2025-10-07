import Foundation
import Supabase

// Supabase service for authentication and database operations
class SupabaseService {
    static let shared = SupabaseService()

    private var client: SupabaseClient?
    var isConnected: Bool {
        client != nil
    }

    private init() {
        // Auto-configure with Glass project credentials
        configure(url: SupabaseConfig.url, anonKey: SupabaseConfig.anonKey)
    }

    func configure(url: String, anonKey: String) {
        client = SupabaseClient(
            supabaseURL: URL(string: url)!,
            supabaseKey: anonKey
        )
        print("✅ Supabase configured successfully")
    }

    // MARK: - Authentication Methods

    func signUp(email: String, password: String, username: String) async throws -> User {
        guard let client = client else {
            throw SupabaseError.clientNotConfigured
        }

        let authResponse = try await client.auth.signUp(
            email: email,
            password: password,
            data: ["username": .string(username)]
        )

        let authUser = authResponse.user

        // Wait a moment for the auth session to be fully established
        try await Task.sleep(nanoseconds: 1_000_000_000) // 1 second

        // Create user profile in our database with retry logic
        let user = User(id: authUser.id.uuidString, username: username, email: email)
        
        // Try creating the profile with retries
        var retryCount = 0
        let maxRetries = 3
        
        while retryCount < maxRetries {
            do {
                try await createUserProfile(user)
                break // Success, exit retry loop
            } catch {
                retryCount += 1
                if retryCount >= maxRetries {
                    // If we can't create the profile, that's OK for now
                    // The user can still use the app and we'll create it later
                    print("⚠️ Failed to create user profile after \(maxRetries) attempts: \(error)")
                    break
                } else {
                    // Wait a bit before retrying
                    try await Task.sleep(nanoseconds: 500_000_000) // 0.5 seconds
                }
            }
        }

        return user
    }

    func signIn(email: String, password: String) async throws -> User {
        guard let client = client else {
            throw SupabaseError.clientNotConfigured
        }

        let authResponse = try await client.auth.signIn(
            email: email,
            password: password
        )

        let authUser = authResponse.user

        // Fetch user profile from our database
        let user = try await getUserProfile(id: authUser.id.uuidString)
        return user
    }

    func signOut() async throws {
        guard let client = client else {
            throw SupabaseError.clientNotConfigured
        }

        try await client.auth.signOut()
    }

    func getCurrentUser() async throws -> User? {
        guard let client = client else {
            throw SupabaseError.clientNotConfigured
        }

        guard let authUser = client.auth.currentUser else {
            return nil
        }

        return try await getUserProfile(id: authUser.id.uuidString)
    }

    // MARK: - User Profile Management

    private func createUserProfile(_ user: User) async throws {
        guard let client = client else {
            throw SupabaseError.clientNotConfigured
        }

        print("🔄 Creating user profile for: \(user.username)")
        
        try await client
            .from("users")
            .insert(user)
            .execute()
        
        print("✅ User profile created successfully for: \(user.username)")
    }

    private func getUserProfile(id: String) async throws -> User {
        guard let client = client else {
            throw SupabaseError.clientNotConfigured
        }

        let response: [User] =
            try await client
            .from("users")
            .select()
            .eq("id", value: id)
            .execute()
            .value

        guard let user = response.first else {
            throw SupabaseError.userNotFound
        }

        return user
    }

    func syncUser(_ user: User) async {
        do {
            guard let client = client else { return }

            try await client
                .from("users")
                .upsert(user)
                .execute()

            print("✅ User synced successfully: \(user.username)")
        } catch {
            print("❌ Failed to sync user: \(error)")
        }
    }

    // MARK: - Game Session Management

    func createGameSession(_ session: GameSession) async throws {
        guard let client = client else {
            throw SupabaseError.clientNotConfigured
        }

        try await client
            .from("game_sessions")
            .insert(session)
            .execute()

        print("✅ Game session created: \(session.id)")
    }

    func updateGameSession(_ session: GameSession) async throws {
        guard let client = client else {
            throw SupabaseError.clientNotConfigured
        }

        try await client
            .from("game_sessions")
            .update(session)
            .eq("id", value: session.id)
            .execute()

        print("✅ Game session updated: \(session.id)")
    }

    func getGameSession(id: String) async throws -> GameSession? {
        guard let client = client else {
            throw SupabaseError.clientNotConfigured
        }

        let response: [GameSession] =
            try await client
            .from("game_sessions")
            .select()
            .eq("id", value: id)
            .execute()
            .value

        return response.first
    }

    func getGameSession(code: String) async throws -> GameSession? {
        guard let client = client else {
            throw SupabaseError.clientNotConfigured
        }

        let response: [GameSession] =
            try await client
            .from("game_sessions")
            .select()
            .eq("code", value: code)
            .execute()
            .value

        return response.first
    }

    // MARK: - Challenge Management

    func getChallenges(difficulty: Difficulty? = nil, type: ChallengeType? = nil) async throws
        -> [Challenge]
    {
        guard let client = client else {
            throw SupabaseError.clientNotConfigured
        }

        var query =
            client
            .from("challenges")
            .select()

        if let difficulty = difficulty {
            query = query.eq("difficulty", value: difficulty.rawValue)
        }

        if let type = type {
            query = query.eq("type", value: type.rawValue)
        }

        let response: [Challenge] = try await query.execute().value
        return response
    }

    func saveChallenge(_ challenge: Challenge) async throws {
        guard let client = client else {
            throw SupabaseError.clientNotConfigured
        }

        try await client
            .from("challenges")
            .upsert(challenge)
            .execute()

        print("✅ Challenge saved: \(challenge.id)")
    }

    // MARK: - Real-time Events

    func listenToGameEvents(sessionId: String) -> AsyncStream<GameEvent> {
        // TODO: Implement real-time event listening with proper Supabase Realtime API
        // For now, return empty stream
        return AsyncStream { continuation in
            print("🔄 Real-time listening not yet implemented for session: \(sessionId)")
            continuation.finish()
        }
    }
}

// MARK: - Error Types

enum SupabaseError: LocalizedError {
    case clientNotConfigured
    case authenticationFailed
    case userNotFound
    case networkError
    case unknownError(String)

    var errorDescription: String? {
        switch self {
        case .clientNotConfigured:
            return "Supabase client is not configured properly"
        case .authenticationFailed:
            return "Authentication failed"
        case .userNotFound:
            return "User not found"
        case .networkError:
            return "Network connection error"
        case .unknownError(let message):
            return "Unknown error: \(message)"
        }
    }
}

// Game Event struct for real-time communication
struct GameEvent: Codable {
    let type: String
    let data: [String: AnyCodable]
    let sessionId: String
    let playerId: String?
    let timestamp: Date

    init(type: String, data: [String: AnyCodable], sessionId: String, playerId: String? = nil) {
        self.type = type
        self.data = data
        self.sessionId = sessionId
        self.playerId = playerId
        self.timestamp = Date()
    }
}

// Helper for encoding/decoding any value
struct AnyCodable: Codable {
    let value: Any

    init(_ value: Any) {
        self.value = value
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()

        if let bool = try? container.decode(Bool.self) {
            value = bool
        } else if let int = try? container.decode(Int.self) {
            value = int
        } else if let double = try? container.decode(Double.self) {
            value = double
        } else if let string = try? container.decode(String.self) {
            value = string
        } else if let array = try? container.decode([AnyCodable].self) {
            value = array.map { $0.value }
        } else if let dictionary = try? container.decode([String: AnyCodable].self) {
            value = dictionary.mapValues { $0.value }
        } else {
            throw DecodingError.dataCorrupted(
                DecodingError.Context(
                    codingPath: decoder.codingPath,
                    debugDescription: "Unsupported type"
                )
            )
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()

        switch value {
        case let bool as Bool:
            try container.encode(bool)
        case let int as Int:
            try container.encode(int)
        case let double as Double:
            try container.encode(double)
        case let string as String:
            try container.encode(string)
        case let array as [Any]:
            try container.encode(array.map { AnyCodable($0) })
        case let dictionary as [String: Any]:
            try container.encode(dictionary.mapValues { AnyCodable($0) })
        default:
            throw EncodingError.invalidValue(
                value,
                EncodingError.Context(
                    codingPath: encoder.codingPath,
                    debugDescription: "Unsupported type"
                )
            )
        }
    }
}
