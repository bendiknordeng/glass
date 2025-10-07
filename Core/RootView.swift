import SwiftUI

#if os(iOS)
    import UIKit
#endif

struct RootView: View {
    @EnvironmentObject var authManager: AuthenticationManager
    @EnvironmentObject var appState: AppState
    @StateObject private var heroCoordinator = HeroTransitionCoordinator()
    @Namespace private var heroNamespace

    var body: some View {
        Group {
            if authManager.isInitializing {
                // Show loading screen during app initialization
                AppLoadingView()
            } else if authManager.isAuthenticated {
                if appState.currentGameSession != nil {
                    HeroPageTransition(animationType: .spring) {
                        GameView()
                            .environmentObject(heroCoordinator)
                    }
                } else {
                    HeroPageTransition(animationType: .spring) {
                        MainMenuView()
                            .environmentObject(heroCoordinator)
                    }
                }
            } else {
                HeroPageTransition(animationType: .fade) {
                    AuthenticationView()
                        .environmentObject(heroCoordinator)
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .fixiOSViewport()  // Apply iOS viewport fix
        .animation(.spring(response: 0.6, dampingFraction: 0.8), value: authManager.isInitializing)
        .animation(.spring(response: 0.6, dampingFraction: 0.8), value: authManager.isAuthenticated)
        .animation(.spring(response: 0.6, dampingFraction: 0.8), value: appState.currentGameSession)
        .onChange(of: authManager.isAuthenticated) { _ in
            // Dismiss keyboard when authentication state changes
            #if os(iOS)
                UIApplication.shared.dismissKeyboard()
            #endif
        }
        .onChange(of: appState.currentGameSession) { _ in
            // Dismiss keyboard when game state changes
            #if os(iOS)
                UIApplication.shared.dismissKeyboard()
            #endif
        }
    }
}

#if os(iOS)
    extension View {
        func supportedOrientations(_ orientations: UIInterfaceOrientationMask) -> some View {
            self  // Return self without modification for now
        }
    }
#endif

// #Preview {
//     RootView()
//         .environmentObject(AppState())
//         .environmentObject(AuthenticationManager())
//         .environmentObject(GameEngine())
// }
