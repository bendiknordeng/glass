// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "Glass",
    platforms: [
        .iOS(.v17),
        .macOS(.v13),
    ],
    products: [
        .library(
            name: "GlassLibrary",
            targets: ["GlassLibrary"])
    ],
    dependencies: [
        // Supabase for backend
        .package(url: "https://github.com/supabase/supabase-swift", from: "2.0.0"),
        // WebSocket support
        .package(url: "https://github.com/daltoniam/Starscream", from: "4.0.0"),
        // Modern SwiftUI animations and effects
        .package(url: "https://github.com/siteline/SwiftUI-Introspect", from: "0.12.0"),
        // Lottie animations for iOS
        .package(url: "https://github.com/airbnb/lottie-ios", from: "4.4.0"),
    ],
    targets: [
        .target(
            name: "GlassLibrary",
            dependencies: [
                .product(name: "Supabase", package: "supabase-swift"),
                .product(name: "Starscream", package: "Starscream"),
                .product(name: "SwiftUIIntrospect", package: "SwiftUI-Introspect"),
                .product(name: "Lottie", package: "lottie-ios"),
            ],
            path: ".",
            exclude: [
                "Tests", ".mcp", ".vscode", "README.md", ".gitignore", "Xcode-Project-Structure.md",
                "iPhone-Setup-Guide.md", "Glass", "GlassApp.swift.backup",
            ],
            sources: [
                "Core",
                "Models",
                "Views",
                "Services",
                "Utilities",
            ]
        )
    ]
)
