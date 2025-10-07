// MARK: - Sound Manager
import AVFoundation
// MARK: - Color Extensions
import Combine
import Foundation
import SwiftUI

// MARK: - Network Utilities
class NetworkUtilities {
    static func getLocalIPAddress() -> String? {
        var address: String?
        var ifaddr: UnsafeMutablePointer<ifaddrs>?

        guard getifaddrs(&ifaddr) == 0 else { return nil }
        guard let firstAddr = ifaddr else { return nil }

        for ifptr in sequence(first: firstAddr, next: { $0.pointee.ifa_next }) {
            let interface = ifptr.pointee
            let addrFamily = interface.ifa_addr.pointee.sa_family

            if addrFamily == UInt8(AF_INET) {
                let name = String(cString: interface.ifa_name)
                if name == "en0" || name == "en1" {  // WiFi or Ethernet
                    var hostname = [CChar](repeating: 0, count: Int(NI_MAXHOST))
                    getnameinfo(
                        interface.ifa_addr,
                        socklen_t(interface.ifa_addr.pointee.sa_len),
                        &hostname,
                        socklen_t(hostname.count),
                        nil,
                        socklen_t(0),
                        NI_NUMERICHOST)
                    address = String(cString: hostname)
                    break
                }
            }
        }

        freeifaddrs(ifaddr)
        return address
    }

    static func isValidIPAddress(_ ip: String) -> Bool {
        let parts = ip.split(separator: ".")
        guard parts.count == 4 else { return false }

        return parts.allSatisfy { part in
            guard let num = Int(part), num >= 0 && num <= 255 else { return false }
            return true
        }
    }

    static func generateGameCode() -> String {
        let letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        return String((0..<4).map { _ in letters.randomElement()! })
    }
}

// MARK: - String Extensions
extension String {
    func isValidGameCode() -> Bool {
        return self.count == 4 && self.allSatisfy { $0.isLetter && $0.isUppercase }
    }

    func sanitized() -> String {
        return self.trimmingCharacters(in: .whitespacesAndNewlines)
    }
}

extension Color {
    static let glassBlue = Color(red: 0.2, green: 0.6, blue: 1.0)
    static let glassOrange = Color(red: 1.0, green: 0.6, blue: 0.2)
    static let glassPurple = Color(red: 0.6, green: 0.3, blue: 0.9)

    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a: UInt64
        let r: UInt64
        let g: UInt64
        let b: UInt64
        switch hex.count {
        case 3:  // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6:  // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8:  // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (1, 1, 1, 0)
        }

        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

// MARK: - View Extensions
extension View {
    func glassCard() -> some View {
        self
            .padding()
            .background(Color.primary.colorInvert())
            .cornerRadius(16)
            .shadow(color: .black.opacity(0.1), radius: 4, x: 0, y: 2)
    }

    func pulseAnimation() -> some View {
        self
            .scaleEffect(1.0)
            .onAppear {
                withAnimation(
                    .easeInOut(duration: 1.0)
                        .repeatForever(autoreverses: true)
                ) {
                    // Animation will be applied by the caller
                }
            }
    }
}

// MARK: - Date Extensions
extension Date {
    func timeAgo() -> String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: self, relativeTo: Date())
    }

    func formattedTime() -> String {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: self)
    }
}

// MARK: - Array Extensions
extension Array {
    func chunked(into size: Int) -> [[Element]] {
        return stride(from: 0, to: count, by: size).map {
            Array(self[$0..<Swift.min($0 + size, count)])
        }
    }

    mutating func safeAppend(_ element: Element?) {
        if let element = element {
            append(element)
        }
    }
}

// MARK: - UserDefaults Extensions
extension UserDefaults {
    enum Keys {
        static let currentUser = "currentUser"
        static let gameSettings = "gameSettings"
        static let soundEnabled = "soundEnabled"
        static let hapticEnabled = "hapticEnabled"
    }

    func setCodable<T: Codable>(_ value: T, forKey key: String) {
        if let data = try? JSONEncoder().encode(value) {
            set(data, forKey: key)
        }
    }

    func getCodable<T: Codable>(_ type: T.Type, forKey key: String) -> T? {
        guard let data = data(forKey: key) else { return nil }
        return try? JSONDecoder().decode(type, from: data)
    }
}

// MARK: - Haptic Feedback
#if canImport(UIKit)
    import UIKit

    class HapticManager {
        static let shared = HapticManager()

        private init() {}

        func impact(_ style: UIImpactFeedbackGenerator.FeedbackStyle = .medium) {
            let generator = UIImpactFeedbackGenerator(style: style)
            generator.impactOccurred()
        }

        func notification(_ type: UINotificationFeedbackGenerator.FeedbackType) {
            let generator = UINotificationFeedbackGenerator()
            generator.notificationOccurred(type)
        }

        func selection() {
            let generator = UISelectionFeedbackGenerator()
            generator.selectionChanged()
        }
    }
#else
    // macOS fallback - no haptic feedback
    class HapticManager {
        static let shared = HapticManager()

        private init() {}

        func impact(_ style: Int = 1) {
            // No haptic feedback on macOS
        }

        func notification(_ type: Int) {
            // No haptic feedback on macOS
        }

        func selection() {
            // No haptic feedback on macOS
        }
    }
#endif

class SoundManager: ObservableObject {
    static let shared = SoundManager()

    @Published var isEnabled: Bool = false {
        didSet {
            UserDefaults.standard.set(isEnabled, forKey: UserDefaults.Keys.soundEnabled)
        }
    }

    private var audioPlayer: AVAudioPlayer?

    private init() {
        self.isEnabled = UserDefaults.standard.bool(forKey: UserDefaults.Keys.soundEnabled)
    }

    func playSound(_ soundName: String, withExtension ext: String = "wav") {
        guard isEnabled else { return }

        guard let url = Bundle.main.url(forResource: soundName, withExtension: ext) else {
            print("Sound file not found: \(soundName).\(ext)")
            return
        }

        do {
            audioPlayer = try AVAudioPlayer(contentsOf: url)
            audioPlayer?.play()
        } catch {
            print("Error playing sound: \(error)")
        }
    }

    func playCorrectAnswer() {
        playSound("correct_answer")
        #if canImport(UIKit)
            HapticManager.shared.notification(.success)
        #else
            HapticManager.shared.notification(1)  // success equivalent on macOS
        #endif
    }

    func playWrongAnswer() {
        playSound("wrong_answer")
        #if canImport(UIKit)
            HapticManager.shared.notification(.error)
        #else
            HapticManager.shared.notification(2)  // error equivalent on macOS
        #endif
    }

    func playGameStart() {
        playSound("game_start")
        #if canImport(UIKit)
            HapticManager.shared.impact(.heavy)
        #else
            HapticManager.shared.impact(2)  // heavy equivalent on macOS
        #endif
    }

    func playPlayerJoin() {
        playSound("player_join")
        #if canImport(UIKit)
            HapticManager.shared.impact(.light)
        #else
            HapticManager.shared.impact(0)  // light equivalent on macOS
        #endif
    }
}

// MARK: - Validation Utilities
struct ValidationUtilities {
    static func isValidEmail(_ email: String) -> Bool {
        let emailRegex = "[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,64}"
        let emailPredicate = NSPredicate(format: "SELF MATCHES %@", emailRegex)
        return emailPredicate.evaluate(with: email)
    }

    static func isValidUsername(_ username: String) -> Bool {
        let trimmed = username.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.count >= 2 && trimmed.count <= 20
    }

    static func isValidPassword(_ password: String) -> Bool {
        return password.count >= 6
    }
}

// MARK: - Logger
class Logger {
    static let shared = Logger()

    private init() {}

    enum Level: String {
        case debug = "🔍 DEBUG"
        case info = "ℹ️ INFO"
        case warning = "⚠️ WARNING"
        case error = "❌ ERROR"
    }

    func log(
        _ message: String, level: Level = .info, file: String = #file, function: String = #function,
        line: Int = #line
    ) {
        let fileName = (file as NSString).lastPathComponent
        let timestamp = DateFormatter.logFormatter.string(from: Date())

        print("\(timestamp) \(level.rawValue) [\(fileName):\(line)] \(function) - \(message)")
    }

    func debug(
        _ message: String, file: String = #file, function: String = #function, line: Int = #line
    ) {
        log(message, level: .debug, file: file, function: function, line: line)
    }

    func info(
        _ message: String, file: String = #file, function: String = #function, line: Int = #line
    ) {
        log(message, level: .info, file: file, function: function, line: line)
    }

    func warning(
        _ message: String, file: String = #file, function: String = #function, line: Int = #line
    ) {
        log(message, level: .warning, file: file, function: function, line: line)
    }

    func error(
        _ message: String, file: String = #file, function: String = #function, line: Int = #line
    ) {
        log(message, level: .error, file: file, function: function, line: line)
    }
}

extension DateFormatter {
    static let logFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd HH:mm:ss.SSS"
        return formatter
    }()
}

// MARK: - Hero Transition System

/// A protocol for views that support hero transitions
protocol HeroTransitionable {
    var heroID: String { get }
}

/// Hero transition coordinator that manages shared namespace
class HeroTransitionCoordinator: ObservableObject {
    @Published var isTransitioning = false

    init() {}

    func startTransition() {
        isTransitioning = true
    }

    func endTransition() {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            self.isTransitioning = false
        }
    }
}

// MARK: - Hero Animation Presets

enum HeroAnimationType {
    case slide
    case scale
    case fade
    case bounce
    case spring

    var animation: Animation {
        switch self {
        case .slide:
            return .easeInOut(duration: 0.6)
        case .scale:
            return .spring(response: 0.6, dampingFraction: 0.8)
        case .fade:
            return .easeInOut(duration: 0.4)
        case .bounce:
            return .spring(response: 0.5, dampingFraction: 0.6)
        case .spring:
            return .spring(response: 0.8, dampingFraction: 0.9)
        }
    }
}

// MARK: - Hero Transition Modifiers

struct HeroTransition: ViewModifier {
    let id: String
    let namespace: Namespace.ID
    let animationType: HeroAnimationType

    func body(content: Content) -> some View {
        content
            .matchedGeometryEffect(id: id, in: namespace)
            .animation(animationType.animation, value: id)
    }
}

// MARK: - View Extensions for Hero Transitions

extension View {
    func heroTransition(
        id: String,
        in namespace: Namespace.ID,
        animationType: HeroAnimationType = .spring
    ) -> some View {
        modifier(HeroTransition(id: id, namespace: namespace, animationType: animationType))
    }
}

// MARK: - Page Transition Container

struct HeroPageTransition<Content: View>: View {
    let content: Content
    let animationType: HeroAnimationType
    @State private var isPresented = false

    init(
        animationType: HeroAnimationType = .spring,
        @ViewBuilder content: () -> Content
    ) {
        self.content = content()
        self.animationType = animationType
    }

    var body: some View {
        content
            .opacity(isPresented ? 1 : 0)
            .scaleEffect(isPresented ? 1 : 0.95)
            .animation(animationType.animation, value: isPresented)
            .onAppear {
                isPresented = true
            }
    }
}

// MARK: - Glassmorphism Effect

struct GlassmorphismEffect: ViewModifier {
    let opacity: Double
    let blur: CGFloat

    func body(content: Content) -> some View {
        content
            .background(
                Rectangle()
                    .fill(.ultraThinMaterial, style: FillStyle())
                    .opacity(opacity)
                    .blur(radius: blur)
            )
    }
}

extension View {
    func glassmorphism(opacity: Double = 0.7, blur: CGFloat = 10) -> some View {
        modifier(GlassmorphismEffect(opacity: opacity, blur: blur))
    }
}

// MARK: - Animated Button

struct AnimatedButton<Content: View>: View {
    let action: () -> Void
    let content: Content
    let animationType: HeroAnimationType

    @State private var isPressed = false

    init(
        animationType: HeroAnimationType = .bounce,
        action: @escaping () -> Void,
        @ViewBuilder content: () -> Content
    ) {
        self.action = action
        self.content = content()
        self.animationType = animationType
    }

    var body: some View {
        Button(action: action) {
            content
        }
        .scaleEffect(isPressed ? 0.95 : 1.0)
        .opacity(isPressed ? 0.8 : 1.0)
        .animation(animationType.animation, value: isPressed)
        .onLongPressGesture(
            minimumDuration: 0, maximumDistance: .infinity,
            pressing: { pressing in
                isPressed = pressing
            }, perform: {})
    }
}
