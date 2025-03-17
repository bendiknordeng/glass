import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Team } from '@/types/Team';
import { Player } from '@/types/Player';
import { getPlayerImage } from '@/utils/helpers';

interface TeamRevealProps {
  team: Team;
  allTeams?: Team[]; // All teams for team vs team challenges
  players: Player[];
  isTeamVsTeam?: boolean; // Flag for team vs team challenge
  onRevealComplete?: () => void;
  // New configuration options
  animationConfig?: {
    showTitle?: boolean;
    showTeamCards?: boolean;
    showVsText?: boolean;
    showReadyText?: boolean;
    autoAnimate?: boolean;
    customText?: string;
    durationMs?: number;
  };
}

const TeamReveal: React.FC<TeamRevealProps> = ({
  team,
  allTeams = [],
  players,
  isTeamVsTeam = false,
  onRevealComplete,
  animationConfig = {}
}) => {
  const { t } = useTranslation();
  const [showReveal, setShowReveal] = useState(false);
  const [showTeam, setShowTeam] = useState(false);
  const [showReady, setShowReady] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  
  // Default configuration with fallbacks
  const {
    showTitle = true,
    showTeamCards = true,
    showVsText = true,
    showReadyText = true,
    autoAnimate = true,
    customText,
    durationMs = 5000
  } = animationConfig;

  // Derived timing calculations based on total duration
  const revealStartDelay = autoAnimate ? 300 : 0;
  const teamStartDelay = autoAnimate ? Math.min(1000, durationMs * 0.2) : 0;
  const readyTextDelay = autoAnimate ? Math.min(2500, durationMs * 0.5) : 0;
  const fadeOutDelay = autoAnimate ? Math.min(4500, durationMs * 0.9) : durationMs;
  const completeDelay = autoAnimate ? durationMs : durationMs;
  
  // Teams to display - either just the current team or all teams for team vs team
  const teamsToDisplay = isTeamVsTeam ? allTeams : [team];
  
  // Animation sequence
  useEffect(() => {
    // If not using auto animation, just show content immediately
    if (!autoAnimate) {
      setShowReveal(true);
      setShowTeam(true);
      if (showReadyText) setShowReady(true);
      return;
    }

    // Auto animation sequence
    const timer1 = setTimeout(() => {
      // Start by showing the component
      setShowReveal(true);
    }, revealStartDelay);
    
    const timer2 = setTimeout(() => {
      // Show the team(s)
      setShowTeam(true);
    }, teamStartDelay);
    
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
      clearTimeout(timer2);
      if (timer3) clearTimeout(timer3);
      clearTimeout(timer4);
      clearTimeout(timer5);
    };
  }, [
    onRevealComplete, 
    showReadyText, 
    autoAnimate, 
    revealStartDelay,
    teamStartDelay,
    readyTextDelay,
    fadeOutDelay,
    completeDelay
  ]);
  
  // Get players for a team
  const getTeamPlayers = (teamToFind: Team) => {
    return players.filter(player => teamToFind.playerIds.includes(player.id));
  };
  
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
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
          >
            <div className="w-full h-full bg-[radial-gradient(circle,rgba(255,255,255,0.1)_0%,rgba(0,0,0,0)_70%)]" />
          </motion.div>
          
          {/* Challenge Type Text */}
          {showTitle && (
            <motion.div
              className="text-center mb-8"
              initial={{ opacity: 0, y: -20 }}
              animate={{ 
                opacity: showTeam ? (isComplete ? 0 : 1) : 0,
                y: showTeam ? 0 : -20
              }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl font-bold text-white">
                {isTeamVsTeam 
                  ? t('game.teamVsTeam') 
                  : t('game.teamChallenge')}
              </h2>
            </motion.div>
          )}
          
          {/* Team Cards Container */}
          {showTeamCards && (
            <div className="relative flex justify-center items-center">
              <div className={`flex flex-wrap justify-center items-center ${isTeamVsTeam && teamsToDisplay.length > 2 ? 'gap-6' : 'gap-12'}`}>
                {teamsToDisplay.map((currentTeam, teamIndex) => (
                  <motion.div
                    key={currentTeam.id}
                    className="flex flex-col items-center"
                    initial={{ 
                      x: isTeamVsTeam && teamIndex < 2 ? (teamIndex === 0 ? -60 : 60) : 0,
                      y: isTeamVsTeam && teamIndex >= 2 ? 40 : 0,
                      opacity: 0,
                      scale: 0.95
                    }}
                    animate={{ 
                      x: 0,
                      y: 0,
                      opacity: showTeam ? (isComplete ? 0 : 1) : 0,
                      scale: 1
                    }}
                    transition={{ 
                      type: 'spring',
                      stiffness: 200,
                      damping: 20,
                      delay: teamIndex * 0.15
                    }}
                  >
                    {/* Team Card */}
                    <motion.div
                      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 mb-3 w-64 flex flex-col items-center"
                      animate={showTeam ? {
                        boxShadow: '0 0 15px rgba(255, 255, 255, 0.2)',
                        y: [0, -3, 0]
                      } : {}}
                      transition={{ 
                        boxShadow: { duration: 1.5 },
                        y: { repeat: Infinity, duration: 2, ease: "easeInOut" }
                      }}
                    >
                      {/* Team Name */}
                      <motion.div
                        className="w-full mb-3 bg-gradient-to-r from-game-primary to-game-accent rounded-lg py-2 px-3"
                        animate={showTeam ? {
                          boxShadow: ['0 0 0px rgba(255, 255, 255, 0)', '0 0 5px rgba(255, 255, 255, 0.3)', '0 0 0px rgba(255, 255, 255, 0)']
                        } : {}}
                        transition={{
                          boxShadow: { repeat: Infinity, duration: 2.5 }
                        }}
                      >
                        <motion.h2
                          className="text-2xl font-bold text-white text-center"
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 + teamIndex * 0.1 }}
                        >
                          {currentTeam.name}
                        </motion.h2>
                      </motion.div>
                      
                      {/* Team Members */}
                      <div className="flex flex-wrap justify-center gap-2 mb-2">
                        {getTeamPlayers(currentTeam).slice(0, 6).map((player, index) => (
                          <motion.div
                            key={player.id}
                            className="relative"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ 
                              delay: 0.4 + teamIndex * 0.1 + index * 0.05,
                              type: 'spring',
                              stiffness: 300,
                              damping: 20
                            }}
                          >
                            <motion.div 
                              className="w-14 h-14 rounded-full overflow-hidden border-2 border-game-primary"
                              whileHover={{ scale: 1.1, transition: { duration: 0.2 } }}
                            >
                              <img
                                src={getPlayerImage(player.image, player.name)}
                                alt={player.name}
                                className="w-full h-full object-cover"
                              />
                            </motion.div>
                          </motion.div>
                        ))}
                      </div>
                      
                      {/* Show member count if team has more than 6 members */}
                      {getTeamPlayers(currentTeam).length > 6 && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          +{getTeamPlayers(currentTeam).length - 6} {t('game.moreMembers')}
                        </p>
                      )}
                    </motion.div>
                  </motion.div>
                ))}
              </div>
              
              {/* VS Badge (for team vs team) - centered between first two teams */}
              {showVsText && isTeamVsTeam && teamsToDisplay.length > 1 && (
                <motion.div
                  className="absolute"
                  style={{
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 10
                  }}
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ 
                    scale: showTeam ? 1 : 0,
                    rotate: 0
                  }}
                  transition={{ 
                    type: "spring",
                    stiffness: 300,
                    damping: 20,
                    delay: 0.6
                  }}
                >
                  <motion.div
                    className="w-14 h-14 rounded-full bg-gradient-to-br from-game-accent to-game-primary flex items-center justify-center shadow-lg"
                    animate={{
                      scale: [1, 1.1, 1],
                      boxShadow: [
                        '0 0 10px rgba(255, 209, 102, 0.4)',
                        '0 0 15px rgba(255, 209, 102, 0.6)',
                        '0 0 10px rgba(255, 209, 102, 0.4)'
                      ]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <span className="text-xl font-black text-white">VS</span>
                  </motion.div>
                </motion.div>
              )}
            </div>
          )}
          
          {/* "Are you ready?" Text */}
          {showReadyText && (
            <motion.div
              className="mt-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ 
                opacity: showReady ? (isComplete ? 0 : 1) : 0,
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
      )}
    </AnimatePresence>
  );
};

export default TeamReveal; 