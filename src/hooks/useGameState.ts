import { useState, useEffect, useCallback } from 'react';
import { useGame } from '@/contexts/GameContext';
import { getNextChallenge } from '@/utils/challengeGenerator';
import { ChallengeType } from '@/types/Challenge';
import { GameMode } from '@/types/Team';
import { generateId, getParticipantById } from '@/utils/helpers';

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

    // Advance to next player's turn
    dispatch({ type: 'NEXT_TURN' });

    const challenge = getNextChallenge(
      state.challenges, 
      state.usedChallenges, 
      state.gameMode, 
      state.customChallenges
    );
    
    if (challenge) {
      // First select the challenge internally
      dispatch({ type: 'SELECT_CHALLENGE', payload: challenge });
      
      // First show player selection
      setIsSelectingPlayer(true);
      
      // After player selection completes, show challenge reveal
      setTimeout(() => {
        setIsSelectingPlayer(false);
        setIsRevealingChallenge(true);
        
        // After challenge reveal completes, show the main game
        setTimeout(() => {
          setIsRevealingChallenge(false);
        }, 6000); // Match ChallengeReveal duration
      }, 6000); // Match PlayerSelection duration
    } else {
      // No more challenges available, end the game
      console.log('No more challenges available, ending game');
      dispatch({ type: 'END_GAME' });
    }
  }, [state.challenges, state.usedChallenges, state.gameMode, state.customChallenges, dispatch]);

  /**
   * Starts a new game
   */
  const startGame = useCallback(() => {
    dispatch({ type: 'START_GAME' });
    selectNextChallenge();
  }, [dispatch, selectNextChallenge]);

  /**
   * Completes the current challenge
   */
  const completeChallenge = useCallback((completed: boolean, winnerId?: string) => {
    if (!state.currentChallenge) return;
    
    dispatch({
      type: 'RECORD_CHALLENGE_RESULT',
      payload: {
        challengeId: state.currentChallenge.id,
        completed,
        winnerId,
        participantIds: state.currentChallengeParticipants
      }
    });
    
    // Start next turn with player selection and challenge reveal
    selectNextChallenge();
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
    completeChallenge
  };
};

export default useGameState;