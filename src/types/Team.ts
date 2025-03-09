/**
 * Team interface representing a group of players
 */
export interface Team {
    id: string;
    name: string;
    color: string; // CSS color value (e.g. pastel-blue)
    playerIds: string[]; // IDs of the players in this team
    score: number;
  }
  
  /**
   * Game mode enum for different play styles
   */
  export enum GameMode {
    FREE_FOR_ALL = 'freeForAll',
    TEAMS = 'teams'
  }
  
  /**
   * Game duration settings
   */
  export interface GameDuration {
    type: 'challenges' | 'time';
    value: number; // Number of challenges or minutes
  }