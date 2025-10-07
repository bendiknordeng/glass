import Combine
import Foundation

class AuthenticationManager: ObservableObject {
    @Published var isAuthenticated = false
    @Published var currentUser: User?
    @Published var isLoading = false
    @Published var errorMessage: String?

    static let shared = AuthenticationManager()

    private var cancellables = Set<AnyCancellable>()

    init() {
        checkAuthenticationStatus()
    }

    // MARK: - Authentication Methods
    func signInWithEmail(email: String, password: String) {
        isLoading = true
        errorMessage = nil

        // TODO: Implement Supabase email authentication
        // Placeholder implementation
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
            if email.contains("@") {
                self.handleSuccessfulLogin(user: User(username: "Email User", email: email))
            } else {
                self.handleAuthenticationError("Invalid email format")
            }
        }
    }

    func signUp(username: String, email: String, password: String) {
        isLoading = true
        errorMessage = nil

        // TODO: Implement user registration
        // Placeholder implementation
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
            let newUser = User(username: username, email: email)
            self.handleSuccessfulLogin(user: newUser)
        }
    }

    func signInAsGuest(username: String) {
        isLoading = true

        let guestUser = User(username: username)
        handleSuccessfulLogin(user: guestUser)
    }

    func signOut() {
        currentUser = nil
        isAuthenticated = false

        // Clear any stored credentials
        UserDefaults.standard.removeObject(forKey: "currentUser")
    }

    // MARK: - Private Methods
    private func checkAuthenticationStatus() {
        // Check if user is already logged in
        if let userData = UserDefaults.standard.data(forKey: "currentUser"),
            let user = try? JSONDecoder().decode(User.self, from: userData)
        {
            currentUser = user
            isAuthenticated = true
        }
    }

    private func handleSuccessfulLogin(user: User) {
        self.currentUser = user
        self.isAuthenticated = true
        self.isLoading = false
        self.errorMessage = nil

        // Store user data
        if let userData = try? JSONEncoder().encode(user) {
            UserDefaults.standard.set(userData, forKey: "currentUser")
        }

        // Sync with Supabase if available
        SupabaseService.shared.syncUser(user)
    }

    private func handleAuthenticationError(_ message: String) {
        self.errorMessage = message
        self.isLoading = false
    }
}
