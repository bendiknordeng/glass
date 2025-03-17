import React from 'react';
import { motion } from 'framer-motion';
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
  
  // Get team members
  const getTeamMembers = (teamId: string): Player[] => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return [];
    return players.filter(player => team.playerIds.includes(player.id));
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
        className="divide-y divide-gray-200 dark:divide-gray-700 overflow-y-auto max-h-[600px]"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {displayStandings.map((entry, index) => (
          <motion.div
            key={entry.id}
            variants={item}
            className={`${index === 0 ? 'bg-pastel-yellow bg-opacity-30' : ''}`}
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
                
                <div>
                  <span className="font-medium text-gray-800 dark:text-white">
                    {entry.name}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                    {entry.type === 'team' ? t('common.team') : t('common.player')}
                  </span>
                </div>
              </div>
              
              <div className="text-lg font-bold">
                <span className="bg-game-secondary bg-opacity-20 text-game-secondary px-3 py-1 rounded-full">
                  {entry.score}
                </span>
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