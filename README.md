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

- **User Authentication**:
  - Login with Google or Facebook
  - Email and password authentication
  - Store game progress across devices

- **Spotify Integration**:
  - Connect to Spotify for music-based challenges
  - Persistent Spotify connection for seamless experience

- **Playful Design**:
  - Fun animations and transitions
  - Pastel color scheme optimized for large screens
  - Responsive design for all devices

- **Player Management**:
  - Add player names and images
  - Track individual and team scores
  - View game statistics and results
  - Save recent players, challenges, and games

## Technical Stack

- React with TypeScript
- Vite for blazing-fast development and builds
- Tailwind CSS for styling
- Framer Motion for animations
- React Router for navigation
- i18next for internationalization
- Supabase for backend and authentication
- Spotify API integration for music features

## Getting Started

### Prerequisites

- Node.js (version 16 or later)
- npm or yarn
- Supabase account
- Spotify Developer account (for music features)

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

3. Set up environment variables:
   Create a `.env` file with the following variables:
   ```
   VITE_APP_ENV=dev
   
   # Spotify API Configuration
   VITE_SPOTIFY_CLIENT_ID=your-spotify-client-id
   VITE_SPOTIFY_REDIRECT_URI=http://localhost:5173/auth/spotify/callback
   VITE_SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
   
   # Supabase Configuration
   VITE_SUPABASE_URL=https://your-supabase-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   
   # OAuth Provider Redirect URIs
   VITE_PROVIDER_REDIRECT_URI=http://localhost:5173/auth/callback
   ```

4. Set up Supabase:
   - Create a new Supabase project
   - Enable Google and Facebook auth providers
   - Run the following SQL to create the required tables:

   ```sql
   -- Create users table
   CREATE TABLE users (
     id UUID REFERENCES auth.users PRIMARY KEY,
     email TEXT UNIQUE,
     display_name TEXT,
     avatar_url TEXT,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP WITH TIME ZONE,
     spotify_connected BOOLEAN DEFAULT FALSE,
     facebook_connected BOOLEAN DEFAULT FALSE,
     google_connected BOOLEAN DEFAULT FALSE
   );

   -- Create recent_players table
   CREATE TABLE recent_players (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     user_id UUID REFERENCES users(id) ON DELETE CASCADE,
     player_name TEXT NOT NULL,
     avatar_url TEXT,
     score INTEGER DEFAULT 0,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
   );

   -- Create recent_challenges table
   CREATE TABLE recent_challenges (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     user_id UUID REFERENCES users(id) ON DELETE CASCADE,
     challenge_id TEXT NOT NULL,
     challenge_name TEXT NOT NULL,
     difficulty TEXT NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
     metadata JSONB
   );

   -- Create recent_games table
   CREATE TABLE recent_games (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     user_id UUID REFERENCES users(id) ON DELETE CASCADE,
     game_mode TEXT NOT NULL,
     players TEXT[] NOT NULL,
     winner TEXT,
     score INTEGER DEFAULT 0,
     duration INTEGER DEFAULT 0,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
     challenge_id TEXT,
     tracks JSONB
   );

   -- Create spotify_auth table
   CREATE TABLE spotify_auth (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     user_id UUID REFERENCES users(id) ON DELETE CASCADE,
     access_token TEXT NOT NULL,
     refresh_token TEXT NOT NULL,
     expires_at BIGINT NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
   );

   -- Set up row level security
   ALTER TABLE users ENABLE ROW LEVEL SECURITY;
   ALTER TABLE recent_players ENABLE ROW LEVEL SECURITY;
   ALTER TABLE recent_challenges ENABLE ROW LEVEL SECURITY;
   ALTER TABLE recent_games ENABLE ROW LEVEL SECURITY;
   ALTER TABLE spotify_auth ENABLE ROW LEVEL SECURITY;

   -- Create policies
   CREATE POLICY "Users can view their own data" 
     ON users FOR SELECT USING (auth.uid() = id);
   
   CREATE POLICY "Users can update their own data" 
     ON users FOR UPDATE USING (auth.uid() = id);
   
   CREATE POLICY "Users can view only their recent players" 
     ON recent_players FOR SELECT USING (auth.uid() = user_id);
   
   CREATE POLICY "Users can insert their recent players" 
     ON recent_players FOR INSERT WITH CHECK (auth.uid() = user_id);
   
   CREATE POLICY "Users can view only their recent challenges" 
     ON recent_challenges FOR SELECT USING (auth.uid() = user_id);
   
   CREATE POLICY "Users can insert their recent challenges" 
     ON recent_challenges FOR INSERT WITH CHECK (auth.uid() = user_id);
   
   CREATE POLICY "Users can view only their recent games" 
     ON recent_games FOR SELECT USING (auth.uid() = user_id);
   
   CREATE POLICY "Users can insert their recent games" 
     ON recent_games FOR INSERT WITH CHECK (auth.uid() = user_id);
   
   CREATE POLICY "Users can view only their spotify auth" 
     ON spotify_auth FOR SELECT USING (auth.uid() = user_id);
   
   CREATE POLICY "Users can update only their spotify auth" 
     ON spotify_auth FOR UPDATE USING (auth.uid() = user_id);
   
   CREATE POLICY "Users can insert their spotify auth" 
     ON spotify_auth FOR INSERT WITH CHECK (auth.uid() = user_id);
   ```

5. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

6. Build for production:
   ```bash
   npm run build
   # or
   yarn build
   ```

## Usage

1. **Create an Account**: Sign up or log in with Google, Facebook, or email
2. **Start a New Game**: Begin by adding players with optional profile pictures
3. **Create Teams**: If playing in team mode, create and customize teams
4. **Configure Settings**: Set game duration and other options
5. **Connect Spotify**: Link your Spotify account for music challenges
6. **Add Custom Challenges**: Create your own challenges to mix with the standard ones
7. **Play**: Take turns completing challenges and earning points
8. **View Results**: See who won and game statistics when finished
9. **Check Profile**: View your recent games, players, and challenges

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