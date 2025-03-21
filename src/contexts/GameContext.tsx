import React, { createContext, useContext, useReducer, useEffect, useState, useCallback } from 'react';
import { Player } from '@/types/Player';
import { Team, GameMode, GameDuration } from '@/types/Team';
import { Challenge, ChallengeResult, PrebuiltChallengeType, SpotifyMusicQuizSettings, SpotifySong } from '../types/Challenge';
import { generateId } from '@/utils/helpers';
import { getAvatarByName } from '@/utils/avatarUtils';
import { challengesService, playersService } from '@/services/supabase';
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
  | { type: 'REMOVE_ALL_PLAYERS' }
  | { type: 'CREATE_TEAMS'; payload: { numTeams: number; teamNames: string[] } }
  | { type: 'RANDOMIZE_TEAMS' }
  | { type: 'LOAD_CHALLENGES'; payload: Challenge[] }
  | { type: 'SET_CHALLENGES_LOADING'; payload: boolean }
  | { type: 'SET_CHALLENGES_ERROR'; payload: string | null }
  | { type: 'ADD_CUSTOM_CHALLENGE'; payload: Challenge }
  | { type: 'ADD_STANDARD_CHALLENGE'; payload: Challenge }
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

    case 'REMOVE_ALL_PLAYERS':
      return {
        ...state,
        players: [],
        teams: state.teams.map(team => ({ ...team, playerIds: [] })),
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
      console.log("GameContext: ADD_CUSTOM_CHALLENGE received payload:", action.payload);
      const newChallenge: Challenge = {
        ...action.payload,
        // Only generate a new ID if one isn't provided in the payload
        id: action.payload.id || generateId(),
      };
      console.log("GameContext: Adding challenge with ID:", newChallenge.id);
      return {
        ...state,
        customChallenges: [...state.customChallenges, newChallenge],
      };
    }

    case 'UPDATE_CUSTOM_CHALLENGE': {
      console.log("GameContext: UPDATE_CUSTOM_CHALLENGE received payload:", action.payload);
      return {
        ...state,
        customChallenges: state.customChallenges.map(challenge => {
          if (challenge.id === action.payload.id) {
            console.log("GameContext: Updating challenge with ID:", challenge.id);
            return action.payload;
          }
          return challenge;
        }),
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
      // Ensure all prebuilt properties are preserved
      const challengeWithPreservedProps = {
        ...action.payload,
        isPrebuilt: action.payload.isPrebuilt,
        prebuiltType: action.payload.prebuiltType,
        prebuiltSettings: action.payload.prebuiltSettings,
      };
      
      // Log the selected challenge for debugging
      console.log('GameContext: SELECT_CHALLENGE with preserved properties:', {
        id: challengeWithPreservedProps.id,
        title: challengeWithPreservedProps.title,
        isPrebuilt: challengeWithPreservedProps.isPrebuilt,
        prebuiltType: challengeWithPreservedProps.prebuiltType,
        hasPrebuiltSettings: !!challengeWithPreservedProps.prebuiltSettings
      });
      
      let participants: string[] = [];
      
      // Get current participant ID before determining participants
      const currentId = getCurrentParticipantId(state);
      if (!currentId) {
        console.error('No current participant ID found');
        return state;
      }
      
      // Determine participants based on challenge type
      if (challengeWithPreservedProps.type === 'individual') {
        // Current player/team only
        participants = [currentId];
      } else if (challengeWithPreservedProps.type === 'oneOnOne') {
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
      } else if (challengeWithPreservedProps.type === 'team') {
        if (state.gameMode === GameMode.TEAMS) {
          // In team mode, all teams participate in team challenges
          participants = state.teams.map(team => team.id);
        } else {
          // In free-for-all, just use the current player (they play for their "team")
          participants = [currentId];
        }
      } else if (challengeWithPreservedProps.type === 'allVsAll') {
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
        currentChallenge: challengeWithPreservedProps,
        currentChallengeParticipants: participants,
        usedChallenges: [...state.usedChallenges, challengeWithPreservedProps.id]
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
      // Extract the challenges from the saved state
      const savedChallenges = action.payload.challenges || [];
      const savedCustomChallenges = action.payload.customChallenges || [];
      const savedCurrentChallenge = action.payload.currentChallenge;
      
      // Check for the unusual situation where we have custom challenges but no standard challenges
      if (savedCustomChallenges.length > 0 && savedChallenges.length === 0) {
        console.warn("Found custom challenges but no standard challenges in saved state");
      }

      // Process all challenges to ensure isPrebuilt property is explicitly set
      const processedChallenges = savedChallenges.map(challenge => {
        // If isPrebuilt is undefined, explicitly set it based on prebuiltType
        if (challenge.isPrebuilt === undefined) {
          return {
            ...challenge,
            isPrebuilt: !!challenge.prebuiltType,
            // Ensure other prebuilt properties are preserved
            prebuiltType: challenge.prebuiltType || undefined,
            prebuiltSettings: challenge.prebuiltSettings || undefined
          };
        }
        return challenge;
      });

      // Process all custom challenges to ensure isPrebuilt property is explicitly set
      const processedCustomChallenges = savedCustomChallenges.map(challenge => {
        // If isPrebuilt is undefined, explicitly set it based on prebuiltType
        if (challenge.isPrebuilt === undefined) {
          return {
            ...challenge,
            isPrebuilt: !!challenge.prebuiltType,
            // Ensure other prebuilt properties are preserved
            prebuiltType: challenge.prebuiltType || undefined,
            prebuiltSettings: challenge.prebuiltSettings || undefined
          };
        }
        return challenge;
      });

      // Process current challenge if it exists
      let processedCurrentChallenge = null;
      if (savedCurrentChallenge) {
        if (savedCurrentChallenge.isPrebuilt === undefined) {
          processedCurrentChallenge = {
            ...savedCurrentChallenge,
            isPrebuilt: !!savedCurrentChallenge.prebuiltType,
            // Ensure other prebuilt properties are preserved
            prebuiltType: savedCurrentChallenge.prebuiltType || undefined,
            prebuiltSettings: savedCurrentChallenge.prebuiltSettings || undefined
          };
        } else {
          processedCurrentChallenge = savedCurrentChallenge;
        }
      }

      // Migration: Move prebuilt challenges from custom to standard if needed
      let migratedStandardChallenges = [...processedChallenges];
      let migratedCustomChallenges = [...processedCustomChallenges];
      
      if (processedChallenges.length === 0 && processedCustomChallenges.some(c => c.isPrebuilt)) {
        console.log("Migrating prebuilt challenges from custom to standard challenges");
        
        // Filter out prebuilt challenges from custom challenges
        const prebuiltFromCustom = processedCustomChallenges.filter(c => c.isPrebuilt);
        migratedCustomChallenges = processedCustomChallenges.filter(c => !c.isPrebuilt);
        
        // Add them to standard challenges
        migratedStandardChallenges = [...prebuiltFromCustom];
        
        console.log(`Migrated ${prebuiltFromCustom.length} prebuilt challenges from custom to standard`);
      }

      // Log the restoration details for debugging
      console.log("Restoring game state with challenges:", {
        totalChallenges: migratedStandardChallenges.length + migratedCustomChallenges.length,
        standardChallengesCount: migratedStandardChallenges.length,
        customChallengesCount: migratedCustomChallenges.length,
        currentChallengeId: processedCurrentChallenge?.id,
        currentChallengeIsPrebuilt: processedCurrentChallenge?.isPrebuilt,
        currentChallengePrebuiltType: processedCurrentChallenge?.prebuiltType
      });

      return {
        ...action.payload,
        challenges: migratedStandardChallenges,
        customChallenges: migratedCustomChallenges,
        currentChallenge: processedCurrentChallenge
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

    case 'ADD_STANDARD_CHALLENGE': {
      // Create a new challenge with preserved properties
      // IMPORTANT: Don't generate a new ID, keep the original ID for standard challenges
      const newChallenge: Challenge = {
        ...action.payload,
        // Explicitly preserve prebuilt properties
        isPrebuilt: action.payload.isPrebuilt,
        prebuiltType: action.payload.prebuiltType,
        prebuiltSettings: action.payload.prebuiltSettings,
      };
      
      // Log if this is a prebuilt challenge
      if (newChallenge.isPrebuilt) {
        console.log('GameContext: Adding prebuilt standard challenge:', {
          id: newChallenge.id,
          title: newChallenge.title,
          isPrebuilt: newChallenge.isPrebuilt,
          prebuiltType: newChallenge.prebuiltType,
          hasSettings: !!newChallenge.prebuiltSettings
        });
      }
      
      return {
        ...state,
        challenges: [...state.challenges, newChallenge],
      };
    }

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
  
  // Module-level flags to prevent recursive calls
  let isLoadingChallengesInProgress = false;
  // Flag to track if we've already attempted game state restoration
  let hasAttemptedGameStateRestoration = false;
  
  const loadChallenges = async () => {
    // Skip if already loading or if the global flag is set
    if (state.isLoadingChallenges || isLoadingChallengesInProgress) {
      console.log('Skipping loadChallenges call - loading already in progress');
      return;
    }

    // Set both the state and our module-level flag
    isLoadingChallengesInProgress = true;
    dispatch({ type: 'SET_CHALLENGES_LOADING', payload: true });
    dispatch({ type: 'SET_CHALLENGES_ERROR', payload: null });
    
    // Set a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      dispatch({ type: 'SET_CHALLENGES_LOADING', payload: false });
      dispatch({ 
        type: 'SET_CHALLENGES_ERROR', 
        payload: 'Timeout while loading challenges. Please try again.' 
      });
      // Also clear our module-level flag
      isLoadingChallengesInProgress = false;
    }, 8000); // 8 seconds timeout
    
    try {
      // Check if we're continuing a game first
      const isContinuingGame = state.gameStarted && !state.gameFinished;
      
      // If we already have any challenges loaded (either standard or custom), don't reload
      if ((state.challenges && state.challenges.length > 0) || 
          (state.customChallenges && state.customChallenges.length > 0)) {
        console.log('Continuing game with existing challenges:', {
          standardChallengesCount: state.challenges.length,
          customChallengesCount: state.customChallenges.length,
          hasCurrentChallenge: !!state.currentChallenge
        });
        
        // Just make sure we're not loading anymore
        dispatch({ type: 'SET_CHALLENGES_LOADING', payload: false });
        isLoadingChallengesInProgress = false;
        return;
      }
      
      // If we're continuing a game but don't have challenges, try to load them from localStorage
      if (isContinuingGame) {
        console.log('Continuing game but need to load challenges');
        const savedState = localStorage.getItem('glassGameState');
        if (savedState) {
          try {
            const parsedState = JSON.parse(savedState) as GameState;
            
            // Log the content of the saved state for debugging
            console.log('Found savedState with challenges:', {
              standardChallenges: parsedState.challenges?.length || 0,
              customChallenges: parsedState.customChallenges?.length || 0,
              currentChallenge: parsedState.currentChallenge ? 'yes' : 'no'
            });
            
            if (parsedState.challenges && parsedState.challenges.length > 0) {
              console.log('Restoring challenges from saved game state:', {
                challengesCount: parsedState.challenges.length,
                customChallengesCount: parsedState.customChallenges?.length || 0
              });
              
              // Ensure all challenges have their prebuilt properties preserved
              const preservedChallenges = parsedState.challenges.map(challenge => ({
                ...challenge,
                isPrebuilt: challenge.isPrebuilt,
                prebuiltType: challenge.prebuiltType,
                prebuiltSettings: challenge.prebuiltSettings,
              }));
              
              // Restore the challenges that were previously selected for this game
              dispatch({ type: 'LOAD_CHALLENGES', payload: preservedChallenges });
              isLoadingChallengesInProgress = false;
              return;
            } 
            // If we have custom challenges but no standard challenges, load an empty array
            // to prevent infinite loading attempts
            else if (parsedState.customChallenges && parsedState.customChallenges.length > 0) {
              console.log('Only found custom challenges in saved state, loading empty standard challenges array');
              dispatch({ type: 'LOAD_CHALLENGES', payload: [] });
              isLoadingChallengesInProgress = false;
              return;
            } 
            else {
              console.warn('No challenges found in saved game state, will load empty array');
              dispatch({ type: 'LOAD_CHALLENGES', payload: [] });
              isLoadingChallengesInProgress = false;
              return;
            }
          } catch (error) {
            console.error('Error parsing saved game state:', error);
            // Still need to load an empty array to prevent infinite loading
            dispatch({ type: 'LOAD_CHALLENGES', payload: [] });
            isLoadingChallengesInProgress = false;
            return;
          }
        } else {
          console.warn('No saved game state found, but continuing game flag is true');
          dispatch({ type: 'LOAD_CHALLENGES', payload: [] });
          isLoadingChallengesInProgress = false;
          return;
        }
      }
      
      // If we're starting a new game, or couldn't restore challenges for a continuing game,
      // we should load both standard and custom challenges.
      console.log('Creating challenge setup for new game or restoring failed');
      
      // For new games, preload selected challenges (any challenge in customChallenges[] is already selected)
      // Standard challenges will be added via ADD_STANDARD_CHALLENGE when selected in GameSettings
      const selectedChallenges: Challenge[] = [];
      
      console.log('Setting up initial challenge state:', { 
        selectedCount: selectedChallenges.length,
        customChallengesCount: state.customChallenges.length  
      });
      
      dispatch({ type: 'LOAD_CHALLENGES', payload: selectedChallenges });
    } catch (error) {
      console.error('Error in loadChallenges:', error);
      dispatch({ 
        type: 'SET_CHALLENGES_ERROR', 
        payload: 'An unexpected error occurred while loading challenges.' 
      });
      // Load empty array to prevent infinite loading
      dispatch({ type: 'LOAD_CHALLENGES', payload: [] });
    } finally {
      clearTimeout(loadingTimeout);
      dispatch({ type: 'SET_CHALLENGES_LOADING', payload: false });
      isLoadingChallengesInProgress = false;
    }
  };

  // Load game state from localStorage on mount
  useEffect(() => {
    // Skip if we've already attempted restoration
    if (hasAttemptedGameStateRestoration) {
      return;
    }
    
    // Mark that we've attempted restoration
    hasAttemptedGameStateRestoration = true;
    let gameStateRestored = false;
    
    const savedState = localStorage.getItem('glassGameState');
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState) as GameState;
        
        // Only proceed if there's an active game
        if (parsedState.gameStarted && !parsedState.gameFinished) {
          gameStateRestored = true;
          
          // Always try to load player data from database for authenticated users
          if (isAuthenticated && user) {
            // Get the user ID
            const userId = user.id;
            
            // First load the game state with temporary avatars
            const tempPlayersWithAvatars = parsedState.players.map(player => {
              // Generate a temporary avatar as fallback
              return {
                ...player,
                image: getAvatarByName(player.name).url
              };
            });
            
            // Immediately restore game state with temporary avatars so UI isn't blocked
            dispatch({ 
              type: 'RESTORE_GAME_STATE', 
              payload: {
                ...parsedState,
                players: tempPlayersWithAvatars,
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
            
            // Then asynchronously fetch real player data from database
            playersService.getPlayers(userId)
              .then(dbPlayers => {
                // Create a map of id -> image for quick lookups
                const playerImageMap = new Map();
                dbPlayers.forEach(dbPlayer => {
                  if (dbPlayer.image) {
                    playerImageMap.set(dbPlayer.id, dbPlayer.image);
                  }
                });
                
                // Replace avatars with actual DB images for each player
                const playersWithRealImages = parsedState.players.map(player => {
                  // If this player has an image in the database, use it
                  if (playerImageMap.has(player.id)) {
                    return {
                      ...player,
                      image: playerImageMap.get(player.id)
                    };
                  }
                  
                  // Fallback to avatar if no DB image exists
                  return {
                    ...player,
                    image: getAvatarByName(player.name).url
                  };
                });
                
                // Update the game state with real images
                dispatch({ 
                  type: 'RESTORE_GAME_STATE', 
                  payload: {
                    ...parsedState,
                    players: playersWithRealImages,
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
              })
              .catch(err => {
                console.error('Failed to load player images from database:', err);
                // We already have a game state with avatars, so no need to dispatch again
              });
          } else {
            // For non-authenticated users, fall back to avatars
            const playersWithAvatars = parsedState.players.map(player => ({
              ...player,
              image: getAvatarByName(player.name).url
            }));
            
            dispatch({ 
              type: 'RESTORE_GAME_STATE', 
              payload: {
                ...parsedState,
                players: playersWithAvatars,
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
        }
      } catch (error) {
        console.error('Error restoring game state:', error);
      }
    }
    
    // Load challenges on mount only if we didn't restore the game state
    // or if we have no challenges at all (neither standard nor custom)
    if (!gameStateRestored && 
        state.challenges.length === 0 && 
        state.customChallenges.length === 0 && 
        !state.isLoadingChallenges) {
      console.log('Loading challenges since no game state was restored and no challenges exist');
      loadChallenges();
    }
    // Empty dependency array ensures this effect only runs once on mount

    // Return cleanup function to reset flag when component unmounts
    return () => {
      // This ensures the flag is reset if the component is unmounted and remounted
      hasAttemptedGameStateRestoration = false;
    };
  }, []);

  // Add a separate effect to handle auth changes
  useEffect(() => {
    // This effect only handles the initial authentication state
    // and won't re-trigger the game state restoration
    
    // We don't want to do anything here that would cause a loop
    // Just log the auth state for debugging
    console.log(`Auth state changed: isAuthenticated=${isAuthenticated}, userId=${user?.id || 'none'}`);
  }, [isAuthenticated, user]);

  // Save game state to localStorage whenever it changes
  useEffect(() => {
    // Only save if we have an active game
    if (state.gameStarted && !state.gameFinished) {
      try {
        // Create a trimmed version of the state that excludes large data
        const trimmedState = {
          ...state,
          // Create lightweight versions of players without full image data
          players: state.players.map(player => ({
            ...player,
            // If image is a data URL (base64), store a flag instead of the full data
            image: player.image.startsWith('data:') 
              ? `avatar_ref_${player.id}|${encodeURIComponent(player.name)}` 
              : player.image // Keep external URLs as is
          })),
          // Store only essential Spotify data if present
          challenges: state.challenges.map(challenge => {
            if (challenge.prebuiltType === 'spotifyMusicQuiz' && challenge.prebuiltSettings) {
              const settings = challenge.prebuiltSettings as SpotifyMusicQuizSettings;
              return {
                ...challenge,
                prebuiltSettings: {
                  ...settings,
                  // Remove potentially large song arrays if present
                  selectedSongs: settings.selectedSongs 
                    ? settings.selectedSongs.map((song: SpotifySong) => ({
                        id: song.id,
                        name: song.name,
                        artist: song.artist,
                        // Omit large image URLs and preview URLs to save space
                        isRevealed: song.isRevealed,
                        isPlaying: song.isPlaying
                      }))
                    : undefined
                }
              };
            }
            return challenge;
          })
        };

        // Store the main state data
        localStorage.setItem('glassGameState', JSON.stringify(trimmedState));

        // DO NOT store player images in localStorage - it causes errors and bloat
        // Instead, we'll handle image loading from the database when needed
        // The PlayerRegistration component already handles this correctly
        
      } catch (error) {
        console.error('Error saving game state to localStorage:', error);
        // If we hit quota issues, try removing non-essential data completely
        try {
          const minimalState = {
            ...state,
            // Never store image data in localStorage, only store references to them
            players: state.players.map(p => ({ 
              ...p, 
              // Store a reference to generate the avatar later, never store data: URLs
              image: p.image.startsWith('data:') 
                ? `avatar_ref_${p.id}|${encodeURIComponent(p.name)}` 
                : p.image 
            })),
            challenges: state.challenges.map(c => {
              if (c.prebuiltType === 'spotifyMusicQuiz' && c.prebuiltSettings) {
                return { ...c, prebuiltSettings: { ...c.prebuiltSettings, selectedSongs: [] } };
              }
              return c;
            })
          };
          localStorage.setItem('glassGameState', JSON.stringify(minimalState));
          console.log('Saved minimal game state as fallback');
        } catch (fallbackError) {
          console.error('Could not save even minimal game state:', fallbackError);
        }
      }
    } else if (state.gameFinished) {
      // Clear saved state when game is finished
      localStorage.removeItem('glassGameState');
      
      // Clean up any legacy player image references that might exist
      try {
        // Find and remove any keys starting with playerImage_
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('playerImage_')) {
            localStorage.removeItem(key);
          }
        }
      } catch (error) {
        console.error('Error cleaning up player image references:', error);
      }
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