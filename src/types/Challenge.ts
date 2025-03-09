/**
 * Challenge type enum for different challenge formats
 */
export enum ChallengeType {
    INDIVIDUAL = 'individual', // Challenge for a single player
    ONE_ON_ONE = 'oneOnOne',   // Challenge between two players
    TEAM = 'team'              // Challenge between teams
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
    difficulty: 1 | 2 | 3;     // Difficulty level: 1 (easy), 2 (medium), 3 (hard)
    points: number;            // Points awarded for completing the challenge
    category?: string;         // Optional category for grouping challenges
    customPrompt?: string;     // Optional custom prompt for dynamic challenges
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
  }
  
  /**
   * Custom challenge input interface for user-created challenges
   */
  export interface CustomChallengeInput {
    title: string;
    description: string;
    type: ChallengeType;
    canReuse: boolean;
    difficulty: 1 | 2 | 3;
    points: number;
    category?: string;
  }