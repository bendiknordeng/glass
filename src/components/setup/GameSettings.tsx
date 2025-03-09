import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useGame } from '@/contexts/GameContext';
import { GameMode } from '@/types/Team';
import Button from '@/components/common/Button';
import { ConfirmModal } from '@/components/common/Modal';

const GameSettings: React.FC = () => {
  const { t } = useTranslation();
  const { state, dispatch } = useGame();
  const [durationType, setDurationType] = useState(state.gameDuration.type);
  const [durationValue, setDurationValue] = useState(state.gameDuration.value);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  // Change game mode
  const handleGameModeChange = (mode: GameMode) => {
    dispatch({
      type: 'SET_GAME_MODE',
      payload: mode
    });
  };
  
  // Update game duration settings
  const handleSaveDuration = () => {
    dispatch({
      type: 'SET_GAME_DURATION',
      payload: {
        type: durationType,
        value: durationValue
      }
    });
  };
  
  // Reset game
  const handleResetGame = () => {
    dispatch({
      type: 'RESET_GAME'
    });
    setShowResetConfirm(false);
  };
  
  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white text-center">
        {t('setup.gameSettings')}
      </h2>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
        {/* Game Mode Selection */}
        <div className="mb-8">
          <h3 className="text-lg font-medium mb-4 text-gray-700 dark:text-gray-300">
            {t('setup.gameMode')}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              className={`
                flex flex-col items-center justify-center p-6 rounded-lg border-2 transition-all
                ${state.gameMode === GameMode.FREE_FOR_ALL ? 
                  'border-game-primary bg-game-primary bg-opacity-10' : 
                  'border-gray-200 dark:border-gray-700 hover:border-game-primary hover:bg-game-primary hover:bg-opacity-5'
                }
              `}
              onClick={() => handleGameModeChange(GameMode.FREE_FOR_ALL)}
            >
              <span className="text-xl font-bold mb-2 text-gray-800 dark:text-white">
                {t('setup.freeForAll')}
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400 text-center">
                {t('setup.everyPlayerForThemselves')}
              </span>
            </button>
            
            <button
              className={`
                flex flex-col items-center justify-center p-6 rounded-lg border-2 transition-all
                ${state.gameMode === GameMode.TEAMS ? 
                  'border-game-primary bg-game-primary bg-opacity-10' : 
                  'border-gray-200 dark:border-gray-700 hover:border-game-primary hover:bg-game-primary hover:bg-opacity-5'
                }
              `}
              onClick={() => handleGameModeChange(GameMode.TEAMS)}
            >
              <span className="text-xl font-bold mb-2 text-gray-800 dark:text-white">
                {t('setup.teams')}
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400 text-center">
                {t('setup.playInTeams')}
              </span>
            </button>
          </div>
        </div>
        
        {/* Game Duration */}
        <div className="mb-8">
          <h3 className="text-lg font-medium mb-4 text-gray-700 dark:text-gray-300">
            {t('setup.gameDuration')}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Duration Type */}
            <div>
              <div className="flex gap-4 mb-4">
                <button
                  className={`
                    flex-1 py-2 px-4 rounded-md transition-colors font-medium
                    ${durationType === 'challenges' ? 
                      'bg-game-secondary text-white' : 
                      'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }
                  `}
                  onClick={() => setDurationType('challenges')}
                >
                  {t('setup.byChallenges')}
                </button>
                
                <button
                  className={`
                    flex-1 py-2 px-4 rounded-md transition-colors font-medium
                    ${durationType === 'time' ? 
                      'bg-game-secondary text-white' : 
                      'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }
                  `}
                  onClick={() => setDurationType('time')}
                >
                  {t('setup.byTime')}
                </button>
              </div>
              
              {durationType === 'challenges' ? (
                <div>
                  <label htmlFor="challengeCount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('setup.numberOfChallenges')}
                  </label>
                  <select
                    id="challengeCount"
                    value={durationValue}
                    onChange={(e) => setDurationValue(parseInt(e.target.value))}
                    className="w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-game-primary focus:ring focus:ring-game-primary focus:ring-opacity-50 dark:bg-gray-700 dark:text-white"
                  >
                    <option value={10}>10 {t('challenges.challenges')}</option>
                    <option value={15}>15 {t('challenges.challenges')}</option>
                    <option value={20}>20 {t('challenges.challenges')}</option>
                    <option value={30}>30 {t('challenges.challenges')}</option>
                    <option value={50}>50 {t('challenges.challenges')}</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label htmlFor="timeLimit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('setup.timeLimit')}
                  </label>
                  <select
                    id="timeLimit"
                    value={durationValue}
                    onChange={(e) => setDurationValue(parseInt(e.target.value))}
                    className="w-full rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-game-primary focus:ring focus:ring-game-primary focus:ring-opacity-50 dark:bg-gray-700 dark:text-white"
                  >
                    <option value={15}>15 {t('setup.minutes')}</option>
                    <option value={30}>30 {t('setup.minutes')}</option>
                    <option value={45}>45 {t('setup.minutes')}</option>
                    <option value={60}>60 {t('setup.minutes')}</option>
                    <option value={90}>90 {t('setup.minutes')}</option>
                    <option value={120}>120 {t('setup.minutes')}</option>
                  </select>
                </div>
              )}
            </div>
            
            {/* Save Button */}
            <div className="flex items-end">
              <Button
                variant="primary"
                onClick={handleSaveDuration}
                className="w-full"
              >
                {t('common.save')} {t('setup.settings')}
              </Button>
            </div>
          </div>
        </div>
        
        {/* Custom Challenges */}
        <div className="mb-8">
          <h3 className="text-lg font-medium mb-2 text-gray-700 dark:text-gray-300">
            {t('challenges.customChallenges')}
          </h3>
          
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {t('challenges.createCustomChallengesDesc')}
          </p>
          
          <div className="flex justify-center">
            <Button
              variant="secondary"
              size="lg"
              leftIcon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              }
            >
              {t('challenges.createCustomChallenge')}
            </Button>
          </div>
        </div>
        
        {/* Reset Game */}
        <div className="mt-12 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <Button
              variant="danger"
              size="md"
              onClick={() => setShowResetConfirm(true)}
            >
              {t('settings.resetGame')}
            </Button>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {t('settings.resetGameWarning')}
            </p>
          </div>
        </div>
      </div>
      
      {/* Reset Confirmation Modal */}
      <ConfirmModal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={handleResetGame}
        title={t('settings.resetGame')}
        message={t('settings.resetConfirm')}
        confirmText={t('settings.reset')}
        cancelText={t('common.cancel')}
        confirmVariant="danger"
      />
    </div>
  );
};

export default GameSettings;