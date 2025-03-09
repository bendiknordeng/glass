import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Player } from '@/types/Player';
import { Team } from '@/types/Team';
import TeamCard from '@/components/common/TeamCard';
import { getPlayerImage } from '@/utils/helpers';

interface PlayerTurnProps {
  participant: Player | Team;
  isTeam: boolean;
  players: Player[];
  round: number;
  className?: string;
  showNextButton?: boolean;
  onNext?: () => void;
}

const PlayerTurn: React.FC<PlayerTurnProps> = ({
  participant,
  isTeam,
  players,
  round,
  className = '',
  showNextButton = false,
  onNext
}) => {
  const { t } = useTranslation();
  
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 ${className}`}>
      <div className="text-center mb-6">
        <motion.div
          className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {t('game.round', { round })}
        </motion.div>
        
        <motion.h2
          className="text-2xl font-bold text-gray-800 dark:text-white"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {isTeam 
            ? t('game.teamTurn', { team: (participant as Team).name }) 
            : t('game.playerTurn', { player: (participant as Player).name })}
        </motion.h2>
      </div>
      
      <motion.div
        className="flex justify-center mb-6"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.4 }}
      >
        {isTeam ? (
          <TeamCard 
            team={participant as Team} 
            players={players}
            size="lg"
            animation="pulse"
          />
        ) : (
          <div className="relative">
            {/* Spinning border */}
            <motion.div
              className="absolute -inset-2 rounded-full border-4 border-t-transparent border-game-primary"
              animate={{ rotate: 360 }}
              transition={{ 
                duration: 3,
                repeat: Infinity,
                ease: "linear"
              }}
            />
            
            {/* Player image */}
            <motion.div
              className="relative w-32 h-32 rounded-full overflow-hidden"
              animate={{ 
                scale: [1, 1.05, 1],
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "easeInOut"
              }}
            >
              <img
                src={getPlayerImage((participant as Player).image, (participant as Player).name)}
                alt={(participant as Player).name}
                className="w-full h-full object-cover"
              />
            </motion.div>
            
            {/* Player name */}
            <motion.div
              className="mt-4 text-xl font-bold text-gray-800 dark:text-white"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              {(participant as Player).name}
            </motion.div>
          </div>
        )}
      </motion.div>
      
      {showNextButton && onNext && (
        <div className="text-center">
          <motion.button
            className="px-6 py-2 bg-game-primary text-white rounded-full font-medium transition-colors hover:bg-game-primary/90"
            onClick={onNext}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {t('game.nextChallenge')}
          </motion.button>
        </div>
      )}
    </div>
  );
};

export default PlayerTurn;