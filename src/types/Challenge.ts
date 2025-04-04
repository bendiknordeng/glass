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
    maxReuseCount?: number;    // Maximum number of times this challenge can be reused if canReuse is true
    points: number;            // Points awarded for completing the challenge
    category?: string;         // Optional category for grouping challenges
    customPrompt?: string;     // Optional custom prompt for dynamic challenges
    punishment?: Punishment;   // Optional punishment for failing the challenge
    isPrebuilt?: boolean;      // Indicates if this is a prebuilt challenge
    prebuiltType?: PrebuiltChallengeType; // Type of prebuilt challenge
    prebuiltSettings?: PrebuiltChallengeSettings; // Settings for prebuilt challenge
    isSelected?: boolean;      // Whether this challenge is currently selected in the game
    createdBy?: string;        // User ID of the creator of this challenge
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
    participantScores?: Record<string, number>; // Maps participant ID to their score (for quiz challenges)
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
    QUIZ = 'quiz', // Custom quiz challenge
    // Add more prebuilt challenge types here as they are developed
  }

  /**
   * Settings for prebuilt challenges
   */
  export type PrebuiltChallengeSettings = SpotifyMusicQuizSettings | QuizSettings | Record<string, unknown>;

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
    lastFetchTimestamp?: number; // Timestamp of when songs were last fetched
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

  /**
   * Media item interface for questions and answers
   */
  export interface MediaItem {
    type: 'image';
    url: string;
    alt?: string;
  }

  /**
   * Quiz question interface
   */
  export interface QuizQuestion {
    id: string;
    text: string;
    images?: MediaItem[];
    options: QuizOption[];
    currentIndex?: number;
    isRevealed?: boolean;
    showOptions?: boolean;     // Whether to display multiple choice options or just a single answer
    points?: number;           // Points for this specific question, overrides challenge points
  }

  /**
   * Quiz answer option interface
   */
  export interface QuizOption {
    id: string;
    text: string;
    isCorrect: boolean;
    images?: MediaItem[];
  }

  /**
   * Settings for Quiz challenge
   */
  export interface QuizSettings {
    questions: QuizQuestion[];
    currentQuestionIndex?: number;
    questionPoints?: Record<string, string[]>; // Maps question ID to player/team IDs that got it right
    finalScores?: Record<string, number>; // Maps participant ID to their final score
  }