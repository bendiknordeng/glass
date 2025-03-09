import React from 'react';
import { motion } from 'framer-motion';
import { Team } from '@/types/Team';
import { Player } from '@/types/Player';
import PlayerCard from './PlayerCard';

interface TeamCardProps {
  team: Team;
  players: Player[];
  isSelected?: boolean;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
  showPlayers?: boolean;
  showScore?: boolean;
  size?: 'sm' | 'md' | 'lg';
  animation?: 'highlight' | 'pulse' | 'bounce' | 'none';
}

const TeamCard: React.FC<TeamCardProps> = ({
  team,
  players,
  isSelected = false,
  isActive = false,
  onClick,
  className = '',
  showPlayers = true,
  showScore = true,
  size = 'md',
  animation = 'none'
}) => {
  // Filter players that belong to this team
  const teamPlayers = players.filter(player => team.playerIds.includes(player.id));
  
  // Determine card size
  const sizeClasses = {
    sm: 'p-2 text-sm min-w-32',
    md: 'p-3 text-base min-w-48',
    lg: 'p-4 text-lg min-w-64'
  };
  
  // Animation variants
  const animationVariants = {
    highlight: {
      boxShadow: [
        '0 0 0 rgba(255, 215, 0, 0)',
        '0 0 20px rgba(255, 215, 0, 0.8)',
        '0 0 0 rgba(255, 215, 0, 0)'
      ],
      transition: { 
        repeat: Infinity,
        duration: 2
      }
    },
    pulse: {
      scale: [1, 1.02, 1],
      transition: { 
        repeat: Infinity,
        duration: 1.5
      }
    },
    bounce: {
      y: [0, -5, 0],
      transition: { 
        repeat: Infinity,
        duration: 1
      }
    },
    none: {}
  };
  
  return (
    <motion.div
      className={`
        relative rounded-lg overflow-hidden cursor-pointer
        ${isSelected ? 'ring-4 ring-game-accent' : ''}
        ${isActive ? 'bg-opacity-100' : 'bg-opacity-80'}
        ${sizeClasses[size]}
        ${className}
      `}
      style={{ backgroundColor: `var(--${team.color})` }}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      animate={animation !== 'none' ? animationVariants[animation] : undefined}
    >
      {/* Team Header */}
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-gray-800 dark:text-white">{team.name}</h3>
        
        {/* Score Badge (if showing score) */}
        {showScore && (
          <div className="bg-game-primary text-white rounded-full px-2 py-1 text-sm font-bold">
            {team.score} pts
          </div>
        )}
      </div>
      
      {/* Team Players */}
      {showPlayers && teamPlayers.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {teamPlayers.map(player => (
            <PlayerCard
              key={player.id}
              player={player}
              size="sm"
              showScore={false}
            />
          ))}
        </div>
      )}
      
      {/* Player Count */}
      <div className="text-sm text-gray-700 dark:text-gray-300 mt-2">
        {teamPlayers.length} player{teamPlayers.length !== 1 ? 's' : ''}
      </div>
    </motion.div>
  );
};

export default TeamCard;