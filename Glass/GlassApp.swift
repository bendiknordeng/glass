import Supabase
import SwiftUI

#if os(iOS)
    import UIKit

    class AppDelegate: NSObject, UIApplicationDelegate {
        static var orientationLock = UIInterfaceOrientationMask.portrait

        func application(
            _ application: UIApplication,
            supportedInterfaceOrientationsFor window: UIWindow?
        ) -> UIInterfaceOrientationMask {
            return .portrait  // Always return portrait only
        }

        func application(
            _ application: UIApplication,
            didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
        ) -> Bool {
            // Force portrait orientation from launch
            AppDelegate.orientationLock = .portrait

            // Disable rotation completely
            if #available(iOS 16.0, *) {
                // For iOS 16+, this will be handled in scene configuration
            } else {
                // For older iOS versions
                let value = UIInterfaceOrientation.portrait.rawValue
                UIDevice.current.setValue(value, forKey: "orientation")
            }

            return true
        }

        func application(
            _ application: UIApplication,
            configurationForConnecting connectingSceneSession: UISceneSession,
            options: UIScene.ConnectionOptions
        ) -> UISceneConfiguration {
            let config = UISceneConfiguration(name: nil, sessionRole: connectingSceneSession.role)
            config.delegateClass = SceneDelegate.self
            return config
        }
    }

    class SceneDelegate: NSObject, UIWindowSceneDelegate {
        var window: UIWindow?

        func scene(
            _ scene: UIScene, willConnectTo session: UISceneSession,
            options connectionOptions: UIScene.ConnectionOptions
        ) {
            guard let windowScene = scene as? UIWindowScene else { return }

            // Force portrait orientation and proper scaling
            if #available(iOS 16.0, *) {
                windowScene.requestGeometryUpdate(.iOS(interfaceOrientations: .portrait))
            }

            // Configure all windows in the scene
            for window in windowScene.windows {
                window.backgroundColor = UIColor.systemBackground
                // Reset any cached transforms
                window.transform = CGAffineTransform.identity
                window.layer.transform = CATransform3DIdentity
            }
        }

        func windowScene(
            _ windowScene: UIWindowScene, didUpdate previousCoordinateSpace: UICoordinateSpace,
            interfaceOrientation previousInterfaceOrientation: UIInterfaceOrientation,
            traitCollection previousTraitCollection: UITraitCollection
        ) {
            // Force portrait if orientation changes
            if windowScene.interfaceOrientation != .portrait {
                if #available(iOS 16.0, *) {
                    windowScene.requestGeometryUpdate(.iOS(interfaceOrientations: .portrait))
                }
            }
        }
    }
#endif

@main
struct GlassApp: App {
    @StateObject private var appState = AppState()
    @StateObject private var authManager = AuthenticationManager()
    @StateObject private var gameEngine = GameEngine()

    #if os(iOS)
        @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    #endif

    init() {
        setupServices()
        #if os(macOS)
            // Force app activation on macOS
            DispatchQueue.main.async {
                NSApp.setActivationPolicy(.regular)
                NSApp.activate(ignoringOtherApps: true)
            }
        #endif
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(appState)
                .environmentObject(authManager)
                .environmentObject(gameEngine)
                #if os(iOS)
                    .preferredColorScheme(.dark)
                    .statusBarHidden(false)
                    .ignoresSafeArea(.keyboard, edges: .bottom)
                    .onAppear {
                        // Simple orientation lock
                        AppDelegate.orientationLock = .portrait

                        // Force portrait if device is currently landscape
                        let value = UIInterfaceOrientation.portrait.rawValue
                        UIDevice.current.setValue(value, forKey: "orientation")
                    }
                #endif
        }
        #if os(iOS)
            .windowResizability(.contentSize)
        #endif
    }

    private func setupServices() {
        // Initialize Supabase
        let supabaseURL = ProcessInfo.processInfo.environment["SUPABASE_URL"] ?? ""
        let supabaseKey = ProcessInfo.processInfo.environment["SUPABASE_ANON_KEY"] ?? ""

        if !supabaseURL.isEmpty && !supabaseKey.isEmpty {
            SupabaseService.shared.configure(url: supabaseURL, anonKey: supabaseKey)
        }
    }
}
