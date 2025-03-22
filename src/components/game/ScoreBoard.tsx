import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Player } from '@/types/Player';
import { Team, GameMode } from '@/types/Team';
import { calculateStandings } from '@/utils/helpers';
import PlayerCard from '@/components/common/PlayerCard';

interface ScoreBoardProps {
  players: Player[];
  teams: Team[];
  gameMode: GameMode;
  maxToShow?: number;
  showTitle?: boolean;
  className?: string;
}

const ScoreBoard: React.FC<ScoreBoardProps> = ({
  players,
  teams,
  gameMode,
  maxToShow = 5,
  showTitle = true,
  className = ''
}) => {
  const { t } = useTranslation();
  // Always show all standings
  const standings = calculateStandings(players, teams, gameMode);
  const displayStandings = standings;
  
  // Store previous standings for animation comparison
  const prevStandingsRef = useRef<typeof standings>([]);
  useEffect(() => {
    prevStandingsRef.current = standings;
  }, [standings]);
  
  // Get team members
  const getTeamMembers = (teamId: string): Player[] => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return [];
    return players.filter(player => team.playerIds.includes(player.id));
  };

  // Get player by id
  const getPlayerById = (playerId: string): Player | undefined => {
    return players.find(player => player.id === playerId);
  };
  
  // Animation variants
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  
  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  // Get previous ranking of an entry
  const getPreviousRanking = (id: string) => {
    const prevIndex = prevStandingsRef.current.findIndex(entry => entry.id === id);
    return prevIndex !== -1 ? prevIndex : null;
  };
  
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden ${className}`}>
      {showTitle && (
        <div className="bg-game-primary text-white p-4">
          <h2 className="text-xl font-bold text-center">
            {t('results.currentStandings')}
          </h2>
        </div>
      )}
      
      <motion.div
        className="divide-y divide-gray-200 dark:divide-gray-700 overflow-y-auto max-h-[70vh]"
        variants={container}
        initial="hidden"
        animate="show"
      >
        <AnimatePresence initial={false}>
          {displayStandings.map((entry, index) => {
            const previousRanking = getPreviousRanking(entry.id);
            const hasRankingChanged = previousRanking !== null && previousRanking !== index;
            
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ 
                  opacity: 1, 
                  y: 0,
                  transition: { 
                    type: "spring", 
                    stiffness: 500, 
                    damping: 30, 
                    mass: 1
                  }
                }}
                exit={{ opacity: 0, y: -20 }}
                layout
                className={`${index === 0 ? 'bg-pastel-yellow bg-opacity-30' : ''} ${
                  hasRankingChanged ? (previousRanking! < index ? 'border-l-4 border-red-500' : 'border-l-4 border-green-500') : ''
                }`}
              >
                {/* Main entry row */}
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center">
                    <div className={`
                      w-8 h-8 flex items-center justify-center rounded-full mr-3
                      ${index === 0 ? 'bg-game-accent text-gray-800' : 
                        index === 1 ? 'bg-gray-400 text-gray-800' : 
                        index === 2 ? 'bg-amber-700 text-white' : 'bg-white text-gray-800'}
                      font-bold
                    `}>
                      {index + 1}
                    </div>
                    
                    {/* Display player image in free for all mode */}
                    {gameMode === GameMode.FREE_FOR_ALL && entry.type === 'player' && (
                      <div className="w-10 h-10 mr-3 overflow-hidden rounded-full">
                        {(() => {
                          const player = getPlayerById(entry.id);
                          if (player) {
                            return (
                              <img 
                                src={player.image} 
                                alt={player.name} 
                                className="w-full h-full object-cover"
                              />
                            );
                          }
                          return null;
                        })()}
                      </div>
                    )}
                    
                    <div>
                      <span className="font-medium text-gray-800 dark:text-white">
                        {entry.name}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                        {entry.type === 'team' ? t('common.team') : t('common.player')}
                      </span>
                      
                      {hasRankingChanged && (
                        <motion.span 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className={`ml-2 text-xs font-medium ${previousRanking! < index ? 'text-red-500' : 'text-green-500'}`}
                        >
                          {previousRanking! < index ? '↓' : '↑'} 
                          {Math.abs(previousRanking! - index)}
                        </motion.span>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-lg font-bold">
                    <motion.span 
                      className="bg-game-secondary bg-opacity-20 text-game-secondary px-3 py-1 rounded-full inline-block"
                      animate={{ 
                        scale: [1, 1.1, 1],
                      }}
                      transition={{
                        duration: 0.3,
                        ease: "easeInOut"
                      }}
                    >
                      {entry.score}
                    </motion.span>
                  </div>
                </div>
                
                {/* Team Members Section - Always visible for teams */}
                {entry.type === 'team' && (
                  <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3">
                    <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                      {t('common.teamMembers')}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {getTeamMembers(entry.id).map(player => (
                        <PlayerCard
                          key={player.id}
                          player={player}
                          size="xs"
                          showScore={false}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
        
        {displayStandings.length === 0 && (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            {t('game.noScoresYet')}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ScoreBoard;