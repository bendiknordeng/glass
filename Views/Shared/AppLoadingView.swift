import SwiftUI

struct AppLoadingView: View {
    @State private var isAnimating = false
    @State private var logoScale: CGFloat = 0.8
    @State private var logoOpacity: Double = 0.0
    @State private var loadingDots = 0
    @State private var shimmerOffset: CGFloat = -1.0

    var body: some View {
        ZStack {
            // Background with subtle gradient
            LinearGradient(
                colors: [
                    Color.black,
                    Color.black.opacity(0.95),
                    Color.black,
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack(spacing: 50) {
                // App Logo with Enhanced Animation
                VStack(spacing: 20) {
                    ZStack {
                        // Subtle glow effect
                        Image(systemName: "gamecontroller.fill")
                            .font(.system(size: 100, weight: .light))
                            .foregroundColor(.white.opacity(0.1))
                            .scaleEffect(logoScale * 1.2)
                            .blur(radius: 20)

                        // Main logo
                        Image(systemName: "gamecontroller.fill")
                            .font(.system(size: 100, weight: .light))
                            .foregroundColor(.white)
                            .scaleEffect(logoScale)
                            .opacity(logoOpacity)
                    }
                    .onAppear {
                        withAnimation(.easeOut(duration: 1.2).delay(0.2)) {
                            logoScale = 1.0
                            logoOpacity = 1.0
                        }
                    }

                    // App name with shimmer effect
                    ZStack {
                        Text("Glass")
                            .font(.system(size: 48, weight: .thin, design: .default))
                            .foregroundColor(.white.opacity(0.9))
                            .tracking(8)
                            .opacity(logoOpacity)

                        // Shimmer overlay
                        Text("Glass")
                            .font(.system(size: 48, weight: .thin, design: .default))
                            .foregroundColor(.clear)
                            .tracking(8)
                            .overlay(
                                LinearGradient(
                                    colors: [
                                        .clear,
                                        .white.opacity(0.6),
                                        .clear,
                                    ],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                                .mask(
                                    Text("Glass")
                                        .font(.system(size: 48, weight: .thin, design: .default))
                                        .tracking(8)
                                )
                                .offset(x: shimmerOffset * 200)
                            )
                            .opacity(logoOpacity)
                    }
                    .onAppear {
                        withAnimation(
                            .linear(duration: 2.0).repeatForever(autoreverses: false).delay(1.5)
                        ) {
                            shimmerOffset = 1.0
                        }
                    }

                    Text("The Ultimate Party Game")
                        .font(.system(size: 18, weight: .light))
                        .foregroundColor(.white.opacity(0.7))
                        .tracking(2)
                        .opacity(logoOpacity)
                }
                .padding(.top, 100)

                Spacer()

                // Enhanced Loading Indicator
                VStack(spacing: 20) {
                    // Custom loading dots
                    HStack(spacing: 8) {
                        ForEach(0..<3) { index in
                            Circle()
                                .fill(.white.opacity(0.8))
                                .frame(width: 8, height: 8)
                                .scaleEffect(loadingDots == index ? 1.3 : 0.8)
                                .opacity(loadingDots == index ? 1.0 : 0.5)
                                .animation(
                                    .easeInOut(duration: 0.6),
                                    value: loadingDots
                                )
                        }
                    }
                    .onAppear {
                        Timer.scheduledTimer(withTimeInterval: 0.6, repeats: true) { _ in
                            loadingDots = (loadingDots + 1) % 3
                        }
                    }

                    Text("Loading")
                        .font(.system(size: 16, weight: .light))
                        .foregroundColor(.white.opacity(0.8))
                        .opacity(isAnimating ? 0.5 : 1.0)
                        .animation(
                            .easeInOut(duration: 1.0).repeatForever(autoreverses: true),
                            value: isAnimating
                        )
                }
                .padding(.bottom, 100)
                .onAppear {
                    isAnimating = true
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

#Preview {
    AppLoadingView()
}
