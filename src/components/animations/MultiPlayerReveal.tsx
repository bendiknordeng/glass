import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Player } from '@/types/Player';
import { getPlayerImage } from '@/utils/helpers';

interface MultiPlayerRevealProps {
  players: Player[];
  teamMode: boolean;
  teamNames: Record<string, string>;
  onRevealComplete?: () => void;
}

const MultiPlayerReveal: React.FC<MultiPlayerRevealProps> = ({
  players,
  teamMode,
  teamNames,
  onRevealComplete
}) => {
  const { t } = useTranslation();
  const [showReveal, setShowReveal] = useState(false);
  const [showPlayers, setShowPlayers] = useState(false);
  const [showReady, setShowReady] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  
  // Animation sequence timing
  useEffect(() => {
    // Start the animation sequence
    const timer1 = setTimeout(() => {
      setShowReveal(true);
    }, 300);
    
    const timer2 = setTimeout(() => {
      setShowPlayers(true);
    }, 1200);
    
    const timer3 = setTimeout(() => {
      setShowReady(true);
    }, 2800);
    
    const timer4 = setTimeout(() => {
      setIsComplete(true);
    }, 4800);
    
    const timer5 = setTimeout(() => {
      if (onRevealComplete) {
        onRevealComplete();
      }
    }, 5300);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      clearTimeout(timer5);
    };
  }, [onRevealComplete]);
  
  // Display all players (not just limited to 2)
  const displayPlayers = players;
  
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
          {/* Center spotlight */}
          <motion.div
            className="absolute w-full h-full pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-full h-full bg-[radial-gradient(circle,rgba(255,255,255,0.1)_0%,rgba(0,0,0,0)_70%)]" />
          </motion.div>
          
          {/* Title */}
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ 
              opacity: showPlayers ? (isComplete ? 0 : 1) : 0,
              y: showPlayers ? 0 : -20
            }}
            transition={{ 
              duration: 0.5,
              type: 'spring',
              stiffness: 300, 
              damping: 20
            }}
          >
            <motion.h2 
              className="text-3xl font-bold text-white"
              animate={{
                textShadow: ['0px 0px 0px rgba(255,255,255,0)', '0px 0px 5px rgba(255,255,255,0.3)', '0px 0px 0px rgba(255,255,255,0)']
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              {t('game.showdown')}
            </motion.h2>
          </motion.div>
          
          {/* Player Cards Container - Better centered layout */}
          <div className="flex justify-center items-center w-full max-w-3xl mx-auto px-4 relative">
            <div className="flex justify-center items-center gap-12 sm:gap-20">
              {displayPlayers.map((player, index) => (
                <motion.div
                  key={player.id}
                  className="flex flex-col items-center"
                  initial={{ 
                    x: index === 0 ? -50 : 50,
                    opacity: 0
                  }}
                  animate={{ 
                    x: 0,
                    opacity: showPlayers ? (isComplete ? 0 : 1) : 0
                  }}
                  transition={{ 
                    type: 'spring',
                    stiffness: 200,
                    damping: 20,
                    delay: index * 0.2
                  }}
                >
                  {/* Team name if in team mode */}
                  {teamMode && teamNames[player.id] && (
                    <motion.div
                      className="mb-2"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + index * 0.2 }}
                    >
                      <motion.span 
                        className={`inline-block px-3 py-1 rounded-full text-white text-lg font-semibold ${index === 0 ? 'bg-blue-500' : 'bg-red-500'}`}
                        animate={{
                          boxShadow: [
                            `0 0 0px ${index === 0 ? 'rgba(59, 130, 246, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                            `0 0 8px ${index === 0 ? 'rgba(59, 130, 246, 0.5)' : 'rgba(239, 68, 68, 0.5)'}`,
                            `0 0 0px ${index === 0 ? 'rgba(59, 130, 246, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                          ]
                        }}
                        transition={{
                          boxShadow: {
                            repeat: Infinity,
                            duration: 2.5,
                            ease: "easeInOut"
                          }
                        }}
                      >
                        {teamNames[player.id]}
                      </motion.span>
                    </motion.div>
                  )}
                  
                  {/* Player image container */}
                  <motion.div
                    className="relative mb-4"
                    whileHover={{ scale: 1.05 }}
                    animate={showPlayers ? {
                      y: [0, -5, 0],
                    } : {}}
                    transition={{ 
                      y: {
                        repeat: Infinity,
                        duration: 3,
                        ease: "easeInOut",
                        times: [0, 0.5, 1]
                      },
                      duration: 0.2
                    }}
                  >
                    {/* Animated border */}
                    <motion.div
                      className={`absolute -inset-3 rounded-full border-2 ${index === 0 ? 'border-blue-400' : 'border-red-400'} opacity-70`}
                      animate={{ 
                        rotate: 360,
                        boxShadow: [
                          `0 0 0px ${index === 0 ? 'rgba(59, 130, 246, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                          `0 0 8px ${index === 0 ? 'rgba(59, 130, 246, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                          `0 0 0px ${index === 0 ? 'rgba(59, 130, 246, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                        ]
                      }}
                      transition={{ 
                        rotate: {
                          duration: 10,
                          repeat: Infinity,
                          ease: "linear"
                        },
                        boxShadow: {
                          repeat: Infinity,
                          duration: 2.5,
                          ease: "easeInOut"
                        }
                      }}
                    />
                    
                    {/* Player image */}
                    <motion.div
                      className="relative w-28 h-28 rounded-full overflow-hidden border-4 border-white"
                      animate={showPlayers ? {
                        boxShadow: `0 0 15px ${index === 0 ? 'rgba(59, 130, 246, 0.5)' : 'rgba(239, 68, 68, 0.5)'}`,
                        scale: [1, 1.03, 1]
                      } : {}}
                      transition={{ 
                        repeat: Infinity,
                        duration: 3
                      }}
                    >
                      <img
                        src={getPlayerImage(player.image, player.name)}
                        alt={player.name}
                        className="w-full h-full object-cover"
                      />
                    </motion.div>
                  </motion.div>
                  
                  {/* Player name */}
                  <motion.h3
                    className="text-xl font-bold text-white text-center max-w-[120px] truncate"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: showPlayers ? 1 : 0 }}
                    transition={{ delay: 0.3 + index * 0.2 }}
                  >
                    {player.name}
                  </motion.h3>
                </motion.div>
              ))}
              
              {/* VS badges - one between each pair of players */}
              {displayPlayers.length >= 2 && displayPlayers.map((_, index) => {
                // Don't render VS badge after the last player
                if (index === displayPlayers.length - 1) return null;
                
                return (
                  <motion.div
                    key={`vs-${index}`}
                    className="relative z-10"
                    style={{
                      position: 'absolute',
                      left: `calc(50% + ${(index - (displayPlayers.length - 2) / 2) * 200}px)`, // Adjust spacing based on player count
                      top: '50%',
                      transform: 'translate(-50%, -50%)'
                    }}
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ 
                      scale: showPlayers ? 1 : 0,
                      rotate: 0
                    }}
                    transition={{ 
                      type: "spring",
                      stiffness: 260,
                      damping: 20,
                      delay: 0.6 + index * 0.1
                    }}
                  >
                    <motion.div
                      className="w-12 h-12 rounded-full bg-gradient-to-br from-game-accent to-game-primary flex items-center justify-center shadow-lg"
                      animate={{
                        scale: [1, 1.1, 1],
                        boxShadow: [
                          '0 0 10px rgba(255, 209, 102, 0.5)',
                          '0 0 20px rgba(255, 209, 102, 0.7)',
                          '0 0 10px rgba(255, 209, 102, 0.5)'
                        ]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      <span className="text-lg font-black text-white">{t('game.versus')}</span>
                    </motion.div>
                  </motion.div>
                );
              })}
            </div>
          </div>
          
          {/* "Are you ready?" Text */}
          <motion.div
            className="mt-16"
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
              className="bg-gradient-to-r from-game-accent to-game-primary text-white px-6 py-3 rounded-full"
              animate={{
                scale: [1, 1.03, 1],
                boxShadow: [
                  '0 0 0px rgba(255, 209, 102, 0.4)',
                  '0 0 15px rgba(255, 209, 102, 0.6)',
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
              <span className="text-xl font-bold">
                {t('game.areYouReady')}
              </span>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MultiPlayerReveal; 