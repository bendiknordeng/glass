import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/contexts/GameContext';
import { GameMode } from '@/types/Team';
import { generateDefaultChallenges } from '@/utils/challengeGenerator';
import { Challenge } from '@/types/Challenge';

const GameSummary: React.FC = () => {
  const { t } = useTranslation();
  const { state, dispatch } = useGame();
  const [isValidating, setIsValidating] = useState(false);
  const [standardChallengesLoaded, setStandardChallengesLoaded] = useState(false);
  
  // Add state variables to store challenge counts
  const [standardChallengesCount, setStandardChallengesCount] = useState(0);
  const [customChallengesCount, setCustomChallengesCount] = useState(0);
  const [totalChallengesCount, setTotalChallengesCount] = useState(0);

  // Load standard challenges if they're not already loaded
  useEffect(() => {
    const loadStandardChallenges = async () => {
      if (state.challenges.length === 0) {
        setIsValidating(true);
        const defaultChallenges = generateDefaultChallenges();
        
        dispatch({
          type: 'LOAD_CHALLENGES',
          payload: defaultChallenges as unknown as Challenge[]
        });
        
        setStandardChallengesLoaded(true);
        setIsValidating(false);
      } else {
        setStandardChallengesLoaded(true);
      }
    };

    loadStandardChallenges();
  }, []);

  // Calculate challenge counts whenever related state changes
  useEffect(() => {
    // Count standard challenges (challenges in state.challenges array)
    const standardCount = state.challenges.length;
    
    // Count ALL selected custom challenges
    const customCount = state.customChallenges.filter(c => 
      c.isSelected
    ).length;
    
    // Update state with calculated counts
    setStandardChallengesCount(standardCount);
    setCustomChallengesCount(customCount);
    setTotalChallengesCount(standardCount + customCount);
    
  }, [state.challenges, state.customChallenges]);

  // Format the expected duration text
  const formatDuration = () => {
    if (state.gameDuration.type === 'time') {
      return `${state.gameDuration.value} ${t('setup.minutes')}`;
    } else {
      return `${state.gameDuration.value} ${t('setup.challenges')}`;
    }
  };

  // Get gameplay mode text
  const getGameModeText = () => {
    return state.gameMode === GameMode.FREE_FOR_ALL 
      ? t('setup.freeForAll')
      : t('setup.teamMode');
  };

  // Check if all validations are passing
  const hasEnoughPlayers = state.players.length >= 2;
  const hasTeamsCreated = state.gameMode === GameMode.FREE_FOR_ALL || state.teams.length >= 2;
  const hasStandardChallenges = standardChallengesLoaded && standardChallengesCount > 0;
  const hasSelectedCustomChallenges = customChallengesCount > 0;

  return (
    <div className="mx-auto w-full max-w-4xl px-4">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 relative">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-game-primary to-purple-500 dark:from-game-primary dark:to-purple-400">
            {t('setup.gameSummary')}
          </span>
          <motion.div 
            className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-game-primary to-purple-500 dark:from-game-primary dark:to-purple-400 rounded-full" 
            initial={{ width: 0 }}
            animate={{ width: '40%' }}
            transition={{ duration: 0.8, delay: 0.2 }}
          />
        </h2>
        
        {/* Hero section with players/teams visualization */}
        <motion.div 
          className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-lg overflow-hidden mb-8"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="p-6 pb-0 flex flex-col md:flex-row items-center justify-between">
            <div className="mb-6 md:mb-0">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                {state.gameMode === GameMode.FREE_FOR_ALL 
                  ? t('setup.freeForAll') 
                  : t('setup.teamMode')
                }
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {state.gameMode === GameMode.FREE_FOR_ALL
                  ? t('setup.allPlayersIndividual')
                  : `${state.teams.length} ${t('setup.teams')}`
                }
              </p>
              <div className="mt-3 flex items-center">
                <span className="px-3 py-1 bg-game-primary/10 text-game-primary dark:bg-game-primary/20 rounded-full text-sm font-medium">
                  {formatDuration()}
                </span>
                <span className="ml-2 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full text-sm font-medium">
                  {totalChallengesCount} {totalChallengesCount === 1 ? t('setup.challenge') : t('setup.challenges')}
                </span>
              </div>
            </div>
            
            <div className="flex flex-wrap justify-center">
              {state.gameMode === GameMode.FREE_FOR_ALL ? (
                <div className="flex flex-wrap justify-center">
                  {state.players.slice(0, 5).map((player, index) => (
                    <motion.div 
                      key={player.id}
                      className="relative"
                      initial={{ opacity: 0, scale: 0.8, x: -10 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                      <div 
                        className={`w-14 h-14 rounded-full border-2 border-white dark:border-gray-800 shadow-md overflow-hidden -ml-3 first:ml-0 bg-gray-200 ${index === 0 ? 'z-50' : index === 1 ? 'z-40' : index === 2 ? 'z-30' : index === 3 ? 'z-20' : 'z-10'}`}
                      >
                        {player.image ? (
                          <img src={player.image} alt={player.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-game-primary/20 flex items-center justify-center text-game-primary text-xl font-medium">
                            {player.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                  
                  {state.players.length > 5 && (
                    <motion.div 
                      className="w-14 h-14 rounded-full flex items-center justify-center bg-gray-200 dark:bg-gray-700 border-2 border-white dark:border-gray-800 -ml-3 shadow-md z-0"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: 0.5 }}
                    >
                      <span className="text-gray-600 dark:text-gray-300 text-sm font-medium">+{state.players.length - 5}</span>
                    </motion.div>
                  )}
                </div>
              ) : (
                <div className="flex space-x-3">
                  {state.teams.slice(0, 3).map((team, index) => (
                    <motion.div 
                      key={team.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="flex items-center px-3 py-2 rounded-lg shadow-sm"
                      style={{ backgroundColor: `${team.color}20` }}
                    >
                      <div 
                        className="w-4 h-4 rounded-full mr-2"
                        style={{ backgroundColor: team.color }}
                      ></div>
                      <span className="font-medium text-gray-800 dark:text-white">{team.name}</span>
                    </motion.div>
                  ))}
                  
                  {state.teams.length > 3 && (
                    <motion.div 
                      className="flex items-center px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg shadow-sm"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.4 }}
                    >
                      <span className="text-gray-600 dark:text-gray-300 text-sm">+{state.teams.length - 3}</span>
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Wave decoration */}
          <div className="h-16 relative mt-4">
            <svg className="absolute bottom-0 w-full h-16 text-indigo-50 dark:text-gray-800" viewBox="0 0 1440 120" preserveAspectRatio="none">
              <path className="fill-current" d="M0 120h1440V30.75c-148.63 44.14-356.23 66-544.742 66C507.907 96.75 301.716 70.185 0 0v120z"></path>
            </svg>
          </div>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Players & Teams */}
          <motion.div 
            className="md:col-span-7 bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center">
                {state.gameMode === GameMode.FREE_FOR_ALL ? (
                  <>
                    <svg className="w-5 h-5 mr-2 text-game-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    {t('common.players')}
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2 text-game-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    {t('setup.teams')}
                  </>
                )}
              </h3>
              
              {state.gameMode === GameMode.FREE_FOR_ALL ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {state.players.map((player, index) => (
                      <motion.div 
                        key={player.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="flex items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700"
                      >
                        <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden mr-3 flex-shrink-0 border border-gray-100 dark:border-gray-600 shadow-sm">
                          {player.image ? (
                            <img 
                              src={player.image} 
                              alt={player.name} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-game-primary/20 flex items-center justify-center text-game-primary">
                              {player.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                          {player.name}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {state.teams.map((team, teamIndex) => (
                    <motion.div 
                      key={team.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: teamIndex * 0.1 }}
                      className="p-4 rounded-lg border dark:border-gray-700"
                      style={{ backgroundColor: `${team.color}15` }}
                    >
                      <div className="flex items-center mb-3">
                        <div 
                          className="w-5 h-5 rounded-full mr-2 shadow-sm"
                          style={{ backgroundColor: team.color }}
                        ></div>
                        <h4 className="font-medium text-gray-800 dark:text-white">{team.name}</h4>
                        <span className="ml-auto text-sm text-gray-500 dark:text-gray-400 bg-white/60 dark:bg-black/20 px-2 py-0.5 rounded">
                          {team.playerIds.length} {team.playerIds.length === 1 ? t('common.player') : t('common.players')}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {team.playerIds.map((playerId, playerIndex) => {
                          const player = state.players.find(p => p.id === playerId);
                          if (!player) return null;
                          
                          return (
                            <motion.div 
                              key={player.id}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.3, delay: 0.2 + (playerIndex * 0.05) }}
                              className="flex items-center py-1.5 px-3 bg-white dark:bg-gray-700 rounded-full shadow-sm border border-gray-100 dark:border-gray-600"
                            >
                              {player.image && (
                                <div className="w-6 h-6 rounded-full overflow-hidden mr-2 border border-gray-100 dark:border-gray-600">
                                  <img src={player.image} alt={player.name} className="w-full h-full object-cover" />
                                </div>
                              )}
                              <span className="text-sm text-gray-700 dark:text-gray-200 truncate">
                                {player.name}
                              </span>
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
          
          {/* Challenges & Validation */}
          <motion.div 
            className="md:col-span-5 space-y-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            {/* Challenges */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-game-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                {t('setup.challenges')}
              </h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 px-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      {t('setup.challengesCount')}
                    </span>
                  </div>
                  <div className="text-lg font-semibold bg-white dark:bg-gray-800 py-1 px-3 rounded-md shadow-sm border border-gray-100 dark:border-gray-700">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-game-primary to-purple-600">
                      {state.gameDuration.type === 'challenges' ? state.gameDuration.value : '∞'}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        {t('setup.standardChallenges')}
                      </span>
                      <motion.div 
                        className="flex items-center justify-center w-8 h-8 bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-100 dark:border-gray-700"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.3, delay: 0.3 }}
                      >
                        {isValidating ? (
                          <div className="w-4 h-4 rounded-full border-2 border-gray-300 border-t-gray-500 animate-spin"></div>
                        ) : (
                          <span className="font-semibold text-game-primary">
                            {standardChallengesCount}
                          </span>
                        )}
                      </motion.div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        {t('setup.customChallenges')}
                      </span>
                      <motion.div 
                        className="flex items-center justify-center w-8 h-8 bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-100 dark:border-gray-700"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.3, delay: 0.4 }}
                      >
                        <span className="font-semibold text-purple-600 dark:text-purple-400">
                          {customChallengesCount}
                        </span>
                      </motion.div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Game Validation */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-game-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t('setup.gameValidation')}
              </h3>
              
              <div className="space-y-3">
                <motion.div 
                  className="flex items-center p-3 rounded-lg border"
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  style={{ 
                    borderColor: hasEnoughPlayers ? '#86efac' : '#fca5a5',
                    backgroundColor: hasEnoughPlayers ? 'rgba(134, 239, 172, 0.1)' : 'rgba(252, 165, 165, 0.1)'
                  }}
                >
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full mr-3 flex items-center justify-center ${hasEnoughPlayers ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                    {hasEnoughPlayers ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm font-medium" style={{ color: hasEnoughPlayers ? '#059669' : '#dc2626' }}>
                    {t('setup.enoughPlayers')} {hasEnoughPlayers ? '' : `(${state.players.length}/2)`}
                  </span>
                </motion.div>
                
                {state.gameMode === GameMode.TEAMS && (
                  <motion.div 
                    className="flex items-center p-3 rounded-lg border"
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                    style={{ 
                      borderColor: hasTeamsCreated ? '#86efac' : '#fca5a5',
                      backgroundColor: hasTeamsCreated ? 'rgba(134, 239, 172, 0.1)' : 'rgba(252, 165, 165, 0.1)'
                    }}
                  >
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full mr-3 flex items-center justify-center ${hasTeamsCreated ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                      {hasTeamsCreated ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm font-medium" style={{ color: hasTeamsCreated ? '#059669' : '#dc2626' }}>
                      {t('setup.teamsCreated')}
                    </span>
                  </motion.div>
                )}
                
                <motion.div 
                  className="flex items-center p-3 rounded-lg border"
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.3 }}
                  style={{ 
                    borderColor: hasStandardChallenges ? '#86efac' : '#fcd34d',
                    backgroundColor: hasStandardChallenges ? 'rgba(134, 239, 172, 0.1)' : 'rgba(252, 211, 77, 0.1)'
                  }}
                >
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full mr-3 flex items-center justify-center ${hasStandardChallenges ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                    {hasStandardChallenges ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : isValidating ? (
                      <div className="w-3 h-3 rounded-full border-2 border-amber-300 border-t-amber-500 animate-spin"></div>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm font-medium" style={{ color: hasStandardChallenges ? '#059669' : '#b45309' }}>
                    {hasStandardChallenges ? t('setup.standardChallenges') : isValidating ? t('common.loading') : t('setup.noStandardChallenges')}
                  </span>
                </motion.div>
                
                <motion.div 
                  className="flex items-center p-3 rounded-lg border"
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.4 }}
                  style={{ 
                    borderColor: hasSelectedCustomChallenges ? '#86efac' : '#e5e7eb',
                    backgroundColor: hasSelectedCustomChallenges ? 'rgba(134, 239, 172, 0.1)' : 'rgba(229, 231, 235, 0.1)'
                  }}
                >
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full mr-3 flex items-center justify-center ${hasSelectedCustomChallenges ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700/50 dark:text-gray-400'}`}>
                    {hasSelectedCustomChallenges ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm font-medium" style={{ color: hasSelectedCustomChallenges ? '#059669' : '#6b7280' }}>
                    {hasSelectedCustomChallenges ? t('setup.customChallenges') : t('setup.noCustomChallenges')}
                  </span>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
        
        {/* Auto-save note */}
        <motion.div 
          className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-100 dark:border-blue-800 shadow-sm"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
        >
          <div className="flex items-start">
            <div className="bg-white dark:bg-gray-800 p-2 rounded-full shadow mr-3 flex-shrink-0">
              <svg className="w-5 h-5 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                {t("setup.allChangesAutoSaved")}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                {t("setup.clickNextToStart")}
              </p>
            </div>
          </div>
        </motion.div>
        
        {/* Start game button for visual emphasis */}
        <motion.div 
          className="mt-8 text-center hidden"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <button className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transform transition hover:scale-105 active:scale-95">
            {t('common.startGame')}
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default GameSummary; 