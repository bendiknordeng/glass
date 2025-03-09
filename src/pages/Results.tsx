import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import ReactConfetti from 'react-confetti';
import { useGame } from '@/contexts/GameContext';
import { calculateStandings } from '@/utils/helpers';
import Button from '@/components/common/Button';
import PlayerCard from '@/components/common/PlayerCard';
import TeamCard from '@/components/common/TeamCard';

// Constants for recent players storage
const MAX_RECENT_PLAYERS = 10;
const RECENT_PLAYERS_KEY = 'recentPlayers';

// Helper function to update recent players in local storage
const updateRecentPlayers = (players: any[]) => {
  try {
    const stored = localStorage.getItem(RECENT_PLAYERS_KEY);
    const existingPlayers = stored ? JSON.parse(stored) : [];
    
    // Process each player
    const updatedPlayers = players.reduce((acc: any[], player: any) => {
      // Skip if player has no name or image
      if (!player.name || !player.image) return acc;
      
      // Check if player already exists (case insensitive)
      const existingIndex = acc.findIndex(
        (p) => p.name.toLowerCase() === player.name.toLowerCase()
      );
      
      // If player exists, update their data
      if (existingIndex >= 0) {
        acc[existingIndex] = {
          ...player,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
        };
      } else {
        // Add new player
        acc.push({
          ...player,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          score: 0 // Reset score for storage
        });
      }
      
      return acc;
    }, existingPlayers);
    
    // Keep only the most recent MAX_RECENT_PLAYERS
    const finalPlayers = updatedPlayers.slice(0, MAX_RECENT_PLAYERS);
    
    localStorage.setItem(RECENT_PLAYERS_KEY, JSON.stringify(finalPlayers));
  } catch (error) {
    console.error('Error updating recent players:', error);
  }
};

const Results: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state, dispatch } = useGame();
  const [showConfetti, setShowConfetti] = useState(true);
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  
  // Redirect to home if no game finished
  useEffect(() => {
    if (!state.gameFinished && state.players.length === 0) {
      navigate('/');
    }
  }, [state.gameFinished, state.players.length, navigate]);
  
  // Update window size for confetti
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    
    window.addEventListener('resize', handleResize);
    
    // Stop confetti after 5 seconds
    const timer = setTimeout(() => {
      setShowConfetti(false);
    }, 5000);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, []);
  
  // Save players to recent players when game finishes
  useEffect(() => {
    if (state.gameFinished && state.players.length > 0) {
      updateRecentPlayers(state.players);
    }
  }, [state.gameFinished, state.players]);
  
  // Calculate standings
  const standings = calculateStandings(state.players, state.teams, state.gameMode);
  
  // Get winner(s)
  const winners = standings.length > 0 ? 
    standings.filter(entry => entry.score === standings[0].score) : 
    [];
  
  // Get game statistics
  const totalChallenges = state.results.length;
  const completedChallenges = state.results.filter(result => result.completed).length;
  const completionRate = totalChallenges > 0 ? 
    Math.round((completedChallenges / totalChallenges) * 100) : 0;
  
  // Get most common challenge type
  const getChallengeTypeCount = () => {
    const typeCounts: Record<string, number> = {};
    
    state.results.forEach(result => {
      const challenge = [...state.challenges, ...state.customChallenges]
        .find(c => c.id === result.challengeId);
      
      if (challenge) {
        typeCounts[challenge.type] = (typeCounts[challenge.type] || 0) + 1;
      }
    });
    
    let mostCommonType = '';
    let highestCount = 0;
    
    Object.entries(typeCounts).forEach(([type, count]) => {
      if (count > highestCount) {
        mostCommonType = type;
        highestCount = count;
      }
    });
    
    return {
      type: mostCommonType,
      count: highestCount
    };
  };
  
  const mostCommonChallengeType = getChallengeTypeCount();
  
  // Play again (reset game)
  const handlePlayAgain = () => {
    dispatch({ type: 'RESET_GAME' });
    navigate('/setup');
  };
  
  // Go back to home
  const handleBackToHome = () => {
    navigate('/');
  };
  
  return (
    <div className="min-h-screen py-8 px-4 relative overflow-hidden">
      {/* Confetti effect */}
      {showConfetti && (
        <ReactConfetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={500}
          gravity={0.05}
          colors={['#FF6B6B', '#4ECDC4', '#FFD166', '#A6D0DD', '#FFB6C1', '#B5EAD7']}
        />
      )}
      
      <div className="max-w-4xl mx-auto z-10 relative">
        {/* Header */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-2">
            {t('results.finalResults')}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            {t('results.gameComplete')}
          </p>
        </motion.div>
        
        {/* Winners Section */}
        {winners.length > 0 && (
          <motion.div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <h2 className="text-2xl font-bold text-center mb-6 text-game-primary">
              {winners.length === 1 ? t('results.winner') : t('results.winners')}
            </h2>
            
            <div className={`flex justify-center ${winners.length > 1 ? 'flex-wrap gap-6' : ''}`}>
              {winners.map((winner) => {
                if (winner.type === 'team') {
                  const team = state.teams.find(t => t.id === winner.id);
                  if (!team) return null;
                  
                  return (
                    <motion.div
                      key={winner.id}
                      className="transform"
                      animate={{
                        y: [0, -10, 0],
                        scale: [1, 1.05, 1]
                      }}
                      transition={{
                        repeat: Infinity,
                        repeatType: 'loop',
                        duration: 2
                      }}
                    >
                      <TeamCard
                        team={team}
                        players={state.players}
                        showPlayers={true}
                        size="lg"
                        animation="pulse"
                      />
                    </motion.div>
                  );
                } else {
                  const player = state.players.find(p => p.id === winner.id);
                  if (!player) return null;
                  
                  return (
                    <motion.div
                      key={winner.id}
                      className="transform"
                      animate={{
                        y: [0, -10, 0],
                        scale: [1, 1.05, 1]
                      }}
                      transition={{
                        repeat: Infinity,
                        repeatType: 'loop',
                        duration: 2
                      }}
                    >
                      <PlayerCard
                        player={player}
                        size="lg"
                        animation="pulse"
                      />
                    </motion.div>
                  );
                }
              })}
            </div>
            
            <div className="text-center mt-6">
              <motion.div
                className="inline-block bg-pastel-yellow text-gray-800 font-bold px-4 py-2 rounded-full"
                animate={{
                  boxShadow: [
                    '0 0 0 rgba(255, 209, 102, 0)',
                    '0 0 20px rgba(255, 209, 102, 0.8)',
                    '0 0 0 rgba(255, 209, 102, 0)'
                  ]
                }}
                transition={{
                  repeat: Infinity,
                  duration: 2
                }}
              >
                {winners[0].score} {t('common.points')}
              </motion.div>
              <h3 className="text-xl font-bold mt-4 text-gray-700 dark:text-gray-300">
                {t('results.congratulations')}
              </h3>
            </div>
          </motion.div>
        )}
        
        {/* Leaderboard */}
        <motion.div
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          <h2 className="text-2xl font-bold text-center mb-6 text-gray-800 dark:text-white">
            {t('results.finalStandings')}
          </h2>
          
          <div className="space-y-4">
            {standings.map((entry, index) => (
              <div
                key={entry.id}
                className={`
                  flex items-center justify-between p-4 rounded-lg
                  ${index === 0 ? 'bg-pastel-yellow bg-opacity-30' : 
                    index === 1 ? 'bg-gray-100 dark:bg-gray-700' :
                    index === 2 ? 'bg-amber-50 dark:bg-amber-900 dark:bg-opacity-20' : ''}
                `}
              >
                <div className="flex items-center">
                  <div className={`
                    w-8 h-8 flex items-center justify-center rounded-full mr-3 font-bold
                    ${index === 0 ? 'bg-amber-400 text-gray-800' : 
                      index === 1 ? 'bg-gray-300 text-gray-800' : 
                      index === 2 ? 'bg-amber-700 text-white' : 'bg-gray-200 text-gray-500 dark:bg-gray-600 dark:text-gray-300'}
                  `}>
                    {index + 1}
                  </div>
                  
                  <div>
                    <span className="font-medium text-gray-800 dark:text-white">
                      {entry.name}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                      {entry.type === 'team' ? t('common.team') : t('common.player')}
                    </span>
                  </div>
                </div>
                
                <div className="text-lg font-bold text-game-primary">
                  {entry.score} {t('common.points')}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
        
        {/* Game Stats */}
        <motion.div
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
        >
          <h2 className="text-2xl font-bold text-center mb-6 text-gray-800 dark:text-white">
            {t('results.gameStats')}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-game-primary mb-2">
                {totalChallenges}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t('results.totalChallenges')}
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-game-secondary mb-2">
                {completedChallenges}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t('results.completedChallenges')}
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-game-accent mb-2">
                {completionRate}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t('results.completionRate')}
              </div>
            </div>
          </div>
          
          <div className="mt-6 text-center text-gray-600 dark:text-gray-400">
            <p>
              {t('results.mostCommonChallengeType')}: {' '}
              <span className="font-medium text-gray-800 dark:text-white">
                {mostCommonChallengeType.type === 'individual' 
                  ? t('game.challengeTypes.individual')
                  : mostCommonChallengeType.type === 'oneOnOne'
                    ? t('game.challengeTypes.oneOnOne')
                    : t('game.challengeTypes.team')}
              </span>
            </p>
          </div>
        </motion.div>
        
        {/* Action Buttons */}
        <motion.div
          className="flex flex-col md:flex-row gap-4 justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.4 }}
        >
          <Button
            variant="primary"
            size="lg"
            onClick={handlePlayAgain}
            leftIcon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            }
          >
            {t('results.playAgain')}
          </Button>
          
          <Button
            variant="secondary"
            size="lg"
            onClick={handleBackToHome}
            leftIcon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            }
          >
            {t('results.backToHome')}
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default Results;