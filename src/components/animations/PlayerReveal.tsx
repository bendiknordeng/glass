import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Player } from '@/types/Player';
import { getPlayerImage } from '@/utils/helpers';

interface PlayerRevealProps {
  player: Player;
  teamName?: string;
  isTeamMode?: boolean;
  onRevealComplete?: () => void;
  // New configuration options
  animationConfig?: {
    showPlayerImage?: boolean;
    showPlayerName?: boolean;
    showReadyText?: boolean;
    autoAnimate?: boolean;
    customText?: string;
    durationMs?: number;
  };
}

const PlayerReveal: React.FC<PlayerRevealProps> = ({
  player,
  teamName,
  isTeamMode = false,
  onRevealComplete,
  animationConfig = {}
}) => {
  const { t } = useTranslation();
  const [showReveal, setShowReveal] = useState(false);
  const [showText, setShowText] = useState(false);
  const [showReady, setShowReady] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  
  // Default configuration with fallbacks
  const {
    showPlayerImage = true, 
    showPlayerName = true,
    showReadyText = true,
    autoAnimate = true,
    customText,
    durationMs = 5000,
  } = animationConfig;

  // Derived timing calculations based on total duration
  const revealStartDelay = autoAnimate ? 300 : 0;
  const textStartDelay = autoAnimate ? Math.min(1200, durationMs * 0.24) : 0;
  const readyTextDelay = autoAnimate ? Math.min(2200, durationMs * 0.44) : 0;
  const fadeOutDelay = autoAnimate ? Math.min(4500, durationMs * 0.9) : durationMs;
  const completeDelay = autoAnimate ? durationMs : durationMs;
  
  // Animation sequence
  useEffect(() => {
    // If not using auto animation, just show content immediately
    if (!autoAnimate) {
      setShowReveal(true);
      if (showPlayerName) setShowText(true);
      if (showReadyText) setShowReady(true);
      return;
    }

    // Auto animation sequence
    const timer1 = setTimeout(() => {
      // Start by showing the component
      setShowReveal(true);
    }, revealStartDelay);
    
    // Only set up name reveal timer if we're showing the name
    const timer2 = showPlayerName ? setTimeout(() => {
      // Show the player name
      setShowText(true);
    }, textStartDelay) : undefined;
    
    // Only set up ready text timer if we're showing it
    const timer3 = showReadyText ? setTimeout(() => {
      // Show "Are you ready?"
      setShowReady(true);
    }, readyTextDelay) : undefined;
    
    const timer4 = setTimeout(() => {
      // Start fade out
      setIsComplete(true);
    }, fadeOutDelay);

    const timer5 = setTimeout(() => {
      // Notify parent that reveal is complete
      if (onRevealComplete) {
        onRevealComplete();
      }
    }, completeDelay);
    
    return () => {
      clearTimeout(timer1);
      if (timer2) clearTimeout(timer2);
      if (timer3) clearTimeout(timer3);
      clearTimeout(timer4);
      clearTimeout(timer5);
    };
  }, [
    onRevealComplete, 
    showPlayerName, 
    showReadyText, 
    autoAnimate, 
    revealStartDelay,
    textStartDelay,
    readyTextDelay,
    fadeOutDelay,
    completeDelay
  ]);

  return (
    <AnimatePresence>
      {showReveal && (
        <motion.div
          className="fixed inset-0 flex flex-col items-center justify-center bg-black bg-opacity-90 z-50 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Subtle spotlight effect */}
          <motion.div
            className="absolute w-full h-full pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-full h-full bg-[radial-gradient(circle,rgba(255,255,255,0.1)_0%,rgba(0,0,0,0)_70%)]" />
          </motion.div>
          
          {/* Player Photo and Name */}
          <motion.div
            className="flex flex-col items-center relative z-10"
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
            {/* Team name if in team mode */}
            {isTeamMode && teamName && (
              <motion.div
                className="text-xl text-game-accent font-medium mb-2"
                initial={{ opacity: 0, y: -10 }}
                animate={{ 
                  opacity: showText ? 1 : 0,
                  y: showText ? 0 : -10
                }}
                transition={{ 
                  type: 'spring',
                  stiffness: 300,
                  damping: 20,
                  delay: 0.1
                }}
              >
                {t('game.teamTurn', { team: teamName })}
              </motion.div>
            )}
            
            {/* Player Photo with Subtle Border */}
            {showPlayerImage && (
              <motion.div
                className="relative mb-4"
                initial={{ y: 20 }}
                animate={{ 
                  y: 0,
                  scale: [1, 1.02, 1]
                }}
                transition={{ 
                  y: {
                    type: 'spring',
                    stiffness: 300,
                    damping: 20
                  },
                  scale: {
                    repeat: Infinity,
                    duration: 3,
                    ease: "easeInOut"
                  }
                }}
              >
                {/* Simple spinning ring */}
                <motion.div
                  className="absolute -inset-4 rounded-full border-2 border-game-primary opacity-60"
                  animate={{ 
                    rotate: 360,
                    boxShadow: ['0 0 0px rgba(255, 255, 255, 0)', '0 0 10px rgba(255, 255, 255, 0.2)', '0 0 0px rgba(255, 255, 255, 0)']
                  }}
                  transition={{ 
                    rotate: {
                      duration: 10,
                      repeat: Infinity,
                      ease: "linear"
                    },
                    boxShadow: {
                      duration: 2.5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }
                  }}
                />
                
                {/* Player image container with subtle pulse */}
                <motion.div
                  className="relative w-40 h-40 rounded-full overflow-hidden border-4 border-white z-10"
                  animate={showText ? {
                    boxShadow: '0 0 15px rgba(255, 255, 255, 0.4)'
                  } : {}}
                  transition={{ 
                    duration: 1
                  }}
                >
                  <img
                    src={getPlayerImage(player.image, player.name)}
                    alt={player.name}
                    className="w-full h-full object-cover"
                  />
                </motion.div>
              </motion.div>
            )}
            
            {/* Player Name with clean animation */}
            {showPlayerName && (
              <motion.h2
                className="text-4xl font-bold text-white mb-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ 
                  opacity: showText ? 1 : 0,
                  y: showText ? 0 : 10
                }}
                transition={{ 
                  type: 'spring',
                  stiffness: 300,
                  damping: 20
                }}
              >
                {player.name}
              </motion.h2>
            )}
            
            {/* "Are you ready?" Text or custom text with simple animation */}
            {showReadyText && (
              <motion.div
                className="mt-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ 
                  opacity: showReady ? 1 : 0,
                  y: showReady ? 0 : 20
                }}
                transition={{ 
                  type: 'spring',
                  stiffness: 300,
                  damping: 25
                }}
              >
                <motion.div
                  className="bg-gradient-to-r from-game-accent to-game-primary text-white px-8 py-4 rounded-full"
                  animate={{
                    scale: [1, 1.03, 1],
                    boxShadow: [
                      '0 0 0px rgba(255, 209, 102, 0.4)',
                      '0 0 10px rgba(255, 209, 102, 0.6)',
                      '0 0 0px rgba(255, 209, 102, 0.4)'
                    ]
                  }}
                  transition={{
                    scale: {
                      repeat: Infinity,
                      duration: 2
                    },
                    boxShadow: {
                      repeat: Infinity,
                      duration: 2
                    }
                  }}
                >
                  <span className="text-2xl font-bold">
                    {customText || t('game.areYouReady')}
                  </span>
                </motion.div>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PlayerReveal; 