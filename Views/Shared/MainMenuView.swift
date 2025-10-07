import SwiftUI

struct MainMenuView: View {
    @EnvironmentObject var authManager: AuthenticationManager
    @EnvironmentObject var gameEngine: GameEngine
    @EnvironmentObject var appState: AppState
    @State private var showingHostSetup = false
    @State private var showingJoinGame = false
    @State private var showingSettings = false
    @State private var isAnimating = false

    var body: some View {
        GeometryReader { geometry in
            NavigationView {
                ZStack {
                    // Enhanced Background with multiple layers
                    LinearGradient(
                        colors: [
                            .blue.opacity(0.15),
                            .purple.opacity(0.25),
                            .blue.opacity(0.1),
                            .clear,
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                    .ignoresSafeArea()

                    // Floating orbs for depth
                    ForEach(0..<3, id: \.self) { index in
                        Circle()
                            .fill(
                                RadialGradient(
                                    colors: [
                                        index == 0 ? .blue.opacity(0.2) : .purple.opacity(0.15),
                                        .clear,
                                    ],
                                    center: .center,
                                    startRadius: 0,
                                    endRadius: 150
                                )
                            )
                            .frame(width: 200, height: 200)
                            .position(
                                x: geometry.size.width
                                    * (index == 0 ? 0.2 : index == 1 ? 0.8 : 0.5),
                                y: geometry.size.height
                                    * (index == 0 ? 0.3 : index == 1 ? 0.7 : 0.1)
                            )
                            .blur(radius: 40)
                            .scaleEffect(isAnimating ? 1.2 : 0.8)
                            .animation(
                                .easeInOut(duration: Double(4 + index))
                                    .repeatForever(autoreverses: true),
                                value: isAnimating
                            )
                    }

                    ScrollView {
                        VStack(spacing: min(40, geometry.size.height * 0.08)) {
                            // Header
                            headerSection

                            // Main Menu Buttons
                            menuButtons

                            // User Info
                            userInfoSection
                        }
                        .padding(.horizontal, max(24, geometry.size.width * 0.06))
                        .frame(minHeight: geometry.size.height)
                    }
                }
                #if !os(macOS)
                    .toolbar(.hidden, for: .navigationBar)
                #endif
            }
            #if os(macOS)
                .navigationViewStyle(DefaultNavigationViewStyle())
            #else
                .navigationViewStyle(StackNavigationViewStyle())
            #endif
        }
        .sheet(isPresented: $showingHostSetup) {
            HostSetupView()
        }
        .sheet(isPresented: $showingJoinGame) {
            JoinGameView()
        }
        .sheet(isPresented: $showingSettings) {
            SettingsView()
        }
    }

    private var headerSection: some View {
        GeometryReader { geometry in
            VStack(spacing: 16) {
                // Enhanced App Icon with 3D effect
                ZStack {
                    // Background glow
                    Circle()
                        .fill(
                            RadialGradient(
                                colors: [.blue.opacity(0.6), .purple.opacity(0.8), .clear],
                                center: .center,
                                startRadius: 10,
                                endRadius: min(80, geometry.size.width * 0.2)
                            )
                        )
                        .frame(
                            width: min(140, geometry.size.width * 0.35),
                            height: min(140, geometry.size.width * 0.35)
                        )
                        .blur(radius: 20)

                    // Main icon circle with enhanced gradient
                    Circle()
                        .fill(
                            LinearGradient(
                                colors: [
                                    .blue.opacity(0.9),
                                    .blue,
                                    .purple,
                                    .purple.opacity(0.8),
                                ],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(
                            width: min(120, geometry.size.width * 0.3),
                            height: min(120, geometry.size.width * 0.3)
                        )
                        .overlay(
                            Circle()
                                .stroke(
                                    LinearGradient(
                                        colors: [.white.opacity(0.3), .clear],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    ),
                                    lineWidth: 2
                                )
                        )
                        .shadow(color: .blue.opacity(0.4), radius: 15, x: 0, y: 8)

                    // Animated game controller icon
                    Image(systemName: "gamecontroller.fill")
                        .font(
                            .system(
                                size: min(55, geometry.size.width * 0.14),
                                weight: .medium
                            )
                        )
                        .foregroundStyle(
                            LinearGradient(
                                colors: [.white, .white.opacity(0.8)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .shadow(color: .black.opacity(0.2), radius: 4, x: 0, y: 2)
                }
                .scaleEffect(isAnimating ? 1.05 : 1.0)
                .rotationEffect(.degrees(isAnimating ? 2 : -2))
                .animation(
                    .easeInOut(duration: 3.0)
                        .repeatForever(autoreverses: true),
                    value: isAnimating
                )

                // Enhanced App Title with animated gradient
                Text("Glass")
                    .font(
                        .system(
                            size: min(48, geometry.size.width * 0.12),
                            weight: .bold,
                            design: .rounded
                        )
                    )
                    .foregroundStyle(
                        LinearGradient(
                            colors: [.blue, .purple, .blue],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .shadow(color: .blue.opacity(0.3), radius: 8, x: 0, y: 4)

                Text("Ready to play?")
                    .font(.system(size: min(20, geometry.size.width * 0.05)))
                    .fontWeight(.medium)
                    .foregroundColor(.secondary)
                    .opacity(isAnimating ? 0.8 : 1.0)
                    .animation(
                        .easeInOut(duration: 2.0)
                            .repeatForever(autoreverses: true),
                        value: isAnimating
                    )
            }
            .frame(maxWidth: .infinity)
            .onAppear {
                isAnimating = true
            }
        }
        .frame(height: 250)
    }

    private var menuButtons: some View {
        VStack(spacing: 20) {
            // Host Game Button
            MenuButton(
                title: "Host Game",
                subtitle: "Start a new party",
                icon: "tv.and.hifispeaker.fill",
                color: .orange,
                action: { showingHostSetup = true }
            )

            // Join Game Button
            MenuButton(
                title: "Join Game",
                subtitle: "Scan QR or enter code",
                icon: "qrcode.viewfinder",
                color: .blue,
                action: { showingJoinGame = true }
            )

            // Practice Button
            MenuButton(
                title: "Practice Mode",
                subtitle: "Play solo challenges",
                icon: "brain.head.profile",
                color: .green,
                action: { /* TODO: Implement practice mode */  }
            )

            // Settings Button
            MenuButton(
                title: "Settings",
                subtitle: "Customize your experience",
                icon: "gearshape.fill",
                color: .gray,
                action: { showingSettings = true }
            )
        }
    }

    private var userInfoSection: some View {
        VStack(spacing: 12) {
            if let user = authManager.currentUser {
                HStack(spacing: 16) {
                    // Enhanced Avatar with glassmorphism
                    ZStack {
                        Circle()
                            .fill(
                                LinearGradient(
                                    colors: [.blue.opacity(0.3), .blue.opacity(0.6)],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                            .frame(width: 56, height: 56)
                            .overlay(
                                Circle()
                                    .stroke(.white.opacity(0.3), lineWidth: 2)
                            )
                            .shadow(color: .blue.opacity(0.3), radius: 8, x: 0, y: 4)

                        Text(String(user.username.prefix(1).uppercased()))
                            .font(.system(size: 20, weight: .bold, design: .rounded))
                            .foregroundColor(.white)
                    }

                    VStack(alignment: .leading, spacing: 4) {
                        Text(user.username)
                            .font(.system(size: 18, weight: .semibold, design: .rounded))
                            .foregroundColor(.primary)

                        if user.stats.gamesPlayed > 0 {
                            Text("\(user.stats.gamesPlayed) games played")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(.secondary)
                        }
                    }

                    Spacer()

                    // Enhanced Sign Out Button
                    AnimatedButton(animationType: .bounce) {
                        authManager.signOut()
                    } content: {
                        Text("Sign Out")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.blue)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(.ultraThinMaterial)
                            .cornerRadius(12)
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(.blue.opacity(0.3), lineWidth: 1)
                            )
                    }
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 16)
                .background(
                    RoundedRectangle(cornerRadius: 20)
                        .fill(.ultraThinMaterial)
                        .overlay(
                            RoundedRectangle(cornerRadius: 20)
                                .stroke(
                                    LinearGradient(
                                        colors: [.white.opacity(0.2), .clear],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    ),
                                    lineWidth: 1
                                )
                        )
                )
                .shadow(color: .black.opacity(0.05), radius: 10, x: 0, y: 5)
            }
        }
    }
}

struct MenuButton: View {
    let title: String
    let subtitle: String
    let icon: String
    let color: Color
    let action: () -> Void

    @State private var isPressed = false
    @State private var animateGradient = false

    var body: some View {
        Button(action: action) {
            HStack(spacing: 16) {
                // Enhanced icon with glassmorphism effect
                ZStack {
                    Circle()
                        .fill(
                            LinearGradient(
                                colors: [color.opacity(0.8), color],
                                startPoint: animateGradient ? .topLeading : .bottomTrailing,
                                endPoint: animateGradient ? .bottomTrailing : .topLeading
                            )
                        )
                        .frame(width: 56, height: 56)
                        .shadow(color: color.opacity(0.3), radius: 8, x: 0, y: 4)

                    Image(systemName: icon)
                        .font(.system(size: 24, weight: .semibold))
                        .foregroundColor(.white)
                }
                .scaleEffect(isPressed ? 0.9 : 1.0)

                // Enhanced text with better typography
                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.system(size: 18, weight: .semibold, design: .rounded))
                        .foregroundColor(.primary)

                    Text(subtitle)
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.secondary)
                }

                Spacer()

                // Animated arrow indicator
                Image(systemName: "chevron.right")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.secondary.opacity(0.6))
                    .scaleEffect(isPressed ? 1.2 : 1.0)
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 16)
            .background(
                RoundedRectangle(cornerRadius: 20)
                    .fill(.ultraThinMaterial)
                    .overlay(
                        RoundedRectangle(cornerRadius: 20)
                            .stroke(
                                LinearGradient(
                                    colors: [.white.opacity(0.2), .clear],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                ),
                                lineWidth: 1
                            )
                    )
            )
            .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 4)
        }
        .scaleEffect(isPressed ? 0.98 : 1.0)
        .animation(.spring(response: 0.3, dampingFraction: 0.6), value: isPressed)
        .animation(
            .easeInOut(duration: 2).repeatForever(autoreverses: true), value: animateGradient
        )
        .onAppear {
            animateGradient = true
        }
        .onLongPressGesture(
            minimumDuration: 0, maximumDistance: .infinity,
            pressing: { pressing in
                isPressed = pressing
            }, perform: {})
    }
}

// Preview removed for Swift Package Manager compatibility
