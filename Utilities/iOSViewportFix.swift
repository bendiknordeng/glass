import SwiftUI

#if os(iOS)
    import UIKit

    struct iOSViewportFixModifier: ViewModifier {
        @State private var hasAppliedFix = false

        func body(content: Content) -> some View {
            content
                .onAppear {
                    if !hasAppliedFix {
                        setupOrientation()
                        hasAppliedFix = true
                    }
                }
                .onReceive(
                    NotificationCenter.default.publisher(
                        for: UIDevice.orientationDidChangeNotification)
                ) { _ in
                    // Minimal orientation handling - only set orientation, don't manipulate windows
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
                        setupOrientation()
                    }
                }
        }

        private func setupOrientation() {
            guard
                let windowScene = UIApplication.shared.connectedScenes
                    .compactMap({ $0 as? UIWindowScene })
                    .first
            else { return }

            // Only handle orientation, don't touch window properties
            if #available(iOS 16.0, *) {
                let geometryPreferences = UIWindowScene.GeometryPreferences.iOS(
                    interfaceOrientations: .portrait)
                windowScene.requestGeometryUpdate(geometryPreferences)
            } else {
                // Fallback for iOS 15 and below
                DispatchQueue.main.async {
                    let value = UIInterfaceOrientation.portrait.rawValue
                    UIDevice.current.setValue(value, forKey: "orientation")
                }
            }
        }
    }

    extension View {
        func fixiOSViewport() -> some View {
            modifier(iOSViewportFixModifier())
        }
    }
#else
    extension View {
        func fixiOSViewport() -> some View {
            self
        }
    }
#endif
