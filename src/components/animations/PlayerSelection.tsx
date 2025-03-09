import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Player } from '@/types/Player';
import { Team } from '@/types/Team';
import PlayerCard from '@/components/common/PlayerCard';
import TeamCard from '@/components/common/TeamCard';
import confetti from 'canvas-confetti';

interface PlayerSelectionProps {
  currentParticipant: Player | Team;
  isTeam: boolean;
  players: Player[];
  onSelectionComplete?: () => void;
}

const PlayerSelection: React.FC<PlayerSelectionProps> = ({
  currentParticipant,
  isTeam,
  players,
  onSelectionComplete
}) => {
  const { t } = useTranslation();
  const [showSelection, setShowSelection] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  
  // Animation sequence
  useEffect(() => {
    const timer1 = setTimeout(() => {
      // Start by showing the "spinner" for selecting
      setShowSelection(true);
    }, 500);
    
    const timer2 = setTimeout(() => {
      // Then show confetti for the selected player/team
      setShowConfetti(true);
      
      // Trigger confetti animation
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }, 2000);
    
    const timer3 = setTimeout(() => {
      // Notify parent that selection is complete
      if (onSelectionComplete) {
        onSelectionComplete();
      }
    }, 3000);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [onSelectionComplete]);
  
  return (
    <AnimatePresence>
      {showSelection && (
        <motion.div
          className="fixed inset-0 flex flex-col items-center justify-center bg-black bg-opacity-70 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-3xl font-bold text-white">
              {isTeam 
                ? t('game.teamTurn', { team: (currentParticipant as Team).name }) 
                : t('game.playerTurn', { player: (currentParticipant as Player).name })}
            </h2>
          </motion.div>
          
          <motion.div
            className="relative"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ 
              type: 'spring',
              stiffness: 300,
              damping: 20,
              delay: 0.5
            }}
          >
            {isTeam ? (
              <TeamCard 
                team={currentParticipant as Team} 
                players={players}
                size="lg"
                animation={showConfetti ? 'pulse' : 'none'}
              />
            ) : (
              <PlayerCard 
                player={currentParticipant as Player} 
                size="lg"
                animation={showConfetti ? 'pulse' : 'none'}
              />
            )}
            
            {/* Spinner animation */}
            {!showConfetti && (
              <motion.div
                className="absolute -top-4 -right-4 -bottom-4 -left-4 border-4 border-t-transparent border-game-accent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ 
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'linear'
                }}
              />
            )}
            
            {/* Confetti effect (in addition to canvas-confetti library) */}
            {showConfetti && (
              <>
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: [
                        '#FF6B6B', '#4ECDC4', '#FFD166', 
                        '#A6D0DD', '#FFB6C1', '#B5EAD7'
                      ][i % 6],
                      top: '50%',
                      left: '50%'
                    }}
                    initial={{ x: 0, y: 0 }}
                    animate={{
                      x: Math.random() * 200 - 100,
                      y: Math.random() * 200 - 100,
                      opacity: [1, 1, 0]
                    }}
                    transition={{
                      duration: 1.5,
                      ease: 'easeOut'
                    }}
                  />
                ))}
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PlayerSelection;