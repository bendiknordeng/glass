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
   * Starts a new game
   */
  const startGame = useCallback(() => {
    dispatch({ type: 'START_GAME' });
    // Start with player selection animation
    setIsSelectingPlayer(true);
    setTimeout(() => {
      setIsSelectingPlayer(false);
      selectNextChallenge();
    }, 2000);
  }, [dispatch]);
  
  /**
   * Selects the next challenge
   */
  const selectNextChallenge = useCallback(() => {
    const challenge = getNextChallenge(
      state.challenges, 
      state.usedChallenges, 
      state.gameMode, 
      state.customChallenges
    );
    
    if (challenge) {
      // Trigger challenge reveal animation
      setIsRevealingChallenge(true);
      setTimeout(() => {
        dispatch({ type: 'SELECT_CHALLENGE', payload: challenge });
        setIsRevealingChallenge(false);
      }, 1500);
    } else {
      // No more challenges available, end the game
      dispatch({ type: 'END_GAME' });
    }
  }, [state.challenges, state.usedChallenges, state.gameMode, state.customChallenges, dispatch]);
  
  /**
   * Completes the current challenge and moves to the next turn
   */
  const completeChallenge = useCallback((completed: boolean, winnerId?: string) => {
    if (!state.currentChallenge) return;
    
    dispatch({
      type: 'RECORD_CHALLENGE_RESULT',
      payload: {
        challengeId: state.currentChallenge.id,
        completed,
        winnerId,
        participantIds: state.currentChallengeParticipants,
      }
    });
    
    // Show results briefly before moving to next turn
    setIsShowingResults(true);
    setTimeout(() => {
      setIsShowingResults(false);
      
      // Move to next player/team turn
      dispatch({ type: 'NEXT_TURN' });
      
      // If game is not finished, select next player and challenge
      if (!state.gameFinished) {
        // Start with player selection animation
        setIsSelectingPlayer(true);
        setTimeout(() => {
          setIsSelectingPlayer(false);
          selectNextChallenge();
        }, 2000);
      }
    }, 3000);
  }, [state.currentChallenge, state.currentChallengeParticipants, state.gameFinished, dispatch]);
  
  /**
   * Gets the current player or team whose turn it is
   */
  const getCurrentParticipant = useCallback(() => {
    if (state.gameMode === GameMode.TEAMS) {
      return state.teams[state.currentTurnIndex];
    } else {
      return state.players[state.currentTurnIndex];
    }
  }, [state.gameMode, state.teams, state.players, state.currentTurnIndex]);
  
  /**
   * Gets participants for the current challenge
   */
  const getChallengeParticipants = useCallback(() => {
    if (!state.currentChallenge) return [];
    
    return state.currentChallengeParticipants.map(id => 
      getParticipantById(id, state.players, state.teams)
    ).filter(p => p !== null) as { id: string; name: string; type: 'player' | 'team' }[];
  }, [state.currentChallenge, state.currentChallengeParticipants, state.players, state.teams]);
  
  /**
   * Adds a custom challenge to the game
   */
  const addCustomChallenge = useCallback((
    title: string,
    description: string,
    type: ChallengeType,
    canReuse: boolean,
    difficulty: 1 | 2 | 3,
    points: number,
    category?: string
  ) => {
    dispatch({
      type: 'ADD_CUSTOM_CHALLENGE',
      payload: {
        title,
        description,
        type,
        canReuse,
        difficulty,
        points,
        category
      }
    });
  }, [dispatch]);
  
  /**
   * Gets the leaderboard of players or teams
   */
  const getLeaderboard = useCallback(() => {
    if (state.gameMode === GameMode.TEAMS) {
      return [...state.teams].sort((a, b) => b.score - a.score);
    } else {
      return [...state.players].sort((a, b) => b.score - a.score);
    }
  }, [state.gameMode, state.teams, state.players]);

  return {
    // State
    gameState: state,
    timeRemaining,
    isSelectingPlayer,
    isRevealingChallenge,
    isShowingResults,
    
    // Actions
    startGame,
    completeChallenge,
    addCustomChallenge,
    
    // Getters
    getCurrentParticipant,
    getChallengeParticipants,
    getLeaderboard
  };
};