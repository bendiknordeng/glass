import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useGame } from '@/contexts/GameContext';
import { generateDefaultChallenges } from '@/utils/challengeGenerator';
import Button from '@/components/common/Button';
import PlayerRegistration from '@/components/setup/PlayerRegistration';
import TeamCreation from '@/components/setup/TeamCreation';
import GameSettings from '@/components/setup/GameSettings';

const Setup: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state, dispatch } = useGame();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const stateRef = useRef(state);
  
  // Keep ref updated with latest state
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  
  // Steps for setup process
  const MIN_PLAYERS = 2;

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
      component: <TeamCreation />,
      canContinue: true // Always allow continuing from teams step
    },
    {
      id: 'settings',
      title: t('setup.gameSettings'),
      component: <GameSettings />,
      canContinue: true // Always allow continuing from settings step
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
      // Load default challenges if not already loaded
      if (stateRef.current.challenges.length === 0) {
        const defaultChallenges = generateDefaultChallenges();
        
        // Dispatch challenges and wait for state to update
        await new Promise<void>((resolve) => {
          dispatch({
            type: 'LOAD_CHALLENGES',
            payload: defaultChallenges
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
      
      // Start the game
      dispatch({ type: 'START_GAME' });
      
      // Navigate to game screen
      navigate('/game');
    } catch (error) {
      console.error('Error starting game:', error);
      alert('Failed to start game: Could not load challenges');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Get current step content
  const currentStepData = steps[currentStep];
  
  return (
    <div className="min-h-screen py-8 px-4">
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
        
        {/* Navigation buttons */}
        <div className="flex justify-between mt-10">
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
            variant="primary"
            onClick={handleNextStep}
            isLoading={isLoading}
            isDisabled={!currentStepData.canContinue}
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
            {currentStep < steps.length - 1 ? t('common.next') : t('common.startGame')}
          </Button>
        </div>
        
        {!currentStepData.canContinue && currentStep === 0 && (
          <p className="text-center text-amber-600 dark:text-amber-400 text-sm mt-4">
            {t('setup.needMinPlayers', { count: MIN_PLAYERS })}
          </p>
        )}
      </div>
    </div>
  );
};

export default Setup;