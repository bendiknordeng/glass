import Combine
import Foundation

class AuthenticationManager: ObservableObject {
    @Published var isAuthenticated = false
    @Published var currentUser: User?
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var isInitializing = true  // New property for app startup loading

    static let shared = AuthenticationManager()

    private var cancellables = Set<AnyCancellable>()

    init() {
        checkAuthenticationStatus()
    }

    // MARK: - Authentication Methods
    func signInWithEmail(email: String, password: String) {
        isLoading = true
        errorMessage = nil

        Task {
            do {
                let user = try await SupabaseService.shared.signIn(email: email, password: password)
                await MainActor.run {
                    self.handleSuccessfulLogin(user: user)
                }
            } catch {
                await MainActor.run {
                    self.handleAuthenticationError(error.localizedDescription)
                }
            }
        }
    }

    func signUp(username: String, email: String, password: String) {
        isLoading = true
        errorMessage = nil

        print("🔄 Starting signup for: \(username) with email: \(email)")

        Task {
            do {
                let user = try await SupabaseService.shared.signUp(
                    email: email, password: password, username: username)
                await MainActor.run {
                    print("✅ Signup successful for: \(username)")
                    self.handleSuccessfulLogin(user: user)
                }
            } catch {
                await MainActor.run {
                    print("❌ Signup failed for: \(username) - \(error)")
                    self.handleAuthenticationError(error.localizedDescription)
                }
            }
        }
    }

    func signInAsGuest(username: String) {
        isLoading = true

        let guestUser = User(username: username)
        handleSuccessfulLogin(user: guestUser)
    }

    func signOut() {
        Task {
            do {
                try await SupabaseService.shared.signOut()
            } catch {
                print("Error signing out: \(error)")
            }

            await MainActor.run {
                self.currentUser = nil
                self.isAuthenticated = false

                // Clear any stored credentials
                UserDefaults.standard.removeObject(forKey: "currentUser")
            }
        }
    }

    // MARK: - Private Methods
    private func checkAuthenticationStatus() {
        // Start initialization
        isInitializing = true

        // First check local storage for guest users
        if let userData = UserDefaults.standard.data(forKey: "currentUser"),
            let user = try? JSONDecoder().decode(User.self, from: userData)
        {
            currentUser = user
            isAuthenticated = true
        }

        // Then check Supabase for authenticated users
        Task {
            do {
                if let supabaseUser = try await SupabaseService.shared.getCurrentUser() {
                    await MainActor.run {
                        self.currentUser = supabaseUser
                        self.isAuthenticated = true

                        // Update local storage
                        if let userData = try? JSONEncoder().encode(supabaseUser) {
                            UserDefaults.standard.set(userData, forKey: "currentUser")
                        }
                    }
                }
            } catch {
                print("No existing Supabase session found: \(error)")
            }

            // Always finish initialization after checking both local and remote
            // Add a small delay to ensure smooth loading experience
            try? await Task.sleep(nanoseconds: 500_000_000)  // 0.5 seconds

            await MainActor.run {
                self.isInitializing = false
            }
        }
    }

    private func handleSuccessfulLogin(user: User) {
        Task { @MainActor in
            self.currentUser = user
            self.isAuthenticated = true
            self.isLoading = false
            self.errorMessage = nil
        }

        // Store user data
        if let userData = try? JSONEncoder().encode(user) {
            UserDefaults.standard.set(userData, forKey: "currentUser")
        }

        // Sync with Supabase if available (non-blocking)
        Task {
            await SupabaseService.shared.syncUser(user)
        }
    }

    private func handleAuthenticationError(_ message: String) {
        Task { @MainActor in
            self.errorMessage = message
            self.isLoading = false
        }

        // Log detailed error for debugging
        print("🚨 Authentication Error: \(message)")

        // Provide user-friendly error messages
        let userFriendlyMessage: String
        if message.contains("Invalid login credentials") {
            userFriendlyMessage = "Invalid email or password. Please try again."
        } else if message.contains("Email not confirmed") {
            userFriendlyMessage = "Please check your email and confirm your account."
        } else if message.contains("User already registered") {
            userFriendlyMessage = "An account with this email already exists."
        } else if message.contains("Password should be at least") {
            userFriendlyMessage = "Password must be at least 6 characters long."
        } else if message.contains("Unable to validate email address") {
            userFriendlyMessage = "Please enter a valid email address."
        } else if message.contains("Network") || message.contains("connection") {
            userFriendlyMessage = "Network error. Please check your connection and try again."
        } else {
            // Keep the original message if we don't have a user-friendly version
            userFriendlyMessage = message
        }

        Task { @MainActor in
            self.errorMessage = userFriendlyMessage
        }
    }
}
