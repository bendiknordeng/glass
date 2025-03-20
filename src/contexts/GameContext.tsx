import React, { createContext, useContext, useReducer, useEffect, useState, useCallback } from 'react';
import { Player } from '@/types/Player';
import { Team, GameMode, GameDuration } from '@/types/Team';
import { Challenge, ChallengeResult } from '@/types/Challenge';
import { generateId } from '@/utils/helpers';
import { challengesService } from '@/services/supabase';
import { useAuth } from '@/contexts/AuthContext'; // Assuming you have an auth context

// Define the state shape
export interface GameState {
  gameStarted: boolean;
  gameFinished: boolean;
  gameMode: GameMode;
  gameDuration: GameDuration;
  currentRound: number;
  currentTurnIndex: number;
  players: Player[];
  teams: Team[];
  challenges: Challenge[];
  usedChallenges: string[]; // IDs of challenges that have been used
  results: ChallengeResult[];
  customChallenges: Challenge[]; // User-created challenges
  currentChallenge: Challenge | null;
  currentChallengeParticipants: string[]; // IDs of players or teams participating
  isLoadingChallenges: boolean;
  challengeLoadError: string | null;
}

// Define initial state
const initialState: GameState = {
  gameStarted: false,
  gameFinished: false,
  gameMode: GameMode.FREE_FOR_ALL,
  gameDuration: { type: 'challenges', value: 20 },
  currentRound: 0,
  currentTurnIndex: 0,
  players: [],
  teams: [],
  challenges: [],
  usedChallenges: [],
  results: [],
  customChallenges: [],
  currentChallenge: null,
  currentChallengeParticipants: [],
  isLoadingChallenges: false,
  challengeLoadError: null
};

// Define action types
type GameAction =
  | { type: 'START_GAME' }
  | { type: 'END_GAME' }
  | { type: 'SET_GAME_MODE'; payload: GameMode }
  | { type: 'SET_GAME_DURATION'; payload: GameDuration }
  | { type: 'ADD_PLAYER'; payload: Omit<Player, 'score'> }
  | { type: 'REMOVE_PLAYER'; payload: string }
  | { type: 'CREATE_TEAMS'; payload: { numTeams: number; teamNames: string[] } }
  | { type: 'RANDOMIZE_TEAMS' }
  | { type: 'LOAD_CHALLENGES'; payload: Challenge[] }
  | { type: 'SET_CHALLENGES_LOADING'; payload: boolean }
  | { type: 'SET_CHALLENGES_ERROR'; payload: string | null }
  | { type: 'ADD_CUSTOM_CHALLENGE'; payload: Omit<Challenge, 'id'> }
  | { type: 'UPDATE_CUSTOM_CHALLENGE'; payload: Challenge }
  | { type: 'REMOVE_CUSTOM_CHALLENGE'; payload: string }
  | { type: 'NEXT_TURN' }
  | { type: 'SELECT_CHALLENGE'; payload: Challenge }
  | { type: 'RECORD_CHALLENGE_RESULT'; payload: Omit<ChallengeResult, 'timestamp'> }
  | { type: 'RESET_GAME' }
  | { type: 'REMOVE_PLAYER_FROM_TEAM'; payload: { teamId: string; playerId: string } }
  | { type: 'ADD_PLAYER_TO_TEAM'; payload: { teamId: string; playerId: string } }
  | { type: 'SAVE_TEAMS_STATE'; payload: Team[] }
  | { type: 'RESTORE_GAME_STATE'; payload: GameState }
  | { type: 'UPDATE_CHALLENGE_PARTICIPANTS'; payload: { challengeId: string; participantIds: string[] } }
  | { type: 'UPDATE_PLAYER_SCORE'; payload: { playerId: string; points: number } }
  | { type: 'UPDATE_TEAM_SCORE'; payload: { teamId: string; points: number } }
  | { type: 'UPDATE_PLAYER_DETAILS'; payload: Partial<Player> };

// Create reducer function
const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'START_GAME':
      return {
        ...state,
        gameStarted: true,
        currentRound: 1,
        currentTurnIndex: 0,
        usedChallenges: [],
        results: [],
      };

    case 'END_GAME':
      return {
        ...state,
        gameFinished: true,
      };

    case 'SET_GAME_MODE':
      return {
        ...state,
        gameMode: action.payload,
        // Reset teams if switching to FREE_FOR_ALL
        teams: action.payload === GameMode.FREE_FOR_ALL ? [] : state.teams,
      };

    case 'SET_GAME_DURATION':
      return {
        ...state,
        gameDuration: action.payload,
      };

    case 'ADD_PLAYER': {
      const newPlayer: Player = {
        id: action.payload.id || generateId(),
        name: action.payload.name,
        image: action.payload.image,
        score: 0,
      };
      return {
        ...state,
        players: [...state.players, newPlayer],
      };
    }

    case 'REMOVE_PLAYER':
      return {
        ...state,
        players: state.players.filter((player) => player.id !== action.payload),
        teams: state.teams.map((team) => ({
          ...team,
          playerIds: team.playerIds.filter((id) => id !== action.payload),
        })),
      };

    case 'LOAD_CHALLENGES':
      // Only update if we're loading challenges and don't already have them
      return {
        ...state,
        challenges: [...action.payload],
        isLoadingChallenges: false
      };
      
    case 'SET_CHALLENGES_LOADING':
      return {
        ...state,
        isLoadingChallenges: action.payload
      };
      
    case 'SET_CHALLENGES_ERROR':
      return {
        ...state,
        challengeLoadError: action.payload,
        isLoadingChallenges: false
      };

    case 'CREATE_TEAMS': {
      const { numTeams, teamNames } = action.payload;
      const playerIds = state.players.map((player) => player.id);
      
      // Create teams with provided names
      const teams: Team[] = Array.from({ length: numTeams }, (_, i) => ({
        id: generateId(),
        name: teamNames[i] || `Team ${i + 1}`,
        color: getTeamColor(i),
        playerIds: [],
        score: 0,
      }));

      // Assign players to teams evenly
      playerIds.forEach((playerId, index) => {
        const teamIndex = index % numTeams;
        teams[teamIndex].playerIds.push(playerId);
      });

      // Update players with their team IDs
      const updatedPlayers = state.players.map((player) => {
        const team = teams.find((t) => t.playerIds.includes(player.id));
        return {
          ...player,
          teamId: team?.id,
        };
      });

      return {
        ...state,
        teams,
        players: updatedPlayers,
      };
    }

    case 'RANDOMIZE_TEAMS': {
      const playerIds = [...state.players.map((player) => player.id)];
      const shuffledPlayerIds = shuffleArray(playerIds);
      
      // Redistribute players among existing teams
      const updatedTeams = state.teams.map((team, index) => {
        const teamSize = Math.floor(shuffledPlayerIds.length / state.teams.length);
        const extraPlayer = index < shuffledPlayerIds.length % state.teams.length ? 1 : 0;
        const start = index * teamSize + Math.min(index, shuffledPlayerIds.length % state.teams.length);
        const end = start + teamSize + extraPlayer;
        
        return {
          ...team,
          playerIds: shuffledPlayerIds.slice(start, end),
        };
      });

      // Update players with their new team IDs
      const updatedPlayers = state.players.map((player) => {
        const team = updatedTeams.find((t) => t.playerIds.includes(player.id));
        return {
          ...player,
          teamId: team?.id,
        };
      });

      return {
        ...state,
        teams: updatedTeams,
        players: updatedPlayers,
      };
    }

    case 'ADD_CUSTOM_CHALLENGE': {
      const newChallenge: Challenge = {
        ...action.payload,
        id: generateId(),
      };
      return {
        ...state,
        customChallenges: [...state.customChallenges, newChallenge],
      };
    }

    case 'UPDATE_CUSTOM_CHALLENGE': {
      return {
        ...state,
        customChallenges: state.customChallenges.map(challenge =>
          challenge.id === action.payload.id ? action.payload : challenge
        ),
      };
    }

    case 'REMOVE_CUSTOM_CHALLENGE':
      return {
        ...state,
        customChallenges: state.customChallenges.filter(
          (challenge) => challenge.id !== action.payload
        ),
      };

    case 'NEXT_TURN': {
      // The current challenge determines whose turn is next
      const prevChallenge = state.currentChallenge;
      let nextTurnIndex = state.currentTurnIndex;
      let nextRound = state.currentRound;
      
      // Only advance the turn if it was an individual challenge
      // For team and one-on-one challenges, keep the same team's turn
      if (!prevChallenge || prevChallenge.type === 'individual') {
        nextTurnIndex = state.currentTurnIndex + 1;
        
        // If using teams, cycle through teams
        if (state.gameMode === GameMode.TEAMS) {
          if (nextTurnIndex >= state.teams.length) {
            nextTurnIndex = 0;
            nextRound += 1;
          }
        } else {
          // If free-for-all, cycle through players
          if (nextTurnIndex >= state.players.length) {
            nextTurnIndex = 0;
            nextRound += 1;
          }
        }
      }
      
      // Check if game should end based on rounds/challenges
      const shouldEndGame = 
        (state.gameDuration.type === 'challenges' && 
         state.results.length >= state.gameDuration.value) ||
        (state.gameDuration.type === 'time' && 
         /* Time check will be handled by a separate timer component */
         false);
      
      return {
        ...state,
        currentTurnIndex: nextTurnIndex,
        currentRound: nextRound,
        gameFinished: shouldEndGame,
      };
    }

    case 'SELECT_CHALLENGE': {
      const challenge = action.payload;
      let participants: string[] = [];
      
      // Get current participant ID before determining participants
      const currentId = getCurrentParticipantId(state);
      if (!currentId) {
        console.error('No current participant ID found');
        return state;
      }
      
      // Determine participants based on challenge type
      if (challenge.type === 'individual') {
        // Current player/team only
        participants = [currentId];
      } else if (challenge.type === 'oneOnOne') {
        if (state.gameMode === GameMode.TEAMS) {
          // In team mode, one-on-one is between all teams - each team selects a player
          participants = state.teams.map(team => team.id);
          
          // Ensure we have at least two teams
          if (participants.length < 2) {
            console.error('Not enough teams for one-on-one challenge');
            return state;
          }
        } else {
          // In free-for-all, select the current player plus a different opponent each time
          const otherIds = getAllParticipantIds(state).filter(id => id !== currentId);
          
          if (otherIds.length > 0) {
            let randomOpponentId;
            
            // If we have only one other player, just use them
            if (otherIds.length === 1) {
              randomOpponentId = otherIds[0];
            } 
            // For multiple players, use a strict rotation to guarantee different opponents
            else {
              // Sort the IDs to ensure consistent order
              const sortedIds = [...otherIds].sort();
              
              // Find the index of the last selected opponent, or -1 if no history
              let lastIndex = -1;
              
              // Get the last challenge result where this player was involved
              const lastOneOnOneResult = [...state.results]
                .reverse()
                .find(r => 
                  r.challengeId && 
                  state.challenges.find(c => c.id === r.challengeId)?.type === 'oneOnOne' &&
                  r.participantIds && r.participantIds.includes(currentId)
                );
                
              if (lastOneOnOneResult) {
                // Find the opponent ID from the last challenge
                const lastOpponentId = lastOneOnOneResult.participantIds?.find(id => id !== currentId);
                if (lastOpponentId) {
                  lastIndex = sortedIds.indexOf(lastOpponentId);
                }
              }
              
              // Select the next opponent in the rotation
              const nextIndex = (lastIndex + 1) % sortedIds.length;
              randomOpponentId = sortedIds[nextIndex];
            }
            
            participants = [currentId, randomOpponentId];
          } else {
            // Fallback if there are no other players
            console.error('Not enough players for one-on-one challenge');
            return state;
          }
        }
      } else if (challenge.type === 'team') {
        if (state.gameMode === GameMode.TEAMS) {
          // In team mode, all teams participate in team challenges
          participants = state.teams.map(team => team.id);
        } else {
          // In free-for-all, just use the current player (they play for their "team")
          participants = [currentId];
        }
      } else if (challenge.type === 'allVsAll') {
        if (state.gameMode === GameMode.TEAMS) {
          // In team mode, all teams participate in all vs all challenges
          participants = state.teams.map(team => team.id);
          
          // Also include all player IDs to allow individual selection
          const playerIds = state.teams.flatMap(team => team.playerIds);
          if (playerIds.length > 0) {
            participants = [...participants, ...playerIds];
          }
        } else {
          // In free-for-all, all players participate
          participants = state.players.map(player => player.id);
        }
      }
      
      return {
        ...state,
        currentChallenge: challenge,
        currentChallengeParticipants: participants,
        usedChallenges: [...state.usedChallenges, challenge.id]
      };
    }

    case 'RECORD_CHALLENGE_RESULT': {
      const result: ChallengeResult = {
        ...action.payload,
        timestamp: Date.now(),
      };
      
      // Update scores based on the result
      let updatedPlayers = [...state.players];
      let updatedTeams = [...state.teams];
      
      if (result.completed && result.winnerId) {
        if (state.gameMode === GameMode.TEAMS) {
          // Update team score
          updatedTeams = updatedTeams.map(team => 
            team.id === result.winnerId
              ? { ...team, score: team.score + (state.currentChallenge?.points || 0) }
              : team
          );
          
          // Update player scores within the winning team
          const winningTeam = updatedTeams.find(team => team.id === result.winnerId);
          if (winningTeam) {
            updatedPlayers = updatedPlayers.map(player => 
              winningTeam.playerIds.includes(player.id)
                ? { ...player, score: player.score + (state.currentChallenge?.points || 0) }
                : player
            );
          }
        } else {
          // Update individual player score
          updatedPlayers = updatedPlayers.map(player => 
            player.id === result.winnerId
              ? { ...player, score: player.score + (state.currentChallenge?.points || 0) }
              : player
          );
        }
      }
      
      return {
        ...state,
        players: updatedPlayers,
        teams: updatedTeams,
        results: [...state.results, result],
        currentChallenge: null,
        currentChallengeParticipants: [],
      };
    }

    case 'REMOVE_PLAYER_FROM_TEAM': {
      const { teamId, playerId } = action.payload;
      return {
        ...state,
        teams: state.teams.map(team => 
          team.id === teamId
            ? { ...team, playerIds: team.playerIds.filter(id => id !== playerId) }
            : team
        ),
        players: state.players.map(player =>
          player.id === playerId
            ? { ...player, teamId: undefined }
            : player
        )
      };
    }

    case 'ADD_PLAYER_TO_TEAM': {
      const { teamId, playerId } = action.payload;
      // First remove player from any existing team
      const teamsWithoutPlayer = state.teams.map(team => ({
        ...team,
        playerIds: team.playerIds.filter(id => id !== playerId)
      }));
      
      return {
        ...state,
        teams: teamsWithoutPlayer.map(team =>
          team.id === teamId
            ? { ...team, playerIds: [...team.playerIds, playerId] }
            : team
        ),
        players: state.players.map(player =>
          player.id === playerId
            ? { ...player, teamId }
            : player
        )
      };
    }

    case 'RESET_GAME':
      return {
        ...initialState,
        customChallenges: state.customChallenges, // Preserve custom challenges
        challenges: state.challenges, // Preserve loaded challenges
      };

    case 'SAVE_TEAMS_STATE':
      return {
        ...state,
        teams: action.payload
      };

    case 'RESTORE_GAME_STATE': {
      const { gameStarted, gameFinished, gameMode, gameDuration, currentRound, currentTurnIndex, players, teams, challenges, usedChallenges, results, customChallenges, currentChallenge, currentChallengeParticipants } = action.payload;
      return {
        ...state,
        gameStarted,
        gameFinished,
        gameMode,
        gameDuration,
        currentRound,
        currentTurnIndex,
        players: players.map(p => ({ ...p })),
        teams: teams.map(t => ({ ...t })),
        challenges: challenges.map(c => ({ ...c })),
        usedChallenges,
        results: results.map(r => ({ ...r })),
        customChallenges: customChallenges.map(c => ({ ...c })),
        currentChallenge: currentChallenge ? { ...currentChallenge } : null,
        currentChallengeParticipants,
        isLoadingChallenges: false,
        challengeLoadError: null
      };
    }

    case 'UPDATE_CHALLENGE_PARTICIPANTS':
      return {
        ...state,
        customChallenges: state.customChallenges.map(c => 
          c.id === action.payload.challengeId 
            ? { ...c, participantIds: action.payload.participantIds } 
            : c
        )
      };
      
    case 'UPDATE_PLAYER_SCORE':
      return {
        ...state,
        players: state.players.map(player => 
          player.id === action.payload.playerId 
            ? { ...player, score: player.score + action.payload.points } 
            : player
        )
      };
      
    case 'UPDATE_TEAM_SCORE':
      return {
        ...state,
        teams: state.teams.map(team => 
          team.id === action.payload.teamId 
            ? { ...team, score: team.score + action.payload.points } 
            : team
        )
      };

    case 'UPDATE_PLAYER_DETAILS':
      return {
        ...state,
        players: state.players.map(player =>
          player.id === action.payload.id
            ? { ...player, ...action.payload }
            : player
        )
      };

    default:
      return state;
  }
};

// Helper functions
const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const getTeamColor = (index: number): string => {
  const colors = [
    'pastel-blue',
    'pastel-pink',
    'pastel-yellow',
    'pastel-green',
    'pastel-purple',
    'pastel-orange',
  ];
  return colors[index % colors.length];
};

const getCurrentParticipantId = (state: GameState): string => {
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

const getAllParticipantIds = (state: GameState): string[] => {
  if (state.gameMode === GameMode.TEAMS) {
    return state.teams.map(team => team.id);
  }
  return state.players.map(player => player.id);
};

// Additional helper function for converting DB challenges to app format
const dbChallengeToAppChallenge = (dbChallenge: any): Challenge => {
  return {
    id: dbChallenge.id,
    title: dbChallenge.title,
    description: dbChallenge.description,
    type: dbChallenge.type,
    points: dbChallenge.points,
    canReuse: dbChallenge.can_reuse,
    category: dbChallenge.category || undefined,
    isPrebuilt: dbChallenge.is_prebuilt,
    prebuiltType: dbChallenge.prebuilt_type || undefined,
    prebuiltSettings: dbChallenge.prebuilt_settings || undefined,
    punishment: dbChallenge.punishment || undefined
  };
};

// Create context
interface GameContextType {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  loadChallenges: () => Promise<void>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

// Create provider
export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const { user, isAuthenticated } = useAuth();
  
  const loadChallenges = async () => {
    if (state.isLoadingChallenges) {
      return;
    }

    // Set loading state
    dispatch({ type: 'SET_CHALLENGES_LOADING', payload: true });
    dispatch({ type: 'SET_CHALLENGES_ERROR', payload: null });
    
    // Set a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      dispatch({ type: 'SET_CHALLENGES_LOADING', payload: false });
      dispatch({ 
        type: 'SET_CHALLENGES_ERROR', 
        payload: 'Timeout while loading challenges. Please try again.' 
      });
    }, 8000); // 8 seconds timeout
    
    try {
      let challenges: Challenge[] = [];
      
      // Load from Supabase if authenticated
      if (isAuthenticated && user) {
        try {
          // Make sure we're passing the user ID to filter only this user's challenges
          const dbChallenges = await challengesService.getChallenges(user.id);
          
          challenges = dbChallenges.map(dbChallengeToAppChallenge);
        } catch (error) {
          console.error('Error loading challenges from Supabase:', error);
          dispatch({ 
            type: 'SET_CHALLENGES_ERROR', 
            payload: 'Failed to load challenges from the database. Falling back to local storage.' 
          });
          
          // Fall back to localStorage
          const storedChallenges = localStorage.getItem('customChallenges');
          if (storedChallenges) {
            challenges = JSON.parse(storedChallenges);
          }
        }
      } else {
        // Not authenticated, load from localStorage
        const storedChallenges = localStorage.getItem('customChallenges');
        if (storedChallenges) {
          challenges = JSON.parse(storedChallenges);
        }
      }
      
      dispatch({ type: 'LOAD_CHALLENGES', payload: challenges });
    } catch (error) {
      console.error('Error in loadChallenges:', error);
      dispatch({ 
        type: 'SET_CHALLENGES_ERROR', 
        payload: 'An unexpected error occurred while loading challenges.' 
      });
    } finally {
      clearTimeout(loadingTimeout);
      dispatch({ type: 'SET_CHALLENGES_LOADING', payload: false });
    }
  };

  // Load game state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('glassGameState');
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState) as GameState;
        
        // Restore the complete game state at once
        if (parsedState.gameStarted && !parsedState.gameFinished) {
          // Only restore if there's an active game
          dispatch({ 
            type: 'RESTORE_GAME_STATE', 
            payload: {
              ...parsedState,
              // Ensure we keep the same references for complex objects
              players: parsedState.players.map(p => ({ ...p })),
              teams: parsedState.teams.map(t => ({ ...t })),
              challenges: parsedState.challenges.map(c => ({ ...c })),
              customChallenges: parsedState.customChallenges.map(c => ({ ...c })),
              results: parsedState.results.map(r => ({ ...r })),
              currentChallenge: parsedState.currentChallenge ? { ...parsedState.currentChallenge } : null,
              currentChallengeParticipants: [...parsedState.currentChallengeParticipants],
              isLoadingChallenges: false,
              challengeLoadError: null
            }
          });
        }
      } catch (error) {
        console.error('Error restoring game state:', error);
      }
    }
    
    // Load challenges on mount
    loadChallenges();
  }, [isAuthenticated]);

  // Save game state to localStorage whenever it changes
  useEffect(() => {
    // Only save if we have an active game
    if (state.gameStarted && !state.gameFinished) {
      localStorage.setItem('glassGameState', JSON.stringify(state));
    } else if (state.gameFinished) {
      // Clear saved state when game is finished
      localStorage.removeItem('glassGameState');
    }
  }, [state]);

  return (
    <GameContext.Provider value={{ state, dispatch, loadChallenges }}>
      {children}
    </GameContext.Provider>
  );
};

// Create custom hook for using the context
export const useGame = (): GameContextType => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};