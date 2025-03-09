import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Player } from '@/types/Player';
import { Team } from '@/types/Team';
import PlayerCard from '@/components/common/PlayerCard';

interface TeamHighlightProps {
  team: Team;
  players: Player[];
  isWinner?: boolean;
  duration?: number;
  onComplete?: () => void;
}

const TeamHighlight: React.FC<TeamHighlightProps> = ({
  team,
  players,
  isWinner = false,
  duration = 3000,
  onComplete
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const teamPlayers = players.filter(player => team.playerIds.includes(player.id));
  
  // Auto-hide after duration
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onComplete) {
        onComplete();
      }
    }, duration);
    
    return () => clearTimeout(timer);
  }, [duration, onComplete]);
  
  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-60"
      initial={{ opacity: 0 }}
      animate={{ opacity: isVisible ? 1 : 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className={`
          relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-lg w-full
          ${isWinner ? 'border-4 border-game-accent' : ''}
        `}
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ type: 'spring', bounce: 0.4 }}
      >
        {/* Team Name */}
        <motion.h2
          className="text-2xl font-bold text-center mb-4 text-gray-800 dark:text-white"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {team.name}
          
          {isWinner && (
            <span className="ml-2 inline-block bg-game-accent text-white rounded-full px-3 py-1 text-sm">
              Winner!
            </span>
          )}
        </motion.h2>
        
        {/* Team Score */}
        <motion.div
          className="text-center mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <span className="text-lg font-semibold text-gray-600 dark:text-gray-300">
            Score: {team.score} points
          </span>
        </motion.div>
        
        {/* Team Players */}
        <motion.div
          className="grid grid-cols-3 gap-4 justify-items-center"
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: {
                staggerChildren: 0.1
              }
            }
          }}
          initial="hidden"
          animate="show"
        >
          {teamPlayers.map((player) => (
            <motion.div
              key={player.id}
              variants={{
                hidden: { opacity: 0, y: 20 },
                show: { opacity: 1, y: 0 }
              }}
            >
              <PlayerCard
                player={player}
                size="sm"
                animation={isWinner ? 'pulse' : 'none'}
              />
            </motion.div>
          ))}
        </motion.div>
        
        {/* Winner Effects */}
        {isWinner && (
          <>
            {/* Inner glow effect */}
            <motion.div
              className="absolute inset-0 rounded-xl"
              initial={{ boxShadow: 'inset 0 0 0 rgba(255, 209, 102, 0)' }}
              animate={{
                boxShadow: [
                  'inset 0 0 20px rgba(255, 209, 102, 0)',
                  'inset 0 0 20px rgba(255, 209, 102, 0.6)',
                  'inset 0 0 20px rgba(255, 209, 102, 0)'
                ]
              }}
              transition={{
                repeat: Infinity,
                duration: 2
              }}
            />
            
            {/* Star particles */}
            {[...Array(10)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2"
                style={{
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  backgroundColor: 'gold'
                }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0],
                  rotate: [0, 180]
                }}
                transition={{
                  repeat: Infinity,
                  duration: 2,
                  delay: Math.random() * 2
                }}
              />
            ))}
          </>
        )}
      </motion.div>
    </motion.div>
  );
};

export default TeamHighlight;