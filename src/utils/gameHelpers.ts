import { GameState } from '@/contexts/GameContext';
import { GameMode } from '@/types/Team';

export const getCurrentParticipantId = (state: GameState): string => {
  if (state.gameMode === GameMode.TEAMS) {
    // Check if teams exist
    if (state.teams.length === 0) {
      console.error('No teams found in team mode');
      return '';
    }
    
    // Check if currentTurnIndex is valid
    if (state.currentTurnIndex >= state.teams.length) {
      console.error(`Invalid currentTurnIndex (${state.currentTurnIndex}) for teams length (${state.teams.length})`);
      // Fallback to the first team
      return state.teams[0]?.id || '';
    }
    
    // Get the team ID
    const teamId = state.teams[state.currentTurnIndex]?.id;
    if (!teamId) {
      console.error(`No team found at index ${state.currentTurnIndex}`);
      return state.teams[0]?.id || '';
    }
    
    return teamId;
  }
  
  // Free-for-all mode
  if (state.players.length === 0) {
    console.error('No players found in free-for-all mode');
    return '';
  }
  
  // Check if currentTurnIndex is valid
  if (state.currentTurnIndex >= state.players.length) {
    console.error(`Invalid currentTurnIndex (${state.currentTurnIndex}) for players length (${state.players.length})`);
    // Fallback to the first player
    return state.players[0]?.id || '';
  }
  
  return state.players[state.currentTurnIndex]?.id || '';
}; 