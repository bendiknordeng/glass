import { useState, useEffect, useCallback } from 'react';
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
  const [isSelectingPlayer, setIsSelectingPlayer] = useState(false);
  const [isRevealingChallenge, setIsRevealingChallenge] = useState(false);
  const [isShowingResults, setIsShowingResults] = useState(false);
  
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
    const participant = getParticipantById(state.currentChallengeParticipants[0], state.players, state.teams);
    if (!participant) return null;
    
    // Return the full player or team object
    return 'playerIds' in participant 
      ? state.teams.find(t => t.id === participant.id)
      : state.players.find(p => p.id === participant.id);
  }, [state.currentChallengeParticipants, state.players, state.teams]);

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
   * Selects the next challenge
   */
  const selectNextChallenge = useCallback(() => {
    // Ensure we have challenges to select from
    if (state.challenges.length === 0) {
      console.error('No challenges available');
      return;
    }

    // First advance to next player's turn and wait for state update
    dispatch({ type: 'NEXT_TURN' });

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
        return;
      }

      // Select the challenge and set up participants
      dispatch({ type: 'SELECT_CHALLENGE', payload: challenge });

      // Wait for challenge selection update
      setTimeout(() => {
        const participant = getCurrentParticipant();
        if (participant) {
          setIsSelectingPlayer(true);
        } else {
          // Log more details for debugging
          console.warn('Initial participant check failed, debug info:', {
            challenge: challenge.type,
            gameMode: state.gameMode,
            currentTurnIndex: state.currentTurnIndex,
            participants: state.currentChallengeParticipants,
            players: state.players.length,
            teams: state.teams.length,
            currentParticipantId: getCurrentParticipantId(state)
          });
          
          // One more attempt with a longer delay
          setTimeout(() => {
            const recoveredParticipant = getCurrentParticipant();
            if (recoveredParticipant) {
              setIsSelectingPlayer(true);
            } else {
              console.error('Could not establish valid participants, falling back to challenge reveal');
              setIsRevealingChallenge(true);
            }
          }, 100);
        }
      }, 50);
    }, 50);
  }, [
    state.challenges,
    state.usedChallenges,
    state.gameMode,
    state.currentTurnIndex,
    state.players,
    state.teams,
    state.customChallenges,
    dispatch,
    getCurrentParticipant
  ]);

  /**
   * Starts a new game
   */
  const startGame = useCallback(() => {
    dispatch({ type: 'START_GAME' });
    selectNextChallenge();
  }, [dispatch, selectNextChallenge, state.gameStarted]);

  /**
   * Completes the current challenge
   */
  const completeChallenge = useCallback((completed: boolean, winnerId?: string) => {
    if (!state.currentChallenge) return;
    
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

    // Wait for state update before selecting next challenge
    setTimeout(() => {
      // Verify state was updated
      if (state.currentChallenge) {
        console.warn('State not yet updated after recording result, waiting...');
        setTimeout(() => {
          selectNextChallenge();
        }, 50);
      } else {
        selectNextChallenge();
      }
    }, 0);
  }, [state.currentChallenge, state.currentChallengeParticipants, dispatch, selectNextChallenge]);

  return {
    gameState: state,
    timeRemaining,
    isSelectingPlayer,
    isRevealingChallenge,
    isShowingResults,
    getCurrentParticipant,
    getChallengeParticipants,
    startGame,
    selectNextChallenge,
    completeChallenge,
    setIsSelectingPlayer,
    setIsRevealingChallenge
  };
};

export default useGameState;