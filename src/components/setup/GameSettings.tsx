import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/contexts/GameContext';
import { GameMode } from '@/types/Team';
import { Challenge } from '@/types/Challenge';
import Button from '@/components/common/Button';
import { ConfirmModal } from '@/components/common/Modal';
import CustomChallengeForm from '@/components/game/CustomChallengeForm';

// Maximum number of recent custom challenges to store
const MAX_RECENT_CHALLENGES = 10;
const RECENT_CHALLENGES_KEY = 'recentCustomChallenges';

// Helper function to update recent challenges in local storage
const updateRecentChallenges = (newChallenge: Challenge) => {
  try {
    const recentChallenges = JSON.parse(localStorage.getItem(RECENT_CHALLENGES_KEY) || '[]');
    
    // Remove any existing challenge with the same title (case insensitive)
    const filteredChallenges = recentChallenges.filter(
      (challenge: Challenge) => challenge.title.toLowerCase() !== newChallenge.title.toLowerCase()
    );
    
    // Add new challenge to the beginning
    const updatedChallenges = [newChallenge, ...filteredChallenges].slice(0, MAX_RECENT_CHALLENGES);
    
    localStorage.setItem(RECENT_CHALLENGES_KEY, JSON.stringify(updatedChallenges));
  } catch (error) {
    console.error('Error updating recent challenges:', error);
  }
};

const GameSettings: React.FC = () => {
  const { t } = useTranslation();
  const { state, dispatch } = useGame();
  const [durationType, setDurationType] = useState(state.gameDuration.type);
  const [durationValue, setDurationValue] = useState(state.gameDuration.value);
  const [showCustomChallengeForm, setShowCustomChallengeForm] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | undefined>(undefined);
  const [recentChallenges, setRecentChallenges] = useState<Challenge[]>([]);
  
  // Helper function to get recent challenges from local storage
  const getRecentChallenges = (): Challenge[] => {
    try {
      const stored = localStorage.getItem(RECENT_CHALLENGES_KEY);
      if (!stored) return [];
      
      const challenges = JSON.parse(stored);
      // Filter out any challenges that are currently in the game (case insensitive)
      return challenges.filter((recentChallenge: Challenge) => 
        !state.customChallenges.some((currentChallenge: Challenge) => 
          currentChallenge.title.toLowerCase() === recentChallenge.title.toLowerCase()
        )
      );
    } catch (error) {
      console.error('Error reading recent challenges:', error);
      return [];
    }
  };
  
  // Load recent challenges on mount
  useEffect(() => {
    setRecentChallenges(getRecentChallenges());
  }, [state.customChallenges]); // Update when current challenges change
  
  // Auto-save when duration type or value changes
  useEffect(() => {
    dispatch({
      type: 'SET_GAME_DURATION',
      payload: {
        type: durationType,
        value: durationValue
      }
    });
  }, [durationType, durationValue, dispatch]);
  
  // Add a recent challenge to current game
  const handleAddRecentChallenge = (challenge: Challenge) => {
    dispatch({
      type: 'ADD_CUSTOM_CHALLENGE',
      payload: challenge
    });
    
    // Move this challenge to the top of recent challenges
    updateRecentChallenges(challenge);
    setRecentChallenges(getRecentChallenges());
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
          
          <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
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
                  <div className="flex items-center">
                    <input
                      id="challengeCount"
                      type="number"
                      min="1"
                      value={durationValue}
                      onChange={(e) => setDurationValue(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full py-2 px-3 text-center rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-game-primary focus:ring focus:ring-game-primary focus:ring-opacity-50 dark:bg-gray-700 dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="ml-3 text-gray-600 dark:text-gray-400 font-medium">
                      {t('challenges.challenges')}
                    </span>
                  </div>
                  
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setDurationValue(Math.max(1, durationValue - 5))}
                      className="flex-none py-1 px-2 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 transition-colors text-sm font-medium"
                    >
                      -5
                    </button>
                    <button
                      type="button"
                      onClick={() => setDurationValue(Math.max(1, durationValue - 1))}
                      className="flex-none py-1 px-2 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 transition-colors text-sm font-medium"
                    >
                      -1
                    </button>
                    <button
                      type="button"
                      onClick={() => setDurationValue(durationValue + 1)}
                      className="flex-none py-1 px-2 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 transition-colors text-sm font-medium"
                    >
                      +1
                    </button>
                    <button
                      type="button"
                      onClick={() => setDurationValue(durationValue + 5)}
                      className="flex-none py-1 px-2 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 transition-colors text-sm font-medium"
                    >
                      +5
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <label htmlFor="timeLimit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('setup.timeLimit')}
                  </label>
                  <div className="flex items-center">
                    <input
                      id="timeLimit"
                      type="number"
                      min="1"
                      value={durationValue}
                      onChange={(e) => setDurationValue(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full py-2 px-3 text-center rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-game-primary focus:ring focus:ring-game-primary focus:ring-opacity-50 dark:bg-gray-700 dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="ml-3 text-gray-600 dark:text-gray-400 font-medium">
                      {t('setup.minutes')}
                    </span>
                  </div>
                  
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setDurationValue(Math.max(1, durationValue - 30))}
                      className="flex-none py-1 px-2 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 transition-colors text-sm font-medium"
                    >
                      -30
                    </button>
                    <button
                      type="button"
                      onClick={() => setDurationValue(Math.max(1, durationValue - 15))}
                      className="flex-none py-1 px-2 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 transition-colors text-sm font-medium"
                    >
                      -15
                    </button>
                    <button
                      type="button"
                      onClick={() => setDurationValue(Math.max(1, durationValue - 5))}
                      className="flex-none py-1 px-2 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 transition-colors text-sm font-medium"
                    >
                      -5
                    </button>
                    <button
                      type="button"
                      onClick={() => setDurationValue(Math.max(1, durationValue - 1))}
                      className="flex-none py-1 px-2 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 transition-colors text-sm font-medium"
                    >
                      -1
                    </button>
                    <button
                      type="button"
                      onClick={() => setDurationValue(durationValue + 1)}
                      className="flex-none py-1 px-2 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 transition-colors text-sm font-medium"
                    >
                      +1
                    </button>
                    <button
                      type="button"
                      onClick={() => setDurationValue(durationValue + 5)}
                      className="flex-none py-1 px-2 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 transition-colors text-sm font-medium"
                    >
                      +5
                    </button>
                    <button
                      type="button"
                      onClick={() => setDurationValue(durationValue + 15)}
                      className="flex-none py-1 px-2 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 transition-colors text-sm font-medium"
                    >
                      +15
                    </button>
                    <button
                      type="button"
                      onClick={() => setDurationValue(durationValue + 30)}
                      className="flex-none py-1 px-2 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 transition-colors text-sm font-medium"
                    >
                      +30
                    </button>
                  </div>
                </div>
              )}
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
                          // Add to recent challenges when edited
                          updateRecentChallenges(challenge);
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
        
        {/* Recent Custom Challenges */}
        {recentChallenges.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-medium mb-4 text-gray-700 dark:text-gray-300">
              {t('challenges.recentCustomChallenges')}
            </h3>
            
            <div className="space-y-3">
              {recentChallenges.map((challenge) => (
                <motion.div
                  key={challenge.id}
                  className="bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600 cursor-pointer transition-colors"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => handleAddRecentChallenge(challenge)}
                >
                  <div>
                    <h4 className="font-medium text-gray-800 dark:text-white">
                      {challenge.title}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-1">
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
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Custom Challenge Form Modal */}
      <CustomChallengeForm
        isOpen={showCustomChallengeForm}
        onClose={() => {
          setShowCustomChallengeForm(false);
          setEditingChallenge(undefined);
          setRecentChallenges(getRecentChallenges());
        }}
        editChallenge={editingChallenge}
      />
    </div>
  );
};

export default GameSettings;