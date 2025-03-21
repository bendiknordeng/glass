import { useState, useEffect, useCallback, useRef } from 'react';
import { useGame } from '@/contexts/GameContext';
import { getNextChallenge } from '@/utils/challengeGenerator';
import { Challenge, ChallengeType } from '@/types/Challenge';
import { GameMode } from '@/types/Team';
import { generateId, getParticipantById } from '@/utils/helpers';
import { getCurrentParticipantId } from '@/utils/gameHelpers';

/**
 * Custom hook for game state management and logic
 */
export const useGameState = () => {
  const { state, dispatch, updateGameInSupabase, saveGameToSupabase } = useGame();
  
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
  const verifyParticipantsAssigned = useCallback((challengeToVerify?: Challenge) => {
    // We can use either the provided challenge or the one from state
    const challenge = challengeToVerify || state.currentChallenge;
    
    // Debug: Log the entire state relevant to participant assignment
    console.log('DEBUG: Game state before participant verification:', {
      gameMode: state.gameMode,
      playerCount: state.players.length,
      teamCount: state.teams.length,
      currentChallengeId: state.currentChallenge?.id,
      challengeToVerifyId: challengeToVerify?.id,
      currentParticipants: state.currentChallengeParticipants
    });
    
    // If no challenge, can't verify participants
    if (!challenge) {
      console.log('No challenge to verify participants for');
      return false;
    }
    
    // Debug logs to help identify issues
    console.log('Verifying participants for challenge:', {
      id: challenge.id,
      title: challenge.title,
      type: challenge.type,
      gameMode: state.gameMode,
      currentParticipants: state.currentChallengeParticipants,
      teamsAvailable: state.teams.length,
      playersAvailable: state.players.length
    });
    
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

    // DIRECT ASSIGNMENT: assign all teams or players
    if (state.gameMode === GameMode.TEAMS) {
      // In team mode, just use all teams
      participantIds = state.teams.map(team => team.id);
      console.log('Simplified assignment: using all teams:', participantIds);
    } else {
      // In free-for-all mode, just use all players
      participantIds = state.players.map(player => player.id);
      console.log('Simplified assignment: using all players:', participantIds);
    }
    
    // Update the participants in state if we have valid ones
    if (participantIds.length > 0) {
      console.log('Updating challenge participants with IDs:', participantIds);
      
      dispatch({ 
        type: 'UPDATE_CHALLENGE_PARTICIPANTS', 
        payload: {
          challengeId: challenge.id,
          participantIds
        }
      });
      
      return true;
    }
    
    // If we got here, we couldn't assign valid participants
    console.error('Failed to assign participants after all attempts');
    return false;
  }, [
    state.gameMode, 
    state.teams, 
    state.players,
    state.currentChallenge,
    state.currentChallengeParticipants,
    dispatch
  ]);

  /**
   * Selects the next challenge
   */
  const selectNextChallenge = useCallback(() => {
    // Prevent multiple calls to selectNextChallenge
    if (isChallengeTransitionInProgressRef.current) {
      console.log('Challenge transition already in progress, skipping selectNextChallenge call');
      return;
    }
    
    console.log('Starting challenge selection process...');
    
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

    // First advance to next player's turn
    dispatch({ type: 'NEXT_TURN' });
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

      // Log the selected challenge for debugging
      console.log('Selected next challenge:', {
        id: challenge.id,
        title: challenge.title,
        type: challenge.type,
        isPrebuilt: challenge.isPrebuilt,
        prebuiltType: challenge.prebuiltType,
        hasPrebuiltSettings: !!challenge.prebuiltSettings
      });

      // First, ensure we have valid participants for this challenge type
      const canHaveParticipants = (
        (state.gameMode === GameMode.TEAMS && state.teams.length > 0) ||
        (state.gameMode === GameMode.FREE_FOR_ALL && state.players.length > 0)
      );

      if (!canHaveParticipants) {
        console.error('No valid participants available for the game mode');
        isChallengeTransitionInProgressRef.current = false;
        
        // Force proceed with reveal anyway
        startRevealSequence();
        return;
      }
      
      // IMPORTANT: Create a local challenge copy to avoid reference issues
      const challengeCopy = { ...challenge };
      
      // CRITICAL CHANGE: Assign participants BEFORE dispatching to state
      // This ensures participants are assigned even if state updates are delayed
      const participantsAssigned = verifyParticipantsAssigned(challengeCopy);
      
      if (!participantsAssigned) {
        console.warn('Failed to assign participants before state update, will try again after...');
      } else {
        console.log('Successfully assigned participants before state update');
      }
      
      // Now dispatch the challenge to state
      dispatch({ type: 'SELECT_CHALLENGE', payload: challengeCopy });
      
      // Wait briefly before proceeding
      setTimeout(() => {
        // Update game in Supabase (regardless of participant assignment status)
        updateGameInSupabase().catch(error => {
          console.error('Error updating game in Supabase after selecting challenge:', error);
        });
        
        // If participants were already assigned successfully, we can proceed
        if (participantsAssigned) {
          console.log('Challenge is ready with participants, proceeding to reveal');
          startRevealSequence();
          isChallengeTransitionInProgressRef.current = false;
          return;
        }
        
        // If participants weren't assigned initially, try one more time
        // This is a fallback in case state update is needed
        console.log('Trying participant assignment one more time after state update');
        const retryAssignment = verifyParticipantsAssigned(challengeCopy);
        
        if (retryAssignment) {
          console.log('Participant assignment succeeded on retry');
          startRevealSequence();
          isChallengeTransitionInProgressRef.current = false;
        } else {
          // If still failing, use the emergency approach with force assignment
          console.warn('Force assigning participants as final fallback');
          const forceAssignedIds: string[] = [];
          
          if (state.gameMode === GameMode.TEAMS && state.teams.length > 0) {
            // In team mode, use all teams
            forceAssignedIds.push(...state.teams.map(t => t.id));
          } else if (state.players.length > 0) {
            // In free-for-all, use all players
            forceAssignedIds.push(...state.players.map(p => p.id));
          }
          
          if (forceAssignedIds.length > 0) {
            console.log('Force assigning participants as fallback:', forceAssignedIds);
            
            // Update challenge participants directly 
            dispatch({
              type: 'UPDATE_CHALLENGE_PARTICIPANTS',
              payload: {
                challengeId: challengeCopy.id,
                participantIds: forceAssignedIds
              }
            });
            
            // One final Supabase update after force assignment
            updateGameInSupabase().catch(error => {
              console.error('Error updating game in Supabase after force assignment:', error);
            });
          }
          
          // Proceed with reveal regardless
          startRevealSequence();
          isChallengeTransitionInProgressRef.current = false;
        }
      }, 200);
    }, 200);
  }, [
    state.challenges,
    state.usedChallenges,
    state.gameMode,
    state.players,
    state.teams,
    state.customChallenges,
    dispatch,
    verifyParticipantsAssigned,
    startRevealSequence,
    updateGameInSupabase
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
      
      // Save game to Supabase
      saveGameToSupabase().catch(error => {
        console.error('Error saving game to Supabase on start:', error);
      });
      
      // Move to the next challenge
      selectNextChallenge();
    }, 300); // Increased delay for better state synchronization
  }, [dispatch, selectNextChallenge, saveGameToSupabase]);

  /**
   * Completes the current challenge
   */
  const completeChallenge = useCallback((completed: boolean, winnerId?: string, participantScores?: Record<string, number>) => {
    if (!state.currentChallenge) return;
    
    // Prevent duplicate calls while processing
    if (isChallengeTransitionInProgressRef.current) {
      return;
    }
    
    isChallengeTransitionInProgressRef.current = true;
    
    // Reset animation flags for next challenge
    setIsRevealingChallenge(false);
    
    // If we received participant scores from a quiz or other prebuilt challenge
    // make sure to update all participants' scores in the game state
    if (participantScores && Object.keys(participantScores).length > 0) {
      console.log('Updating scores for all participants:', participantScores);
      
      // Process each participant and their score
      Object.entries(participantScores).forEach(([participantId, score]) => {
        // Skip participants with zero points
        if (score <= 0) return;
        
        // Find the participant in players or teams
        const participant = getParticipantById(participantId, state.players, state.teams);
        if (participant) {
          if ('teamColor' in participant) {
            // It's a team - update team score
            dispatch({
              type: 'UPDATE_TEAM_SCORE',
              payload: {
                teamId: participantId,
                // Don't add anything here as points were already added during the quiz
                points: 0
              }
            });
          } else {
            // It's a player - update player score
            dispatch({
              type: 'UPDATE_PLAYER_SCORE',
              payload: {
                playerId: participantId,
                // Don't add anything here as points were already added during the quiz
                points: 0
              }
            });
          }
          console.log(`Registered final score for ${participant.name}: ${score}`);
        }
      });
    }
    
    // Record the result and wait for state update before proceeding
    dispatch({
      type: 'RECORD_CHALLENGE_RESULT',
      payload: {
        challengeId: state.currentChallenge.id,
        completed,
        winnerId,
        participantIds: state.currentChallengeParticipants,
        participantScores // Store the scores in the challenge result
      }
    });

    // Update game in Supabase
    updateGameInSupabase().catch(error => {
      console.error('Error updating game in Supabase after challenge completion:', error);
    });

    // Add a small delay to ensure state update is processed
    setTimeout(() => {
      isChallengeTransitionInProgressRef.current = false;
      
      // Ensure any previous animation states are reset
      window.dispatchEvent(new CustomEvent('reset-game-animations'));
      
      // Move to the next challenge, which will trigger the reveal sequence
      selectNextChallenge();
    }, 300); // Increased delay for better state synchronization
  }, [state.currentChallenge, state.currentChallengeParticipants, state.players, state.teams, dispatch, selectNextChallenge, setIsRevealingChallenge, updateGameInSupabase]);

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