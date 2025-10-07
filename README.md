# Glass - The Ultimate Party Game 🎮

A revolutionary multiplayer party game for iOS that transforms any TV into an interactive gaming console. Players use their phones as controllers while the main game displays on the big screen via Chromecast or AirPlay.

## 🌟 Features

- **Multi-Device Gameplay**: Host on one device, play on many
- **TV Integration**: Seamless Chromecast and AirPlay support
- **QR Code Join**: Players join instantly by scanning a QR code
- **Diverse Challenges**: Quiz, categories, geography, drinking games, and more
- **Real-time Scoring**: Live leaderboards and instant feedback
- **Custom Content**: Create your own challenges and game modes
- **Social Authentication**: Sign in with Apple, Google, or as a guest
- **MCP Integration**: AI-powered challenge generation and development assistance

## 🏗️ Architecture

### Core Components

```
📱 Host Device (iPhone/iPad)
├── 🎮 Game Engine
├── 🌐 WebSocket Server
├── 📡 Casting Service
└── 🔄 Real-time Sync

📺 TV Display
├── 🎯 Main Game UI
├── 📊 Live Scoreboard
└── ⏱️ Challenge Timer

📱 Player Devices
├── 🕹️ Controller Interface
├── 🔗 WebSocket Client
└── 💬 Answer Input
```

### Technology Stack

- **Frontend**: SwiftUI, Combine
- **Backend**: Supabase (real-time database)
- **Authentication**: Supabase Auth
- **Networking**: WebSockets (local), REST API
- **Casting**: AirPlay
- **AI Integration**: MCP (Model Context Protocol)

## 🚀 Getting Started

### Prerequisites

- Xcode 15.0+
- iOS 17.0+
- Swift 5.9+
- Active Supabase project (optional but recommended)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/bendiknordeng/glass.git
   cd glass
   ```

2. **Install dependencies**
   ```bash
   swift package update
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your service credentials:
   ```bash
   # Supabase (Required)
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   
   # Debug mode
   DEBUG_MODE=true
   ```

4. **Open in Xcode**
   ```bash
   open Package.swift
   ```

5. **Build and Run**
   - Select your target device
   - Press `Cmd+R` to build and run

## 🎯 Usage

### Hosting a Game

1. **Launch the app** and sign in
2. **Tap "Host Game"** from the main menu
3. **Configure settings**:
   - Game mode (Classic, Party, Family)
   - Max players (2-16)
   - Time per challenge
   - Challenge types
4. **Start hosting** - A QR code appears
5. **Cast to TV** using AirPlay
6. **Wait for players** to join
7. **Start the game** when ready

### Joining a Game

1. **Launch the app** and sign in
2. **Tap "Join Game"**
3. **Enter your name**
4. **Scan QR code** or enter the 4-letter game code
5. **Wait for host** to start the game
6. **Use your phone** as a controller

### Game Modes

- **Classic**: Traditional quiz and trivia
- **Party**: Adult-oriented fun with drinking challenges
- **Family**: Kid-friendly content
- **Custom**: Create your own challenge mix

## 🛠️ Development

### Project Structure

```
glass/
├── Core/                    # App foundation
│   ├── AppState.swift      # Global app state
│   └── RootView.swift      # Main navigation
├── Models/                  # Data structures
│   ├── User.swift          # User management
│   ├── Player.swift        # Game participants
│   ├── Challenge.swift     # Game challenges
│   ├── GameSession.swift   # Game state
│   └── GameMessage.swift   # WebSocket messages
├── Views/                   # SwiftUI views
│   ├── Authentication/     # Login/signup
│   ├── Host/              # Host-specific UI
│   ├── Player/            # Player-specific UI
│   └── Shared/            # Common components
├── Services/              # Business logic
│   ├── Authentication/    # User auth
│   ├── GameEngine/       # Game logic
│   ├── WebSocket/        # Networking
│   ├── Casting/          # TV integration
│   ├── Supabase/         # Database
│   └── MCP/              # AI integration
└── Utilities/            # Helper functions
```

### MCP Integration

Glass includes built-in MCP (Model Context Protocol) support for AI-assisted development:

```yaml
# .mcp/config.yaml
services:
  supabase:
    type: database
    provider: supabase
  
tools:
  - name: game-generator
    description: Generate challenges with AI
  - name: code-assistant
    description: Swift development help
```

**Available MCP Tools:**
- **Challenge Generator**: AI-powered challenge creation
- **Code Assistant**: Swift development support
- **Analytics**: Game metrics and insights
- **Supabase Sync**: Database operations

### Adding Custom Challenges

```swift
let customChallenge = Challenge(
    type: .quiz,
    title: "My Custom Quiz",
    content: .quiz(.init(
        question: "What's the answer?",
        options: ["A", "B", "C", "D"],
        correctAnswer: 2,
        explanation: "C is correct because..."
    ))
)

// Use MCP to generate challenges
let mcpCommand = MCPCommand(
    service: "game-generator",
    method: "generateChallenge",
    parameters: [
        "type": "quiz",
        "difficulty": "medium",
        "theme": "space"
    ]
)
```

## 🧪 Testing

### Run Tests
```bash
swift test
```

### Manual Testing Checklist

- [ ] Host can create and start a game
- [ ] Players can join via QR code
- [ ] WebSocket communication works
- [ ] Challenges display correctly
- [ ] Scoring system functions
- [ ] TV casting works (Chromecast/AirPlay)
- [ ] Game ends properly
- [ ] Authentication flows work

## 📱 Deployment

### TestFlight Beta

1. **Archive the app** in Xcode
2. **Upload to App Store Connect**
3. **Create TestFlight build**
4. **Invite beta testers**

### App Store Release

1. **Complete App Store metadata**
2. **Submit for review**
3. **Monitor approval status**
4. **Release to production**

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Add tests** if applicable
5. **Commit your changes**
   ```bash
   git commit -m "Add amazing feature"
   ```
6. **Push to your branch**
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open a Pull Request**

### Development Guidelines

- Follow Swift style conventions
- Write clear commit messages
- Add documentation for new features
- Test on multiple devices
- Use MCP tools for AI assistance

## 🐛 Troubleshooting

### Common Issues

**WebSocket Connection Failed**
- Ensure devices are on the same WiFi network
- Check firewall settings
- Verify port 8080 is available

**Chromecast Not Found**
- Use AirPlay instead for TV casting
- Ensure TV and device are on same network

**Supabase Connection Issues**
- Verify SUPABASE_URL and SUPABASE_ANON_KEY
- Check project settings in Supabase dashboard
- Ensure real-time is enabled

**MCP Tools Not Working**
- Check .mcp/config.yaml syntax
- Verify service credentials
- Restart VS Code if needed

### Debug Mode

Enable debug logging by setting:
```bash
DEBUG_MODE=true
```

## 📋 Roadmap

### Version 1.1
- [ ] Voice challenges
- [ ] Photo challenges
- [ ] Team mode
- [ ] Tournament brackets

### Version 1.2
- [ ] AR challenges
- [ ] Music integration
- [ ] Global leaderboards
- [ ] Challenge marketplace

### Version 2.0
- [ ] Cross-platform support
- [ ] Cloud game saves
- [ ] Streaming integration
- [ ] VR support

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

- **Email**: support@glass-game.com
- **GitHub Issues**: [Report a bug](https://github.com/bendiknordeng/glass/issues)
- **Discord**: [Join our community](https://discord.gg/glass-game)

## 🙏 Acknowledgments

- **Supabase** for real-time database
- **Google Cast** for TV integration
- **MCP Community** for AI development tools
- **SwiftUI** for beautiful interfaces

---

**Made with ❤️ for party lovers everywhere**

*Glass - Where every phone becomes a controller and every TV becomes a gaming console.*