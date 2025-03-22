import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useGame } from '@/contexts/GameContext';
import { generateDefaultChallenges } from '@/utils/challengeGenerator';
import Button from '@/components/common/Button';
import PlayerRegistration from '@/components/setup/PlayerRegistration';
import TeamCreation, { TeamCreationRef } from '@/components/setup/TeamCreation';
import GameSettings from '@/components/setup/GameSettings';
import GameSummary from '@/components/setup/GameSummary';
import { GameMode } from '@/types/Team';
import { Challenge } from '@/types/Challenge';

const SETUP_CURRENT_STEP_KEY = 'glass_setup_current_step';

const Setup: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state, dispatch, saveGameToSupabase } = useGame();
  // Initialize currentStep from localStorage if available, otherwise start at 0
  const [currentStep, setCurrentStep] = useState(() => {
    const savedStep = localStorage.getItem(SETUP_CURRENT_STEP_KEY);
    return savedStep ? parseInt(savedStep, 10) : 0;
  });
  const [isLoading, setIsLoading] = useState(false);
  const stateRef = useRef(state);
  const teamCreationRef = useRef<TeamCreationRef>(null);
  
  // Track if this is the initial page load
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Keep ref updated with latest state
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Save currentStep to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(SETUP_CURRENT_STEP_KEY, currentStep.toString());
    
    // Save game state when changing steps
    saveGameStateToLocalStorage();
  }, [currentStep]);
  
  // Save game state to localStorage
  const saveGameStateToLocalStorage = () => {
    try {
      // Save only the minimal essential data needed for game setup
      // Optimize by removing large arrays or limiting their size
      const stateToSave = {
        players: state.players,
        teams: state.teams,
        gameMode: state.gameMode,
        gameDuration: state.gameDuration,
        // Don't save full challenges arrays - they can be too large
        // Instead, store only IDs or selected status for custom challenges
        customChallengeIds: state.customChallenges.map(c => ({
          id: c.id,
          isSelected: c.isSelected || false
        }))
        // challenges array is loaded dynamically, no need to store in localStorage
      };
      
      // Store in localStorage
      localStorage.setItem('gameStateSetup', JSON.stringify(stateToSave));
      console.log('Game state saved to localStorage');
    } catch (error) {
      console.error('Error saving game state to localStorage:', error);
    }
  };
  
  // Load game state from localStorage on initial mount
  useEffect(() => {
    try {
      const savedState = localStorage.getItem('gameStateSetup');
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        
        // Restore the game state
        if (parsedState.players) {
          // Restore players
          for (const player of parsedState.players) {
            if (!state.players.some(p => p.id === player.id)) {
              dispatch({
                type: 'ADD_PLAYER',
                payload: player
              });
            }
          }
        }
        
        // Restore teams if needed
        if (parsedState.teams && parsedState.teams.length > 0) {
          dispatch({
            type: 'SAVE_TEAMS_STATE',
            payload: parsedState.teams
          });
        }
        
        // Restore game mode
        if (parsedState.gameMode) {
          dispatch({
            type: 'SET_GAME_MODE',
            payload: parsedState.gameMode
          });
        }
        
        // Restore game duration
        if (parsedState.gameDuration) {
          dispatch({
            type: 'SET_GAME_DURATION',
            payload: parsedState.gameDuration
          });
        }
        
        // If using new format with customChallengeIds (to support backward compatibility)
        if (parsedState.customChallengeIds && parsedState.customChallengeIds.length > 0) {
          console.log('Found stored custom challenge IDs:', parsedState.customChallengeIds.length);
          
          // We'll restore the selection state of custom challenges when they're loaded
          // This is handled in the GameSettings component's useEffect for challenge loading
          
          // Store the IDs in localStorage for the GameSettings component to use
          localStorage.setItem('selectedCustomChallengeIds', JSON.stringify(parsedState.customChallengeIds));
        }
        
        console.log('Game state restored from localStorage');
      }
    } catch (error) {
      console.error('Error restoring game state from localStorage:', error);
    }
  }, []);
  
  // Mark initial load as complete after a short delay to ensure state is properly loaded
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoad(false);
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Steps for setup process
  const MIN_PLAYERS = 2;

  // Function to check if the teams step can continue
  const canContinueFromTeamsStep = () => {
    // If in free-for-all mode, can continue
    if (state.gameMode === GameMode.FREE_FOR_ALL) {
      return true;
    }
    
    // In TEAMS mode, check if teams have been created
    // First check via the ref (which is more reliable when component is mounted)
    const teamsReadyViaRef = teamCreationRef.current?.isReady() || false;
    
    // Fallback check directly on state (works even if component is not fully initialized)
    const teamsExistInState = state.gameMode === GameMode.TEAMS && state.teams.length > 0;
    
    return teamsReadyViaRef || teamsExistInState;
  };

  // Clear the saved step when the game starts
  const clearSavedStep = () => {
    localStorage.removeItem(SETUP_CURRENT_STEP_KEY);
    localStorage.removeItem('gameStateSetup');
    localStorage.removeItem('setupTeams');
  };
  
  // Reset to first step if we don't have enough players, but only after initial load
  useEffect(() => {
    // Only validate and potentially reset step after initial loading is complete
    if (!isInitialLoad && state.players.length < MIN_PLAYERS && currentStep > 0) {
      setCurrentStep(0);
    }
  }, [state.players.length, currentStep, isInitialLoad]);

  const steps = [
    {
      id: 'players',
      title: t('setup.playerRegistration'),
      component: <PlayerRegistration />,
      canContinue: state.players.length >= MIN_PLAYERS
    },
    {
      id: 'teams',
      title: t('setup.teamCreation'),
      component: <TeamCreation ref={teamCreationRef} />,
      canContinue: canContinueFromTeamsStep()
    },
    {
      id: 'settings',
      title: t('setup.gameSettings'),
      component: <GameSettings />,
      canContinue: true // Always allow continuing from settings step
    },
    {
      id: 'summary',
      title: t('setup.gameSummary'),
      component: <GameSummary />,
      canContinue: true // Always allow continuing from summary step
    }
  ];
  
  // Go to next step
  const handleNextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleStartGame();
    }
  };
  
  // Go to previous step
  const handlePreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      navigate('/');
    }
  };

  // Start the game
  const handleStartGame = async () => {
    setIsLoading(true);
    
    try {
      // Validate that the number of custom challenges doesn't exceed the total selected challenges
      const selectedCustomChallenges = stateRef.current.customChallenges.filter(c => c.isSelected);
      
      // Get max challenges from game duration if type is 'challenges', otherwise default to 15
      const maxChallenges = stateRef.current.gameDuration.type === 'challenges' 
        ? stateRef.current.gameDuration.value 
        : 15; // Default to 15 if not set
      
      if (selectedCustomChallenges.length > maxChallenges) {
        throw new Error('Too many custom challenges selected');
      }
      
      // The challenges should already be loaded in the GameSummary step
      if (stateRef.current.challenges.length === 0) {
        // As a fallback, load default challenges if they're not already loaded
        console.log("Fallback: Loading default challenges");
        const defaultChallenges = generateDefaultChallenges();
        
        // Dispatch challenges and wait for state to update
        await new Promise<void>((resolve) => {
          dispatch({
            type: 'LOAD_CHALLENGES',
            payload: defaultChallenges as unknown as Challenge[]
          });
          
          // Create an interval to check state updates
          const checkInterval = setInterval(() => {
            if (stateRef.current.challenges.length > 0) {
              clearInterval(checkInterval);
              resolve();
            }
          }, 100);
          
          // Set a timeout to prevent infinite checking
          setTimeout(() => {
            clearInterval(checkInterval);
            if (stateRef.current.challenges.length === 0) {
              console.error('Timeout waiting for challenges to load');
              resolve(); // Resolve anyway to prevent hanging
            }
          }, 5000);
        });
      }
      
      // Final verification that challenges are loaded
      if (stateRef.current.challenges.length === 0) {
        throw new Error('Failed to load challenges');
      }
      
      // Mark that this is a new game (this will be used in Game.tsx)
      localStorage.setItem('isNewGameStart', 'true');
      
      // Clear the saved step when the game starts
      clearSavedStep();
      
      // Start the game
      dispatch({ type: 'START_GAME' });
      
      // Save game to Supabase
      await saveGameToSupabase();
      
      // Navigate to game screen
      navigate('/game');
    } catch (error) {
      console.error('Error starting game:', error);
      if (error instanceof Error && error.message === 'Too many custom challenges selected') {
        const maxChallenges = stateRef.current.gameDuration.type === 'challenges' 
          ? stateRef.current.gameDuration.value 
          : 15;
        alert(`Failed to start game: You have selected more custom challenges than the total challenges limit (${maxChallenges}). Please reduce the number of custom challenges or increase the challenge limit in settings.`);
      } else {
        alert('Failed to start game: Could not load challenges');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Get current step content with latest canContinue value
  const getCurrentStepData = () => {
    const step = steps[currentStep];
    
    // Recalculate canContinue for current step
    if (step.id === 'players') {
      return {
        ...step,
        canContinue: state.players.length >= MIN_PLAYERS
      };
    } else if (step.id === 'teams') {
      // Directly call canContinueFromTeamsStep to get the latest validation
      // This ensures we're getting the real-time status from the teamCreationRef
      const canContinue = canContinueFromTeamsStep();
      return {
        ...step,
        canContinue
      };
    }
    
    return step;
  };
  
  // Force re-validation when game mode or teams change
  const [forceUpdate, setForceUpdate] = useState(false);
  
  useEffect(() => {
    // When game mode or teams change, trigger a re-render to update validation
    // This ensures the canContinue logic is reevaluated after navigation
    setForceUpdate(prev => !prev);
  }, [state.gameMode, state.teams.length, currentStep]);
  
  const currentStepData = getCurrentStepData();
  
  return (
    <div className="min-h-screen py-8 px-4 relative">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
            {t('setup.title')}
          </h1>
        </motion.div>
        
        {/* Steps progress */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-2">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                {/* Step circle and title */}
                <div className="flex flex-col items-center">
                  <div 
                    className={`
                      relative w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg mb-2
                      ${currentStep >= index ? 'bg-game-primary text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}
                    `}
                  >
                    {index + 1}
                  </div>
                  <div 
                    className={`
                      text-xs font-medium text-center max-w-[100px]
                      ${currentStep >= index ? 'text-game-primary' : 'text-gray-500 dark:text-gray-400'}
                    `}
                  >
                    {step.title}
                  </div>
                </div>
                
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div className="flex-1 h-1 mx-1 mt-5">
                    <div 
                      className={`
                        h-full
                        ${currentStep > index ? 'bg-game-primary' : 'bg-gray-200 dark:bg-gray-700'}
                      `}
                    />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
        
        {/* Current step content */}
        <motion.div
          key={currentStepData.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="mb-8"
        >
          {currentStepData.component}
        </motion.div>
        
        {/* Side navigation arrows for larger screens */}
        <div className="hidden xl:block">
          {/* Left (back) arrow */}
          <button
            className={`fixed left-6 top-1/2 transform -translate-y-1/2 bg-white dark:bg-gray-800 rounded-full shadow-xl p-4 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-game-primary transition-all ${currentStep === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'}`}
            onClick={handlePreviousStep}
            disabled={currentStep === 0}
            aria-label={currentStep === 0 ? t('common.home') : t('common.back')}
          >
            <svg className="w-8 h-8 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          {/* Right (next) arrow */}
          <button 
            className={`fixed right-6 top-1/2 transform -translate-y-1/2 ${!currentStepData.canContinue ? 'bg-gray-100 dark:bg-gray-800 opacity-50 cursor-not-allowed' : currentStep < steps.length - 1 ? 'bg-game-primary hover:bg-game-primary-dark hover:scale-110' : 'bg-pastel-green hover:bg-pastel-green/90 hover:scale-110'} ${currentStep === steps.length - 1 ? 'flex items-center px-6 animate-pulse-glow' : ''} rounded-full shadow-xl p-4 focus:outline-none focus:ring-2 focus:ring-game-primary transition-all`}
            onClick={handleNextStep}
            disabled={!currentStepData.canContinue || isLoading}
            aria-label={currentStep < steps.length - 1 ? t('common.next') : t('common.startGame')}
          >
            {isLoading ? (
              <div className="w-8 h-8 border-4 border-gray-200 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <svg className={`${currentStep === steps.length - 1 ? 'w-6 h-6 mr-2' : 'w-8 h-8'} text-white`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  {currentStep < steps.length - 1 ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  ) : (
                    <>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </>
                  )}
                </svg>
                {currentStep === steps.length - 1 && (
                  <span className="font-bold text-gray-800 whitespace-nowrap">{t('common.startGame')}</span>
                )}
              </>
            )}
          </button>
        </div>
        
        {/* Bottom navigation buttons (mobile/smaller screens) */}
        <div className="flex justify-between mt-10 xl:hidden">
          <Button
            variant="secondary"
            onClick={handlePreviousStep}
            leftIcon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            }
          >
            {currentStep === 0 ? t('common.home') : t('common.back')}
          </Button>
          
          <Button
            variant={currentStep < steps.length - 1 ? "primary" : "success"}
            onClick={handleNextStep}
            isLoading={isLoading}
            isDisabled={!currentStepData.canContinue}
            className={currentStep === steps.length - 1 ? "animate-pulse-glow" : ""}
            rightIcon={
              currentStep < steps.length - 1 ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )
            }
          >
            {currentStep < steps.length - 1 ? t('common.next') : (
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {t('common.startGame')}
              </div>
            )}
          </Button>
        </div>
        
        {/* Error messages */}
        <div className="mt-4 md:mb-20 pb-8">
          {!currentStepData.canContinue && currentStep === 0 && (
            <p className="text-center text-amber-600 dark:text-amber-400 text-sm mt-4">
              {t('setup.needMinPlayers', { count: MIN_PLAYERS })}
            </p>
          )}

          {!currentStepData.canContinue && currentStep === 1 && state.gameMode === GameMode.TEAMS && (
            <p className="text-center text-amber-600 dark:text-amber-400 text-sm mt-4">
              {t('setup.needToCreateTeams')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Setup;