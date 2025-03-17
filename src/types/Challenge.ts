/**
 * Challenge type enum for different challenge formats
 */
export enum ChallengeType {
    INDIVIDUAL = 'individual', // Challenge for a single player
    ONE_ON_ONE = 'oneOnOne',   // Challenge between two players
    TEAM = 'team',             // Challenge between teams
    ALL_VS_ALL = 'allVsAll'    // Challenge where all players compete against each other
  }
  
  /**
   * Punishment type for failed challenges
   */
  export interface Punishment {
    type: 'sips' | 'custom';
    value: number; // Number of sips
    customDescription?: string; // Description for custom punishment
  }
  
  /**
   * Challenge interface representing a game challenge
   */
  export interface Challenge {
    id: string;
    title: string;             // Brief challenge title
    description: string;       // Detailed challenge description
    type: ChallengeType;       // Type of challenge
    canReuse: boolean;         // Whether this challenge can be reused in the same game
    points: number;            // Points awarded for completing the challenge
    category?: string;         // Optional category for grouping challenges
    customPrompt?: string;     // Optional custom prompt for dynamic challenges
    punishment?: Punishment;   // Optional punishment for failing the challenge
    isPrebuilt?: boolean;      // Indicates if this is a prebuilt challenge
    prebuiltType?: PrebuiltChallengeType; // Type of prebuilt challenge
    prebuiltSettings?: PrebuiltChallengeSettings; // Settings for prebuilt challenge
  }
  
  /**
   * Challenge result interface for tracking outcomes
   */
  export interface ChallengeResult {
    challengeId: string;
    completed: boolean;
    winnerId?: string;         // ID of player or team who won
    participantIds: string[];  // IDs of players or teams involved
    timestamp: number;
    punishment?: Punishment;   // Punishment applied for failed challenge
  }
  
  /**
   * Custom challenge input interface for user-created challenges
   */
  export interface CustomChallengeInput {
    title: string;
    description: string;
    type: ChallengeType;
    canReuse: boolean;
    difficulty?: 1 | 2 | 3;    // Difficulty level (deprecated)
    points: number;
    category?: string;
    punishment?: Punishment;
  }

  /**
   * Type of prebuilt challenge
   */
  export enum PrebuiltChallengeType {
    SPOTIFY_MUSIC_QUIZ = 'spotifyMusicQuiz',
    // Add more prebuilt challenge types here as they are developed
  }

  /**
   * Settings for prebuilt challenges
   */
  export type PrebuiltChallengeSettings = SpotifyMusicQuizSettings | Record<string, unknown>;

  /**
   * Settings for Spotify Music Quiz challenge
   */
  export interface SpotifyMusicQuizSettings {
    playlistUrl: string;       // Spotify playlist URL
    playlistName?: string;     // Name of the Spotify playlist
    playlistCoverUrl?: string;
    playlistDescription?: string;
    numberOfSongs: number;     // Number of songs to select from playlist
    playDurationSeconds: number; // Duration to play each song in seconds
    currentSongIndex?: number; // Current song being played
    selectedSongs?: SpotifySong[]; // Selected songs for the quiz
    songPoints?: Record<string, string>; // Maps song ID to player/team ID that won points
  }

  /**
   * Spotify song information
   */
  export interface SpotifySong {
    id: string;                // Spotify track ID
    name: string;              // Song name
    artist: string;            // Artist name
    previewUrl: string;        // 30-second preview URL
    albumArt: string;          // Album art URL
    isRevealed?: boolean;      // Whether the song has been revealed
    isPlaying?: boolean;       // Whether the song is currently playing
  }