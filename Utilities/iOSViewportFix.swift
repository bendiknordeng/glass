import SwiftUI

#if os(iOS)
    import UIKit

    struct iOSViewportFixModifier: ViewModifier {
        func body(content: Content) -> some View {
            content
                .onAppear {
                    // Force proper device orientation and scaling
                    setupiOSViewport()
                }
                .onReceive(
                    NotificationCenter.default.publisher(
                        for: UIDevice.orientationDidChangeNotification)
                ) { _ in
                    // Re-enforce portrait mode if device orientation changes
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                        setupiOSViewport()
                    }
                }
        }

        private func setupiOSViewport() {
            // Force portrait orientation
            let value = UIInterfaceOrientation.portrait.rawValue
            UIDevice.current.setValue(value, forKey: "orientation")

            // Get the window scene and configure it
            if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene {
                // Request portrait geometry
                if #available(iOS 16.0, *) {
                    windowScene.requestGeometryUpdate(.iOS(interfaceOrientations: .portrait))
                }

                // Configure windows for proper scaling
                for window in windowScene.windows {
                    window.backgroundColor = UIColor.systemBackground
                    // Ensure 1:1 scaling
                    window.contentScaleFactor = UIScreen.main.scale
                    window.transform = CGAffineTransform.identity
                    window.layer.transform = CATransform3DIdentity

                    // Force layout update
                    window.setNeedsLayout()
                    window.layoutIfNeeded()
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
