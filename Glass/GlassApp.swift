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

            // Set initial portrait orientation
            if #available(iOS 16.0, *) {
                windowScene.requestGeometryUpdate(.iOS(interfaceOrientations: .portrait))
            }
        }

        func windowScene(
            _ windowScene: UIWindowScene, didUpdate previousCoordinateSpace: UICoordinateSpace,
            interfaceOrientation previousInterfaceOrientation: UIInterfaceOrientation,
            traitCollection previousTraitCollection: UITraitCollection
        ) {
            // Only update orientation if it's not portrait
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
    @StateObject private var authManager = AuthenticationManager.shared
    @StateObject private var gameEngine = GameEngine.shared

    #if os(iOS)
        @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    #endif

    init() {
        setupServices()
        setupDefaultSettings()
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

                        // Use modern orientation API if available
                        if #available(iOS 16.0, *),
                            let windowScene = UIApplication.shared.connectedScenes.first
                                as? UIWindowScene
                        {
                            let geometryPreferences = UIWindowScene.GeometryPreferences.iOS(
                                interfaceOrientations: .portrait)
                            windowScene.requestGeometryUpdate(geometryPreferences)
                        } else {
                            // Fallback for older iOS versions
                            let value = UIInterfaceOrientation.portrait.rawValue
                            UIDevice.current.setValue(value, forKey: "orientation")
                        }
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

    private func setupDefaultSettings() {
        let defaults = UserDefaults.standard

        // Set default values if not already set
        if !defaults.bool(forKey: "hasSetDefaultSettings") {
            defaults.set(true, forKey: UserDefaults.Keys.soundEnabled)

            #if targetEnvironment(simulator)
                // Disable haptics in simulator to prevent errors
                defaults.set(false, forKey: UserDefaults.Keys.hapticEnabled)
            #else
                // Enable haptics on real devices
                defaults.set(true, forKey: UserDefaults.Keys.hapticEnabled)
            #endif

            defaults.set(true, forKey: "hasSetDefaultSettings")
        }
    }
}
