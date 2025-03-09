# Glass - Social Gathering Game

Glass is a web-based application designed for social gatherings, drinking games, and fun challenges. It's similar to the Norwegian app "Børst" but with additional features like team modes, custom challenges, and a sleek, customizable interface.

## Features

- **Multiple Game Modes**:
  - Free-for-all mode where every player competes individually
  - Team mode where players are grouped into teams
  - Flexible team creation with randomization options

- **Challenge Types**:
  - Individual challenges
  - One-on-one challenges
  - Team vs team challenges

- **Customizable Game Settings**:
  - Time-limited or challenge-limited games
  - Dark mode support
  - Multilingual (English and Norwegian)
  - Add custom challenges

- **Playful Design**:
  - Fun animations and transitions
  - Pastel color scheme optimized for large screens
  - Responsive design for all devices

- **Player Management**:
  - Add player names and images
  - Track individual and team scores
  - View game statistics and results

## Technical Stack

- React with TypeScript
- Vite for blazing-fast development and builds
- Tailwind CSS for styling
- Framer Motion for animations
- React Router for navigation
- i18next for internationalization
- Local Storage for game state persistence

## Getting Started

### Prerequisites

- Node.js (version 16 or later)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/glass.git
   cd glass
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn
   ```

3. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. Build for production:
   ```bash
   npm run build
   # or
   yarn build
   ```

## Usage

1. **Start a New Game**: Begin by adding players with optional profile pictures
2. **Create Teams**: If playing in team mode, create and customize teams
3. **Configure Settings**: Set game duration and other options
4. **Add Custom Challenges**: Create your own challenges to mix with the standard ones
5. **Play**: Take turns completing challenges and earning points
6. **View Results**: See who won and game statistics when finished

## Customization

### Adding Custom Challenges

Create your own challenges by:
1. Navigate to Game Settings during setup
2. Click "Create Custom Challenge"
3. Fill in challenge details and save

### Language Settings

Toggle between English and Norwegian:
- Click the language icon in the top right corner of the home screen

### Dark Mode

Toggle between light and dark mode:
- Click the theme icon in the top right corner of the home screen

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Inspired by the Norwegian app "Børst"
- Built with ❤️ for fun gatherings