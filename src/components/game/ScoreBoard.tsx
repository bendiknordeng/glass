import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Player } from '@/types/Player';
import { Team, GameMode } from '@/types/Team';
import { calculateStandings } from '@/utils/helpers';

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
  const standings = calculateStandings(players, teams, gameMode);
  const displayStandings = maxToShow > 0 ? standings.slice(0, maxToShow) : standings;
  
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
        className="divide-y divide-gray-200 dark:divide-gray-700"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {displayStandings.map((entry, index) => (
          <motion.div 
            key={entry.id}
            className={`
              flex items-center justify-between p-4
              ${index === 0 ? 'bg-pastel-yellow bg-opacity-30' : ''}
            `}
            variants={item}
          >
            <div className="flex items-center">
              <div className={`
                w-8 h-8 flex items-center justify-center rounded-full mr-3
                ${index === 0 ? 'bg-game-accent text-gray-800' : 
                  index === 1 ? 'bg-gray-300 text-gray-800' : 
                  index === 2 ? 'bg-amber-700 text-white' : 'bg-gray-200 text-gray-500'}
                font-bold
              `}>
                {index + 1}
              </div>
              
              <div>
                <span className="font-medium text-gray-800 dark:text-white">
                  {entry.name}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                  {entry.type === 'team' ? t('game.team') : t('game.player')}
                </span>
              </div>
            </div>
            
            <div className="text-lg font-bold">
              <span className="bg-game-secondary bg-opacity-20 text-game-secondary px-3 py-1 rounded-full">
                {entry.score}
              </span>
            </div>
          </motion.div>
        ))}
        
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