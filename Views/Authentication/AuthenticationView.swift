import SwiftUI

struct AuthenticationView: View {
    @EnvironmentObject var authManager: AuthenticationManager
    @State private var showingSignUp = false
    @State private var email = ""
    @State private var password = ""
    @State private var username = ""
    @State private var isGuestMode = false

    var body: some View {
        ZStack {
            // Clean, minimal background
            Color.black
                .ignoresSafeArea()

            ScrollView {
                VStack(spacing: 40) {
                    // Clean App Logo and Title
                    VStack(spacing: 16) {
                        // Simple icon
                        Image(systemName: "gamecontroller.fill")
                            .font(.system(size: 80, weight: .light))
                            .foregroundColor(.white)

                        Text("Glass")
                            .font(.system(size: 42, weight: .thin, design: .default))
                            .foregroundColor(.white)
                            .tracking(8)

                        Text("The Ultimate Party Game")
                            .font(.system(size: 16, weight: .light))
                            .foregroundColor(.white.opacity(0.7))
                            .tracking(2)
                    }
                    .padding(.top, 60)

                    // Clean Authentication Form
                    VStack(spacing: 20) {
                        if isGuestMode {
                            guestSignInForm
                        } else if showingSignUp {
                            signUpForm
                        } else {
                            signInForm
                        }

                        // Error message
                        if let errorMessage = authManager.errorMessage {
                            Text(errorMessage)
                                .foregroundColor(.red.opacity(0.8))
                                .font(.system(size: 14, weight: .light))
                                .multilineTextAlignment(.center)
                                .padding(.horizontal)
                        }

                        // Clean Toggle between modes
                        VStack(spacing: 16) {
                            if !isGuestMode {
                                Button(
                                    showingSignUp
                                        ? "Already have an account? Sign In"
                                        : "Don't have an account? Sign Up"
                                ) {
                                    withAnimation(.easeInOut(duration: 0.3)) {
                                        showingSignUp.toggle()
                                    }
                                }
                                .font(.system(size: 15, weight: .medium))
                                .foregroundColor(.white.opacity(0.8))
                                .padding(.vertical, 8)
                            }

                            Button(isGuestMode ? "← Back to Sign In" : "Continue as Guest") {
                                withAnimation(.easeInOut(duration: 0.3)) {
                                    isGuestMode.toggle()
                                    if !isGuestMode {
                                        showingSignUp = false
                                    }
                                }
                            }
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.white.opacity(0.6))
                            .padding(.vertical, 6)
                            .underline()
                        }
                    }
                    .padding(.horizontal, 24)
                    .padding(.bottom, 40)
                }
            }

            if authManager.isLoading {
                LoadingOverlay()
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        #if os(iOS)
            .statusBarHidden(false)
            .ignoresSafeArea(.keyboard)
        #endif
    }

    private var signInForm: some View {
        VStack(spacing: 20) {
            TextField("Email", text: $email)
                .textFieldStyle(CleanTextFieldStyle())

            SecureField("Password", text: $password)
                .textFieldStyle(CleanTextFieldStyle())

            Button("Sign In") {
                authManager.signInWithEmail(email: email, password: password)
            }
            .buttonStyle(CleanButtonStyle())
            .disabled(email.isEmpty || password.isEmpty || authManager.isLoading)
        }
        .padding(.horizontal, 40)
    }

    private var signUpForm: some View {
        VStack(spacing: 20) {
            TextField("Username", text: $username)
                .textFieldStyle(CleanTextFieldStyle())

            TextField("Email", text: $email)
                .textFieldStyle(CleanTextFieldStyle())

            SecureField("Password", text: $password)
                .textFieldStyle(CleanTextFieldStyle())

            Button("Sign Up") {
                authManager.signUp(username: username, email: email, password: password)
            }
            .buttonStyle(CleanButtonStyle())
            .disabled(
                username.isEmpty || email.isEmpty || password.isEmpty || authManager.isLoading)
        }
        .padding(.horizontal, 40)
    }

    private var guestSignInForm: some View {
        VStack(spacing: 20) {
            TextField("Choose a username", text: $username)
                .textFieldStyle(CleanTextFieldStyle())

            Button("Play as Guest") {
                authManager.signInAsGuest(username: username)
            }
            .buttonStyle(CleanButtonStyle())
            .disabled(username.isEmpty || authManager.isLoading)
        }
        .padding(.horizontal, 40)
    }
}

// MARK: - Custom Styles
struct GlassTextFieldStyle: TextFieldStyle {
    func _body(configuration: TextField<Self._Label>) -> some View {
        configuration
            .padding(.horizontal, 20)
            .padding(.vertical, 16)
            .background(
                RoundedRectangle(cornerRadius: 14)
                    .fill(Color.white.opacity(0.15))
                    .overlay(
                        RoundedRectangle(cornerRadius: 14)
                            .stroke(Color.white.opacity(0.3), lineWidth: 1.5)
                    )
            )
            .foregroundColor(.white)
            .font(.system(size: 17, weight: .medium))
            .accentColor(.white)
    }
}

struct PrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .frame(maxWidth: .infinity)
            .frame(height: 56)
            .background(
                LinearGradient(
                    colors: [.orange, .red, .pink],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .foregroundColor(.white)
            .font(.system(size: 18, weight: .semibold))
            .cornerRadius(16)
            .shadow(color: .black.opacity(0.3), radius: 8, x: 0, y: 4)
            .scaleEffect(configuration.isPressed ? 0.96 : 1.0)
            .animation(.spring(response: 0.3, dampingFraction: 0.7), value: configuration.isPressed)
    }
}

struct SecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .frame(height: 44)
            .padding(.horizontal, 24)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.white.opacity(0.15))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color.white.opacity(0.3), lineWidth: 1.5)
                    )
            )
            .foregroundColor(.white)
            .font(.system(size: 16, weight: .medium))
            .scaleEffect(configuration.isPressed ? 0.95 : 1.0)
            .animation(.easeInOut(duration: 0.15), value: configuration.isPressed)
    }
}

struct GhostButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .frame(height: 44)
            .padding(.horizontal, 20)
            .foregroundColor(.white.opacity(0.85))
            .font(.system(size: 16, weight: .regular))
            .underline(configuration.isPressed)
            .scaleEffect(configuration.isPressed ? 0.95 : 1.0)
            .animation(.easeInOut(duration: 0.15), value: configuration.isPressed)
    }
}

struct LoadingOverlay: View {
    var body: some View {
        ZStack {
            Color.black.opacity(0.3)
                .ignoresSafeArea()

            VStack(spacing: 16) {
                ProgressView()
                    .scaleEffect(1.5)
                    .tint(.white)

                Text("Signing you in...")
                    .foregroundColor(.white)
                    .font(.headline)
            }
            .padding(30)
            .background(Color.black.opacity(0.7))
            .cornerRadius(16)
        }
    }
}

// MARK: - Clean Minimal Styles
struct CleanTextFieldStyle: TextFieldStyle {
    func _body(configuration: TextField<Self._Label>) -> some View {
        configuration
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(
                RoundedRectangle(cornerRadius: 2)
                    .fill(Color.clear)
                    .overlay(
                        Rectangle()
                            .frame(height: 1)
                            .foregroundColor(.white.opacity(0.3)),
                        alignment: .bottom
                    )
            )
            .foregroundColor(.white)
            .font(.system(size: 16, weight: .light))
            .accentColor(.white)
    }
}

struct CleanButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .frame(maxWidth: .infinity)
            .frame(height: 52)
            .background(
                RoundedRectangle(cornerRadius: 8)
                    .fill(
                        LinearGradient(
                            colors: [.white, .white.opacity(0.9)],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                    .shadow(color: .black.opacity(0.2), radius: 4, x: 0, y: 2)
            )
            .foregroundColor(.black)
            .font(.system(size: 16, weight: .medium))
            .scaleEffect(configuration.isPressed ? 0.96 : 1.0)
            .opacity(configuration.isPressed ? 0.8 : 1.0)
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
    }
}

// #Preview {
//     AuthenticationView()
//         .environmentObject(AuthenticationManager())
// }
