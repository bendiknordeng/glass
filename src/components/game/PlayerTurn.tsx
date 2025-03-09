import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Player } from '@/types/Player';
import { Team, GameMode } from '@/types/Team';
import PlayerCard from '@/components/common/PlayerCard';
import TeamCard from '@/components/common/TeamCard';

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
          transition={{ duration: 0.3 }}
        >
          {t('game.round', { round })}
        </motion.div>
        
        <motion.h2
          className="text-2xl font-bold text-gray-800 dark:text-white"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
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
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        {isTeam ? (
          <TeamCard 
            team={participant as Team} 
            players={players}
            size="lg"
            animation="pulse"
          />
        ) : (
          <PlayerCard 
            player={participant as Player} 
            size="lg"
            animation="pulse"
          />
        )}
      </motion.div>
      
      {showNextButton && onNext && (
        <div className="text-center">
          <motion.button
            className="px-6 py-2 bg-game-primary text-white rounded-full font-medium transition-colors hover:bg-game-primary/90"
            onClick={onNext}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
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