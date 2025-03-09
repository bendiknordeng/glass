import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Player } from '@/types/Player';
import { Team } from '@/types/Team';
import { getPlayerImage } from '@/utils/helpers';
import confetti from 'canvas-confetti';

interface MultiPlayerRevealProps {
  players: Player[];
  teamMode?: boolean;
  teamNames?: Record<string, string>; // Map of player IDs to team names
  onRevealComplete?: () => void;
}

const MultiPlayerReveal: React.FC<MultiPlayerRevealProps> = ({
  players,
  teamMode = false,
  teamNames = {},
  onRevealComplete
}) => {
  const { t } = useTranslation();
  const [showReveal, setShowReveal] = useState(false);
  const [showPlayers, setShowPlayers] = useState(false);
  const [showVersus, setShowVersus] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  
  console.log("MultiPlayerReveal component rendered", {
    players: players.map(p => p.name),
    teamMode,
    teamNames
  });
  
  // Animation sequence
  useEffect(() => {
    console.log("MultiPlayerReveal animation sequence started");
    
    const timer1 = setTimeout(() => {
      console.log("MultiPlayerReveal Timer 1: showing component");
      // Start by showing the component
      setShowReveal(true);
    }, 500);
    
    const timer2 = setTimeout(() => {
      console.log("MultiPlayerReveal Timer 2: showing players");
      // Show the players
      setShowPlayers(true);
    }, 1500);
    
    const timer3 = setTimeout(() => {
      console.log("MultiPlayerReveal Timer 3: showing versus");
      // Show the "VERSUS" text
      setShowVersus(true);
      
      // Fire confetti
      confetti({
        particleCount: 100,
        spread: 90,
        origin: { y: 0.5, x: 0.5 }
      });
    }, 2500);
    
    const timer4 = setTimeout(() => {
      console.log("MultiPlayerReveal Timer 4: starting fade out");
      // Start fade out
      setIsComplete(true);
    }, 4500);

    const timer5 = setTimeout(() => {
      console.log("MultiPlayerReveal Timer 5: notifying completion");
      // Notify parent that reveal is complete
      if (onRevealComplete) {
        onRevealComplete();
      } else {
        console.log("No onRevealComplete callback provided for MultiPlayerReveal");
      }
    }, 5000);
    
    return () => {
      console.log("MultiPlayerReveal component unmounting, clearing timers");
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
          {/* Header */}
          <motion.div
            className="absolute top-1/6 text-center mb-12"
            initial={{ opacity: 0, y: -20 }}
            animate={{ 
              opacity: showPlayers ? (isComplete ? 0 : 1) : 0,
              y: showPlayers ? 0 : -20 
            }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-4xl font-bold text-white mb-2">
              {t('game.showdown')}
            </h2>
          </motion.div>
          
          {/* Players Row */}
          <div className="flex justify-center items-center w-full">
            {players.map((player, index) => (
              <React.Fragment key={player.id}>
                {/* Player Card */}
                <motion.div
                  className="flex flex-col items-center mx-4"
                  initial={{ opacity: 0, x: index === 0 ? -100 : 100, rotateY: index === 0 ? -30 : 30 }}
                  animate={{ 
                    opacity: showPlayers ? (isComplete ? 0 : 1) : 0,
                    x: 0,
                    rotateY: 0
                  }}
                  transition={{ 
                    type: 'spring',
                    stiffness: 200,
                    damping: 15,
                    delay: index * 0.2
                  }}
                >
                  {/* Team Label (if in team mode) */}
                  {teamMode && teamNames[player.id] && (
                    <motion.div
                      className="mb-2 bg-game-primary text-white px-4 py-1 rounded-full text-center min-w-[100px]"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ 
                        opacity: showPlayers ? 1 : 0,
                        y: showPlayers ? 0 : -10
                      }}
                      transition={{ delay: 0.3 + index * 0.2 }}
                    >
                      <span className="font-medium">
                        {teamNames[player.id]}
                      </span>
                    </motion.div>
                  )}
                  
                  {/* Player Image */}
                  <motion.div
                    className="relative w-36 h-36 rounded-full overflow-hidden border-4 border-white shadow-lg"
                    animate={showVersus ? {
                      scale: [1, 1.1, 1],
                      rotate: index === 0 ? [-5, 0] : [5, 0],
                      x: index === 0 ? [-10, 0] : [10, 0]
                    } : {}}
                    transition={{ 
                      duration: 0.5,
                      type: 'spring',
                      stiffness: 200
                    }}
                  >
                    <img
                      src={getPlayerImage(player.image, player.name)}
                      alt={player.name}
                      className="w-full h-full object-cover"
                    />
                  </motion.div>
                  
                  {/* Player Name */}
                  <motion.h3
                    className="mt-3 text-2xl font-bold text-white"
                    initial={{ opacity: 0 }}
                    animate={{ 
                      opacity: showPlayers ? 1 : 0
                    }}
                    transition={{ delay: 0.5 + index * 0.2 }}
                  >
                    {player.name}
                  </motion.h3>
                </motion.div>
                
                {/* VS Element (between players) */}
                {index < players.length - 1 && (
                  <motion.div
                    className="mx-4 relative"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ 
                      opacity: showVersus ? 1 : 0,
                      scale: showVersus ? 1 : 0.5,
                      rotateZ: showVersus ? [0, -5, 5, 0] : 0
                    }}
                    transition={{ 
                      duration: 0.5,
                      scale: { type: 'spring', stiffness: 300 },
                      rotateZ: { repeat: 2, duration: 0.3, ease: 'easeInOut' }
                    }}
                  >
                    <div className="bg-game-accent text-gray-900 px-5 py-3 rounded-lg font-black text-3xl transform rotate-0">
                      VS
                    </div>
                    
                    {/* Glow effect instead of radial beams */}
                    {showVersus && (
                      <motion.div
                        className="absolute inset-0 rounded-lg"
                        initial={{ boxShadow: '0 0 0 rgba(255, 215, 0, 0)' }}
                        animate={{ 
                          boxShadow: [
                            '0 0 0 rgba(255, 215, 0, 0)',
                            '0 0 20px rgba(255, 215, 0, 0.6)',
                            '0 0 0 rgba(255, 215, 0, 0)'
                          ] 
                        }}
                        transition={{
                          repeat: Infinity,
                          duration: 1.5
                        }}
                      />
                    )}
                  </motion.div>
                )}
              </React.Fragment>
            ))}
          </div>
          
          {/* Animated particles */}
          {showVersus && !isComplete && (
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
                    x: (Math.random() - 0.5) * 600,
                    y: (Math.random() - 0.5) * 600,
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

export default MultiPlayerReveal; 