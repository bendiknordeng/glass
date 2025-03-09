import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { Player } from '@/types/Player';
import { Team, GameMode, GameDuration } from '@/types/Team';
import { Challenge, ChallengeResult } from '@/types/Challenge';
import { generateId } from '@/utils/helpers';

// Define the state shape
interface GameState {
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
};

// Define action types
type GameAction =
  | { type: 'START_GAME' }
  | { type: 'END_GAME' }
  | { type: 'SET_GAME_MODE'; payload: GameMode }
  | { type: 'SET_GAME_DURATION'; payload: GameDuration }
  | { type: 'ADD_PLAYER'; payload: Omit<Player, 'id' | 'score'> }
  | { type: 'REMOVE_PLAYER'; payload: string }
  | { type: 'CREATE_TEAMS'; payload: { numTeams: number; teamNames: string[] } }
  | { type: 'RANDOMIZE_TEAMS' }
  | { type: 'LOAD_CHALLENGES'; payload: Challenge[] }
  | { type: 'ADD_CUSTOM_CHALLENGE'; payload: Omit<Challenge, 'id'> }
  | { type: 'UPDATE_CUSTOM_CHALLENGE'; payload: Challenge }
  | { type: 'REMOVE_CUSTOM_CHALLENGE'; payload: string }
  | { type: 'NEXT_TURN' }
  | { type: 'SELECT_CHALLENGE'; payload: Challenge }
  | { type: 'RECORD_CHALLENGE_RESULT'; payload: Omit<ChallengeResult, 'timestamp'> }
  | { type: 'RESET_GAME' }
  | { type: 'REMOVE_PLAYER_FROM_TEAM'; payload: { teamId: string; playerId: string } }
  | { type: 'ADD_PLAYER_TO_TEAM'; payload: { teamId: string; playerId: string } }
  | { type: 'SAVE_TEAMS_STATE'; payload: Team[] };

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
        id: generateId(),
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

    case 'LOAD_CHALLENGES':
      // Only update if we're loading challenges and don't already have them
      if (action.payload.length > 0 && state.challenges.length === 0) {
        return {
          ...state,
          challenges: [...action.payload],
        };
      }
      return state;

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
      
      console.log("NEXT_TURN:", {
        prevTurnIndex: state.currentTurnIndex,
        nextTurnIndex,
        prevRound: state.currentRound,
        nextRound,
        prevChallengeType: prevChallenge?.type,
        wasAdvanced: nextTurnIndex !== state.currentTurnIndex
      });
      
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
      
      console.log("SELECT_CHALLENGE called", {
        challengeType: challenge.type,
        gameMode: state.gameMode,
        currentTurnIndex: state.currentTurnIndex
      });
      
      // Determine participants based on challenge type
      if (challenge.type === 'individual') {
        // Current player/team only
        participants = [getCurrentParticipantId(state)];
        console.log("Individual challenge: Current participant ID:", participants[0]);
      } else if (challenge.type === 'oneOnOne') {
        if (state.gameMode === GameMode.TEAMS) {
          // In team mode, one-on-one is between all teams - each team selects a player
          participants = state.teams.map(team => team.id);
          console.log("One-on-one challenge in team mode: All teams participating");
        } else {
          // In free-for-all, select the current player plus one random opponent
          const currentId = getCurrentParticipantId(state);
          const otherIds = getAllParticipantIds(state).filter(id => id !== currentId);
          
          if (otherIds.length > 0) {
            const randomOpponentId = otherIds[Math.floor(Math.random() * otherIds.length)];
            participants = [currentId, randomOpponentId];
          } else {
            // Fallback if there are no other players
            participants = [currentId];
          }
          console.log("One-on-one challenge in free-for-all: Participants", participants);
        }
      } else if (challenge.type === 'team') {
        // All teams participate in team challenges
        if (state.gameMode === GameMode.TEAMS) {
          participants = state.teams.map(team => team.id);
          console.log("Team challenge in team mode: All teams participating");
        } else {
          // In free-for-all, create two random groups
          const playerIds = shuffleArray([...state.players.map(player => player.id)]);
          const midpoint = Math.ceil(playerIds.length / 2);
          participants = [
            'group1:' + playerIds.slice(0, midpoint).join(','),
            'group2:' + playerIds.slice(midpoint).join(',')
          ];
          console.log("Team challenge in free-for-all: Created two groups");
        }
      }
      
      return {
        ...state,
        currentChallenge: challenge,
        currentChallengeParticipants: participants,
        usedChallenges: challenge.canReuse 
          ? state.usedChallenges 
          : [...state.usedChallenges, challenge.id],
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

// Create context
interface GameContextType {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

// Create provider
export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  // Load game state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('glassGameState');
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState) as GameState;
        
        // Initialize state in a specific order to prevent overwrites
        const initializeState = async () => {
          // First, set game mode and duration as they affect other state
          dispatch({ type: 'SET_GAME_MODE', payload: parsedState.gameMode });
          dispatch({ type: 'SET_GAME_DURATION', payload: parsedState.gameDuration });
          
          // Then load challenges
          if (parsedState.challenges.length > 0) {
            dispatch({ type: 'LOAD_CHALLENGES', payload: parsedState.challenges });
          }
          
          // Load custom challenges
          if (parsedState.customChallenges.length > 0) {
            parsedState.customChallenges.forEach(challenge => {
              const { id, ...challengeData } = challenge;
              dispatch({ type: 'ADD_CUSTOM_CHALLENGE', payload: challengeData });
            });
          }
          
          // Add saved players
          parsedState.players.forEach(player => {
            dispatch({ 
              type: 'ADD_PLAYER', 
              payload: { name: player.name, image: player.image } 
            });
          });
          
          // Recreate teams if needed
          if (parsedState.gameMode === GameMode.TEAMS && parsedState.teams.length > 0) {
            dispatch({ type: 'CREATE_TEAMS', payload: { numTeams: parsedState.teams.length, teamNames: parsedState.teams.map(team => team.name) } });
          }
        };
        
        initializeState();
      } catch (error) {
        console.error('Error restoring game state:', error);
      }
    }
  }, []);

  // Save game state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('glassGameState', JSON.stringify(state));
  }, [state]);

  return (
    <GameContext.Provider value={{ state, dispatch }}>
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