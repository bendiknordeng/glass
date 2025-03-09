import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Player } from '@/types/Player';
import { Team } from '@/types/Team';
import TeamCard from '@/components/common/TeamCard';
import { getPlayerImage } from '@/utils/helpers';
import confetti from 'canvas-confetti';

interface PlayerSelectionProps {
  currentParticipant: Player | Team;
  isTeam: boolean;
  players: Player[];
  onSelectionComplete?: () => void;
  isWinningSelection?: boolean;
}

const PlayerSelection: React.FC<PlayerSelectionProps> = ({
  currentParticipant,
  isTeam,
  players,
  onSelectionComplete,
  isWinningSelection = false
}) => {
  const { t } = useTranslation();
  const [showSelection, setShowSelection] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  
  // Animation sequence
  useEffect(() => {
    const timer1 = setTimeout(() => {
      // Start by showing the "spinner" for selecting
      setShowSelection(true);
    }, 1000);
    
    const timer2 = setTimeout(() => {
      // Only show confetti for winning selections
      if (isWinningSelection) {
        setShowConfetti(true);
        
        // Trigger confetti animation
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    }, 4000);
    
    const timer3 = setTimeout(() => {
      // Start fade out
      setIsComplete(true);
    }, 5500);

    const timer4 = setTimeout(() => {
      // Notify parent that selection is complete
      if (onSelectionComplete) {
        onSelectionComplete();
      }
    }, 6000);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [onSelectionComplete, isWinningSelection]);
  
  return (
    <AnimatePresence>
      {showSelection && (
        <motion.div
          className="fixed inset-0 flex flex-col items-center justify-center bg-black bg-opacity-70 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: isComplete ? 0 : 1, y: isComplete ? -10 : 0 }}
            transition={{ duration: 0.4 }}
          >
            <h2 className="text-4xl font-bold text-white mb-2">
              {isTeam 
                ? t('game.teamTurn', { team: (currentParticipant as Team).name }) 
                : t('game.playerTurn', { player: (currentParticipant as Player).name })}
            </h2>
            <p className="text-xl text-gray-300">
              {t('game.getReady')}
            </p>
          </motion.div>
          
          <motion.div
            className="relative"
            initial={{ scale: 0 }}
            animate={{ 
              scale: 1,
              opacity: isComplete ? 0.3 : 1
            }}
            transition={{ 
              type: 'spring',
              stiffness: 200,
              damping: 20,
              delay: 0.8,
              opacity: {
                duration: 0.4,
                delay: isComplete ? 0 : 0.8
              }
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
              <div className="flex flex-col items-center">
                <div className="relative mb-4">
                  {/* Outer spinning ring */}
                  <motion.div
                    className="absolute -inset-4 rounded-full border-4 border-t-transparent border-game-accent"
                    animate={{ 
                      rotate: 360,
                      scale: [1, 1.05, 0.95, 1],
                    }}
                    transition={{ 
                      rotate: {
                        duration: 3,
                        repeat: Infinity,
                        ease: "linear"
                      },
                      scale: {
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }
                    }}
                  />
                  
                  {/* Inner spinning ring */}
                  <motion.div
                    className="absolute -inset-2 rounded-full border-4 border-b-transparent border-game-primary"
                    animate={{ 
                      rotate: -360,
                      scale: [1, 0.95, 1.05, 1],
                    }}
                    transition={{ 
                      rotate: {
                        duration: 2.5,
                        repeat: Infinity,
                        ease: "linear"
                      },
                      scale: {
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }
                    }}
                  />
                  
                  {/* Player image container */}
                  <motion.div
                    className="relative w-48 h-48 rounded-full overflow-hidden"
                    animate={showConfetti ? {
                      scale: [1, 1.1, 1],
                      rotate: [0, -10, 10, 0]
                    } : {}}
                    transition={{ 
                      duration: 0.8,
                      repeat: showConfetti ? 1 : 0,
                      ease: "easeInOut"
                    }}
                  >
                    <img
                      src={getPlayerImage((currentParticipant as Player).image, (currentParticipant as Player).name)}
                      alt={(currentParticipant as Player).name}
                      className="w-full h-full object-cover"
                    />
                  </motion.div>
                </div>
              </div>
            )}
            
            {/* Confetti effect - only shown for winning selections */}
            {showConfetti && isWinningSelection && (
              <>
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-3 h-3 rounded-full"
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
                      x: Math.random() * 300 - 150,
                      y: Math.random() * 300 - 150,
                      opacity: [1, 1, 0],
                      scale: [0, 1, 0.5]
                    }}
                    transition={{
                      duration: 2,
                      ease: 'easeOut',
                      delay: Math.random() * 0.2
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