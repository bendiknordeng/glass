import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Player } from '@/types/Player';
import { getPlayerImage } from '@/utils/helpers';
import confetti from 'canvas-confetti';

interface PlayerRevealProps {
  player: Player;
  teamName?: string;
  isTeamMode?: boolean;
  onRevealComplete?: () => void;
}

const PlayerReveal: React.FC<PlayerRevealProps> = ({
  player,
  teamName,
  isTeamMode = false,
  onRevealComplete
}) => {
  const { t } = useTranslation();
  const [showReveal, setShowReveal] = useState(false);
  const [showText, setShowText] = useState(false);
  const [showReady, setShowReady] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  
  // Animation sequence
  useEffect(() => {
    const timer1 = setTimeout(() => {
      // Start by showing the component
      setShowReveal(true);
    }, 500);
    
    const timer2 = setTimeout(() => {
      // Show the player name
      setShowText(true);
    }, 1500);
    
    const timer3 = setTimeout(() => {
      // Show "Are you ready?"
      setShowReady(true);
      
      // Trigger celebration effect
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6, x: 0.5 }
      });
    }, 2500);
    
    const timer4 = setTimeout(() => {
      // Start fade out
      setIsComplete(true);
    }, 4500);

    const timer5 = setTimeout(() => {
      // Notify parent that reveal is complete
      if (onRevealComplete) {
        onRevealComplete();
      }
    }, 5000);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      clearTimeout(timer5);
    };
  }, [onRevealComplete]);

  return (
    <AnimatePresence>
      {showReveal && (
        <motion.div
          className="fixed inset-0 flex flex-col items-center justify-center bg-black bg-opacity-80 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Team Context (if in team mode) */}
          {isTeamMode && teamName && (
            <motion.div
              className="absolute top-1/4 text-center"
              initial={{ opacity: 0, y: -20 }}
              animate={{ 
                opacity: showText ? (isComplete ? 0 : 1) : 0,
                y: showText ? 0 : -20 
              }}
              transition={{ duration: 0.5 }}
            >
              <h3 className="text-3xl font-bold text-game-primary mb-1">
                {t('game.teamTurnBanner', { team: teamName })}
              </h3>
            </motion.div>
          )}
          
          {/* Player Photo and Name */}
          <motion.div
            className="flex flex-col items-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ 
              opacity: isComplete ? 0 : 1,
              scale: 1
            }}
            transition={{ 
              duration: 0.5,
              opacity: { duration: 0.3 }
            }}
          >
            {/* Player Photo with Animated Border */}
            <motion.div
              className="relative mb-4"
              initial={{ y: 20 }}
              animate={{ y: 0 }}
              transition={{ 
                type: 'spring',
                stiffness: 300,
                damping: 20
              }}
            >
              {/* Spinning rings */}
              <motion.div
                className="absolute -inset-4 rounded-full border-4 border-t-transparent border-b-transparent border-game-primary"
                animate={{ 
                  rotate: 360,
                  scale: [1, 1.05, 0.95, 1],
                }}
                transition={{ 
                  rotate: {
                    duration: 4,
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
              
              <motion.div
                className="absolute -inset-2 rounded-full border-4 border-l-transparent border-r-transparent border-game-accent"
                animate={{ 
                  rotate: -720,
                  scale: [1, 0.95, 1.05, 1],
                }}
                transition={{ 
                  rotate: {
                    duration: 5,
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
              
              {/* Player image container with pulsing effect */}
              <motion.div
                className="relative w-48 h-48 rounded-full overflow-hidden border-4 border-white"
                animate={showText ? {
                  boxShadow: [
                    '0 0 0 rgba(255, 255, 255, 0.1)',
                    '0 0 20px rgba(255, 255, 255, 0.5)',
                    '0 0 0 rgba(255, 255, 255, 0.1)'
                  ],
                } : {}}
                transition={{ 
                  repeat: Infinity,
                  duration: 2
                }}
              >
                <img
                  src={getPlayerImage(player.image, player.name)}
                  alt={player.name}
                  className="w-full h-full object-cover"
                />
              </motion.div>
            </motion.div>
            
            {/* Player Name */}
            <motion.h2
              className="text-4xl font-bold text-white mb-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ 
                opacity: showText ? 1 : 0,
                y: showText ? 0 : 10 
              }}
              transition={{ duration: 0.5 }}
            >
              {player.name}
            </motion.h2>
            
            {/* "Are you ready?" Text */}
            <motion.div
              className="mt-4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ 
                opacity: showReady ? 1 : 0,
                scale: showReady ? 1 : 0.9,
              }}
              transition={{ 
                type: 'spring',
                stiffness: 400,
                damping: 15
              }}
            >
              <div className="bg-game-accent text-gray-900 px-8 py-4 rounded-full">
                <span className="text-2xl font-bold">
                  {t('game.areYouReady')}
                </span>
              </div>
            </motion.div>
          </motion.div>
          
          {/* Animated particles */}
          {showReady && !isComplete && (
            <>
              {[...Array(15)].map((_, i) => (
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
                    x: (Math.random() - 0.5) * 500,
                    y: (Math.random() - 0.5) * 500,
                    opacity: [1, 0.8, 0],
                    scale: [0, 1, 0.5]
                  }}
                  transition={{
                    duration: 2,
                    ease: 'easeOut',
                    delay: Math.random() * 0.3
                  }}
                />
              ))}
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PlayerReveal; 