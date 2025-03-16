import { GameMode, Team, GameDuration } from './Team';
import { Player } from './Player';
import { Challenge } from './Challenge';

export type GameAction =
  | { type: 'START_GAME' }
  | { type: 'END_GAME' }
  | { type: 'SET_GAME_MODE'; payload: GameMode }
  | { type: 'SET_GAME_DURATION'; payload: GameDuration }
  | { type: 'ADD_PLAYER'; payload: Player }
  | { type: 'REMOVE_PLAYER'; payload: string } // player ID
  | { type: 'CREATE_TEAMS'; payload: Team[] }
  | { type: 'RANDOMIZE_TEAMS' }
  | { type: 'LOAD_CHALLENGES'; payload: Challenge[] }
  | { type: 'ADD_CUSTOM_CHALLENGE'; payload: Challenge }
  | { type: 'REMOVE_CUSTOM_CHALLENGE'; payload: string } // challenge ID
  | { type: 'UPDATE_CUSTOM_CHALLENGE'; payload: Challenge }
  | { type: 'SET_CURRENT_ROUND'; payload: number }
  | { type: 'SET_ROUND_TIMER'; payload: number }
  | { type: 'SET_CHALLENGE_COMPLETED'; payload: { challengeId: string; completed: boolean } }
  | { type: 'SET_CHALLENGE_WINNER'; payload: { challengeId: string; winnerId: string } }
  | { type: 'SET_CHALLENGE_POINTS'; payload: { challengeId: string; points: number } }
  | { type: 'UPDATE_CHALLENGE_PARTICIPANTS'; payload: { challengeId: string; participantIds: string[] } }
  | { type: 'UPDATE_PLAYER_SCORE'; payload: { playerId: string; points: number } }
  | { type: 'UPDATE_TEAM_SCORE'; payload: { teamId: string; points: number } }; 