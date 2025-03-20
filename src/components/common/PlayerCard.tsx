import React from 'react';
import { motion } from 'framer-motion';
import { Player } from '@/types/Player';
import { getPlayerImage } from '@/utils/helpers';

interface PlayerCardProps {
  player: Player;
  isSelected?: boolean;
  isActive?: boolean;
  onClick?: () => void;
  onEdit?: (e: React.MouseEvent) => void;
  showEditButton?: boolean;
  className?: string;
  showScore?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  animation?: 'highlight' | 'pulse' | 'bounce' | 'none';
  inGame?: boolean;
}

const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  isSelected = false,
  isActive = false,
  onClick,
  onEdit,
  showEditButton = false,
  className = '',
  showScore = true,
  size = 'md',
  animation = 'none',
  inGame = false
}) => {
  // Determine card size
  const sizeClasses = {
    xs: 'w-12 h-12 text-xs',
    sm: 'w-16 h-16 text-xs',
    md: 'w-24 h-24 text-sm',
    lg: 'w-32 h-32 text-base'
  };
  
  // Edit button size based on card size
  const editButtonSizes = {
    xs: 'p-0.5 h-3 w-3',
    sm: 'p-1 h-3 w-3',
    md: 'p-1 h-6 w-6',
    lg: 'p-1.5 h-8 w-8'
  };

  // Position of edit button based on card size - moved to top-right
  const topRightPositions = {
    xs: 'top-1 right-1',
    sm: 'top-1 right-1',
    md: 'top-1 right-1',
    lg: 'top-1 right-1'
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
      y: [0, -5, 0],
      transition: { 
        repeat: Infinity,
        duration: 1
      }
    },
    none: {}
  };

  // Handle edit button click to prevent parent click event
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) onEdit(e);
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
      <div className="w-full h-1/4 flex items-center justify-center bg-white dark:bg-gray-900 p-1">
        <span className="truncate font-medium text-center dark:text-white">
          {player.name}
        </span>
      </div>
      
      {/* Top-right element: either Score Badge or Edit Button */}
      {inGame && showScore ? (
        <div className={`absolute ${topRightPositions[size]} bg-game-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold`}>
          {player.score}
        </div>
      ) : showEditButton && onEdit && !inGame ? (
        <button
          onClick={handleEditClick}
          className={`absolute ${topRightPositions[size]} bg-gray-800 bg-opacity-70 text-white rounded-full ${editButtonSizes[size]} shadow-md hover:bg-gray-900 transition-colors`}
          aria-label="Edit player"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      ) : null}
    </motion.div>
  );
};

export default PlayerCard;