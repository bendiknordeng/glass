import React from 'react';
import { motion } from 'framer-motion';
import { Player } from '@/types/Player';
import { getPlayerImage } from '@/utils/helpers';

interface PlayerCardProps {
  player: Player;
  isSelected?: boolean;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
  showScore?: boolean;
  size?: 'sm' | 'md' | 'lg';
  animation?: 'highlight' | 'pulse' | 'bounce' | 'none';
}

const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  isSelected = false,
  isActive = false,
  onClick,
  className = '',
  showScore = true,
  size = 'md',
  animation = 'none'
}) => {
  // Determine card size
  const sizeClasses = {
    sm: 'w-16 h-16 text-xs',
    md: 'w-24 h-24 text-sm',
    lg: 'w-32 h-32 text-base'
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
      scale: [1, 1.05, 1],
      transition: { 
        repeat: Infinity,
        duration: 1.5
      }
    },
    bounce: {
      y: [0, -10, 0],
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
        relative rounded-lg overflow-hidden cursor-pointer transform transition-all duration-300
        ${sizeClasses[size]}
        ${isSelected ? 'ring-4 ring-game-accent scale-110 z-10' : ''}
        ${isActive ? 'bg-pastel-green' : 'bg-gray-100 dark:bg-gray-800'}
        ${className}
      `}
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      animate={animation !== 'none' ? animationVariants[animation] : undefined}
    >
      {/* Player Image */}
      <div className="w-full h-3/4 overflow-hidden">
        <img
          src={getPlayerImage(player.image, player.name)}
          alt={player.name}
          className="w-full h-full object-cover"
        />
      </div>
      
      {/* Player Name */}
      <div className="w-full h-1/4 flex items-center justify-center bg-white dark:bg-gray-700 p-1">
        <span className="truncate font-medium text-center dark:text-white">
          {player.name}
        </span>
      </div>
      
      {/* Score Badge (if showing score) */}
      {showScore && (
        <div className="absolute top-1 right-1 bg-game-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
          {player.score}
        </div>
      )}
    </motion.div>
  );
};

export default PlayerCard;