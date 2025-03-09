import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useGame } from '@/contexts/GameContext';
import { GameMode } from '@/types/Team';
import { Challenge } from '@/types/Challenge';
import Button from '@/components/common/Button';
import { ConfirmModal } from '@/components/common/Modal';
import CustomChallengeForm from '@/components/game/CustomChallengeForm';

const GameSettings: React.FC = () => {
  const { t } = useTranslation();
  const { state, dispatch } = useGame();
  const [durationType, setDurationType] = useState(state.gameDuration.type);
  const [durationValue, setDurationValue] = useState(state.gameDuration.value);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showCustomChallengeForm, setShowCustomChallengeForm] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | undefined>(undefined);
  
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
          
          {/* Custom Challenges List */}
          {state.customChallenges.length > 0 && (
            <div className="mb-6 space-y-4">
              {state.customChallenges.map((challenge) => (
                <div
                  key={challenge.id}
                  className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-800 dark:text-white">
                        {challenge.title}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        {challenge.description}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-game-secondary/10 text-game-secondary">
                          {challenge.type === 'individual' 
                            ? t('game.challengeTypes.individual')
                            : challenge.type === 'oneOnOne'
                              ? t('game.challengeTypes.oneOnOne')
                              : t('game.challengeTypes.team')}
                        </span>
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-game-primary/10 text-game-primary">
                          {Array(challenge.difficulty).fill('⭐').join('')}
                        </span>
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-game-accent/10 text-game-accent">
                          {challenge.points} {challenge.points === 1 ? t('common.point') : t('common.points')}
                        </span>
                        {challenge.category && (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300">
                            {challenge.category}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingChallenge(challenge);
                          setShowCustomChallengeForm(true);
                        }}
                        className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 p-1"
                        title={t('common.edit')}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => {
                          dispatch({
                            type: 'REMOVE_CUSTOM_CHALLENGE',
                            payload: challenge.id
                          });
                        }}
                        className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 p-1"
                        title={t('common.delete')}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex justify-center">
            <Button
              variant="secondary"
              size="lg"
              onClick={() => {
                setEditingChallenge(undefined);
                setShowCustomChallengeForm(true);
              }}
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

      {/* Custom Challenge Form Modal */}
      <CustomChallengeForm
        isOpen={showCustomChallengeForm}
        onClose={() => {
          setShowCustomChallengeForm(false);
          setEditingChallenge(undefined);
        }}
        editChallenge={editingChallenge}
      />
    </div>
  );
};

export default GameSettings;