import { useState, useEffect, useCallback, useRef } from 'react';
import { useGame } from '@/contexts/GameContext';
import { getNextChallenge } from '@/utils/challengeGenerator';
import { ChallengeType } from '@/types/Challenge';
import { GameMode } from '@/types/Team';
import { generateId, getParticipantById } from '@/utils/helpers';
import { getCurrentParticipantId } from '@/utils/gameHelpers';

/**
 * Custom hook for game state management and logic
 */
export const useGameState = () => {
  const { state, dispatch } = useGame();
  
  // Game timer state (for time-limited games)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [timerActive, setTimerActive] = useState(false);
  
  // Animation and transition states
  const [isRevealingChallenge, setIsRevealingChallenge] = useState(false);
  const [isShowingResults, setIsShowingResults] = useState(false);
  
  // Add refs to prevent infinite loops
  const isChallengeTransitionInProgressRef = useRef(false);
  const nextTurnCalled = useRef(false);
  const startGameCalledRef = useRef(false);
  const participantSelectionAttempts = useRef(0);
  const gameInitialized = useRef(false);
  
  // Define startRevealSequence function - moved to the top to fix ordering issues
  const startRevealSequence = useCallback(() => {
    // After the challenge and participants are set up, directly proceed to revealing
    // We'll use a custom event to trigger the startRevealSequence function in Game.tsx
    const event = new CustomEvent('start-reveal-sequence');
    window.dispatchEvent(event);
  }, []);
  
  // Initialize game time if using time-based duration
  useEffect(() => {
    if (state.gameStarted && state.gameDuration.type === 'time') {
      setTimeRemaining(state.gameDuration.value * 60); // Convert minutes to seconds
      setTimerActive(true);
    }
  }, [state.gameStarted, state.gameDuration]);
  
  // Handle timer countdown
  useEffect(() => {
    let interval: number | undefined;
    
    if (timerActive && timeRemaining !== null && timeRemaining > 0) {
      interval = window.setInterval(() => {
        setTimeRemaining(prev => {
          const newTime = (prev || 0) - 1;
          // End game when time runs out
          if (newTime <= 0) {
            setTimerActive(false);
            dispatch({ type: 'END_GAME' });
            return 0;
          }
          return newTime;
        });
      }, 1000);
    } else if (timeRemaining === 0) {
      // Make sure game is ended when time reaches 0
      setTimerActive(false);
      dispatch({ type: 'END_GAME' });
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [timerActive, timeRemaining, dispatch]);
  
  /**
   * Gets the current participant (player or team)
   */
  const getCurrentParticipant = useCallback(() => {
    if (!state.currentChallengeParticipants || state.currentChallengeParticipants.length === 0) {
      return null;
    }
    
    const participantId = state.currentChallengeParticipants[0];
    
    // First try looking in teams if in team mode
    if (state.gameMode === GameMode.TEAMS) {
      const team = state.teams.find(t => t.id === participantId);
      if (team) {
        return team;
      }
    }
    
    // Then try looking in players
    const player = state.players.find(p => p.id === participantId);
    if (player) {
      return player;
    }
    
    return null;
  }, [state.currentChallengeParticipants, state.players, state.teams, state.gameMode]);

  /**
   * Gets all participants for the current challenge
   */
  const getChallengeParticipants = useCallback(() => {
    if (!state.currentChallengeParticipants) return [];
    return state.currentChallengeParticipants.map(id => {
      const participant = getParticipantById(id, state.players, state.teams);
      if (!participant) return null;
      return {
        id: participant.id,
        name: participant.name,
        type: 'playerIds' in participant ? 'team' : 'player'
      };
    }).filter(p => p !== null);
  }, [state.currentChallengeParticipants, state.players, state.teams]);
  
  /**
   * Verify participants are properly assigned for the current challenge
   * and assign proper participants if needed
   */
  const verifyParticipantsAssigned = useCallback(() => {
    // If no challenge, can't verify participants
    if (!state.currentChallenge) {
      return false;
    }
    
    // Check if we have valid participants assigned
    const hasValidParticipants = state.currentChallengeParticipants?.length > 0 && 
      state.currentChallengeParticipants.every(id => {
        return state.gameMode === GameMode.TEAMS
          ? state.teams.some(t => t.id === id)
          : state.players.some(p => p.id === id);
      });
      
    
    // If participants are already valid, nothing to do
    if (hasValidParticipants) {
      return true;
    }
    
    // Assign appropriate participants based on challenge type and game mode
    let participantIds: string[] = [];
    
    // Check we have players/teams available
    if (state.gameMode === GameMode.TEAMS && state.teams.length === 0) {
      console.error("No teams available in team mode");
      return false;
    } else if (state.gameMode === GameMode.FREE_FOR_ALL && state.players.length === 0) {
      console.error("No players available in free-for-all mode");
      return false;
    }
    
    if (state.gameMode === GameMode.TEAMS) {
      // In team mode, select team(s) as participants
      const currentTurnTeam = state.teams[state.currentTurnIndex % state.teams.length];
      
      if (state.currentChallenge.type === ChallengeType.ONE_ON_ONE) {
        // For one-on-one in team mode, we should include all teams, not just two
        if (state.teams.length >= 2) {
          // If there are at least 2 teams, include all teams
          participantIds = state.teams.map(team => team.id);
        } else {
          // If there's only one team, just use that team
          participantIds = [currentTurnTeam.id];
        }
      } else if (state.currentChallenge.type === ChallengeType.TEAM) {
        // For team challenges, include all teams
        participantIds = state.teams.map(team => team.id);
      } else if (state.currentChallenge.type === ChallengeType.ALL_VS_ALL) {
        // For all vs all challenges in team mode, include all teams but players will compete individually
        participantIds = state.teams.map(team => team.id);
        
        // Also include player IDs from all teams to allow individual selection in UI
        const playerIds = state.teams.flatMap(team => team.playerIds);
        if (playerIds.length > 0) {
          participantIds = [...participantIds, ...playerIds];
        }
      } else {
        // For individual challenges, select the current team
        participantIds = [currentTurnTeam.id];
        
        // Also select a player from this team for individual challenges
        if (currentTurnTeam.playerIds.length > 0) {
          const playerIndex = state.currentRound % currentTurnTeam.playerIds.length;
          const playerId = currentTurnTeam.playerIds[playerIndex];
          dispatch({ 
            type: 'UPDATE_CHALLENGE_PARTICIPANTS', 
            payload: {
              challengeId: state.currentChallenge.id,
              participantIds: [playerId]
            }
          });
          return true;
        }
      }
    } else {
      // In free-for-all mode, select player(s) as participants
      const currentTurnPlayer = state.players[state.currentTurnIndex % state.players.length];
      
      if (state.currentChallenge.type === ChallengeType.ONE_ON_ONE && state.players.length >= 2) {
        // For one-on-one in free-for-all, include all players if possible
        if (state.players.length > 2) {
          // If we have more than 2 players, select two that are not the same
          // Start with the current player
          const player1 = currentTurnPlayer;
          participantIds = [player1.id];
          
          // Gather a set of players to face off against the current player
          // Try to include all players if reasonable
          const maxOpponents = Math.min(state.players.length - 1, 3); // Limit to 3 opponents max
          for (let i = 1; i <= maxOpponents; i++) {
            const playerIndex = (state.currentTurnIndex + i) % state.players.length;
            if (playerIndex !== state.currentTurnIndex % state.players.length) {
              participantIds.push(state.players[playerIndex].id);
            }
          }
        } else {
          // If exactly 2 players, select both
          participantIds = state.players.map(p => p.id);
        }
        
      } else if (state.currentChallenge.type === ChallengeType.ALL_VS_ALL) {
        // For all vs all challenges in free-for-all mode, include all players
        participantIds = state.players.map(p => p.id);
      } else {
        // For other challenge types, select the current player
        participantIds = [currentTurnPlayer.id];
      }
    }
    
    // Update the participants in state if we have valid ones
    if (participantIds.length > 0) {
      dispatch({ 
        type: 'UPDATE_CHALLENGE_PARTICIPANTS', 
        payload: {
          challengeId: state.currentChallenge.id,
          participantIds
        }
      });
      return true;
    }
    
    // If we got here, we couldn't assign valid participants
    return false;
  }, [
    state.currentChallenge, 
    state.currentChallengeParticipants, 
    state.gameMode, 
    state.teams, 
    state.players, 
    state.currentTurnIndex,
    state.currentRound,
    dispatch
  ]);

  /**
   * Selects the next challenge
   */
  const selectNextChallenge = useCallback(() => {
    // Prevent multiple calls to selectNextChallenge
    if (isChallengeTransitionInProgressRef.current) {
      return;
    }
    
    // Reset the participant selection attempts counter
    participantSelectionAttempts.current = 0;
    
    // Set the flag to indicate we're transitioning
    isChallengeTransitionInProgressRef.current = true;
    
    // Ensure we have challenges to select from
    if (state.challenges.length === 0) {
      console.error('No challenges available');
      isChallengeTransitionInProgressRef.current = false;
      return;
    }

    // Reset the nextTurnCalled flag
    nextTurnCalled.current = false;

    // First advance to next player's turn and wait for state update
    dispatch({ type: 'NEXT_TURN' });
    
    // We'll use this flag to track if we've called NEXT_TURN
    nextTurnCalled.current = true;

    // Wait for turn update before proceeding
    setTimeout(() => {
      // Get the next challenge
      const challenge = getNextChallenge(
        state.challenges, 
        state.usedChallenges, 
        state.gameMode, 
        state.customChallenges
      );
      
      if (!challenge) {
        // No more challenges available, end the game
        dispatch({ type: 'END_GAME' });
        isChallengeTransitionInProgressRef.current = false;
        return;
      }

      // First, ensure we have valid participants for this challenge type
      const canHaveParticipants = (
        (state.gameMode === GameMode.TEAMS && state.teams.length > 0) ||
        (state.gameMode === GameMode.FREE_FOR_ALL && state.players.length > 0)
      );

      if (!canHaveParticipants) {
        console.error('No valid participants available for the game mode');
        setIsRevealingChallenge(true);
        isChallengeTransitionInProgressRef.current = false;
        return;
      }
      
      // Select the challenge in state
      dispatch({ type: 'SELECT_CHALLENGE', payload: challenge });

      // Wait for challenge selection update before proceeding
      setTimeout(() => {
        // Make sure participants were properly assigned
        const participantsValid = verifyParticipantsAssigned();
        
        if (participantsValid) {
          // After the challenge and participants are set up, directly proceed to revealing
          
          // Let the Game component handle the reveal sequence
          // The Game component will check the isNewGameStart flag and
          // determine whether to skip the player reveal for the first challenge
          startRevealSequence();
          isChallengeTransitionInProgressRef.current = false;
        } else {
          participantSelectionAttempts.current += 1;
          
          if (participantSelectionAttempts.current > 3) {
            // If we've tried multiple times and still failed, skip to challenge reveal
            console.error("Failed to assign participants after multiple attempts, skipping to challenge reveal");
            setIsRevealingChallenge(true);
            isChallengeTransitionInProgressRef.current = false;
          } else {
            // Try once more after a longer delay
            setTimeout(() => {
              const retrySuccessful = verifyParticipantsAssigned();
              if (retrySuccessful) {
                startRevealSequence();
              } else {
                setIsRevealingChallenge(true);
              }
              isChallengeTransitionInProgressRef.current = false;
            }, 300); // Increased delay for better state synchronization
          }
        }
      }, 200); // Increased delay for better state synchronization
    }, 200); // Increased delay for better state synchronization
  }, [
    state.challenges,
    state.usedChallenges,
    state.gameMode,
    state.players,
    state.teams,
    state.customChallenges,
    dispatch,
    verifyParticipantsAssigned,
    startRevealSequence
  ]);

  /**
   * Starts a new game
   */
  const startGame = useCallback(() => {
    // Use ref to prevent duplicate calls in the same render cycle
    if (startGameCalledRef.current) {
      return;
    }
    
    // Mark that we've called startGame
    startGameCalledRef.current = true;
    gameInitialized.current = true;
    
    // Initialize game state
    dispatch({ type: 'START_GAME' });
    
    // Small delay to ensure game context is updated
    setTimeout(() => {
      // Reset the ref after state update
      startGameCalledRef.current = false;
      
      // Move to the next challenge
      selectNextChallenge();
    }, 300); // Increased delay for better state synchronization
  }, [dispatch, selectNextChallenge]);

  /**
   * Completes the current challenge
   */
  const completeChallenge = useCallback((completed: boolean, winnerId?: string) => {
    if (!state.currentChallenge) return;
    
    // Prevent duplicate calls while processing
    if (isChallengeTransitionInProgressRef.current) {
      return;
    }
    
    isChallengeTransitionInProgressRef.current = true;
    
    // Reset animation flags for next challenge
    setIsRevealingChallenge(false);
    
    // Record the result and wait for state update before proceeding
    dispatch({
      type: 'RECORD_CHALLENGE_RESULT',
      payload: {
        challengeId: state.currentChallenge.id,
        completed,
        winnerId,
        participantIds: state.currentChallengeParticipants
      }
    });

    // Add a small delay to ensure state update is processed
    setTimeout(() => {
      isChallengeTransitionInProgressRef.current = false;
      
      // Ensure any previous animation states are reset
      window.dispatchEvent(new CustomEvent('reset-game-animations'));
      
      // Move to the next challenge, which will trigger the reveal sequence
      selectNextChallenge();
    }, 300); // Increased delay for better state synchronization
  }, [state.currentChallenge, state.currentChallengeParticipants, dispatch, selectNextChallenge, setIsRevealingChallenge]);

  return {
    gameState: state,
    timeRemaining,
    isRevealingChallenge,
    isShowingResults,
    getCurrentParticipant,
    getChallengeParticipants,
    startGame,
    selectNextChallenge,
    completeChallenge,
    setIsRevealingChallenge,
    verifyParticipantsAssigned
  };
};

export default useGameState;