import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Player } from "@/types/Player";
import { getPlayerImage } from "@/utils/helpers";

interface MultiPlayerRevealProps {
  players: Player[];
  teamMode: boolean;
  teamNames: Record<string, string>;
  onRevealComplete?: () => void;
  // New configuration options
  animationConfig?: {
    showTitle?: boolean;
    showPlayerImages?: boolean;
    showPlayerNames?: boolean;
    showReadyText?: boolean;
    showVsText?: boolean;
    autoAnimate?: boolean;
    customText?: string;
    customTitle?: string;
    durationMs?: number;
  };
}

const MultiPlayerReveal: React.FC<MultiPlayerRevealProps> = ({
  players,
  teamMode,
  teamNames,
  onRevealComplete,
  animationConfig = {},
}) => {
  const { t } = useTranslation();
  const [showReveal, setShowReveal] = useState(false);
  const [showPlayers, setShowPlayers] = useState(false);
  const [showReady, setShowReady] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  // Default configuration with fallbacks
  const {
    showTitle = true,
    showPlayerImages = true,
    showPlayerNames = true,
    showReadyText = true,
    showVsText = true,
    autoAnimate = true,
    customText,
    customTitle,
    durationMs = 5300,
  } = animationConfig;

  // Derived timing calculations based on total duration
  const revealStartDelay = autoAnimate ? 300 : 0;
  const playersStartDelay = autoAnimate ? Math.min(1200, durationMs * 0.23) : 0;
  const readyTextDelay = autoAnimate ? Math.min(2800, durationMs * 0.53) : 0;
  const fadeOutDelay = autoAnimate
    ? Math.min(4800, durationMs * 0.9)
    : durationMs;
  const completeDelay = autoAnimate ? durationMs : durationMs;

  // Animation sequence timing
  useEffect(() => {
    // If not using auto animation, just show content immediately
    if (!autoAnimate) {
      setShowReveal(true);
      setShowPlayers(true);
      if (showReadyText) setShowReady(true);
      return;
    }

    // Auto animation sequence
    const timer1 = setTimeout(() => {
      setShowReveal(true);
    }, revealStartDelay);

    const timer2 = setTimeout(() => {
      setShowPlayers(true);
    }, playersStartDelay);

    const timer3 = showReadyText
      ? setTimeout(() => {
          setShowReady(true);
        }, readyTextDelay)
      : undefined;

    const timer4 = setTimeout(() => {
      setIsComplete(true);
    }, fadeOutDelay);

    const timer5 = setTimeout(() => {
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
    playersStartDelay,
    readyTextDelay,
    fadeOutDelay,
    completeDelay,
  ]);

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
          {showTitle && (
            <motion.div
              className="text-center mb-8"
              initial={{ opacity: 0, y: -20 }}
              animate={{
                opacity: showPlayers ? (isComplete ? 0 : 1) : 0,
                y: showPlayers ? 0 : -20,
              }}
              transition={{
                duration: 0.5,
                type: "spring",
                stiffness: 300,
                damping: 20,
              }}
            >
              <motion.h2
                className="text-3xl font-bold text-white"
                animate={{
                  textShadow: [
                    "0px 0px 0px rgba(255,255,255,0)",
                    "0px 0px 5px rgba(255,255,255,0.3)",
                    "0px 0px 0px rgba(255,255,255,0)",
                  ],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                {customTitle ||
                  (players.length > 3
                    ? t("game.challengeTypes.allVsAll")
                    : t("game.showdown"))}
              </motion.h2>
            </motion.div>
          )}

          {/* Player Cards Container - Better centered layout */}
          <div className="flex justify-center items-center w-full max-w-5xl mx-auto px-4 relative">
            {/* For many players, use a wrap layout */}
            <div
              className={`flex flex-wrap justify-center items-center ${
                players.length > 4 ? "gap-2" : "gap-4 sm:gap-8"
              }`}
            >
              {displayPlayers.map((player, index) => (
                <React.Fragment key={`player-section-${player.id}`}>
                  <motion.div
                    key={player.id}
                    className="flex flex-col items-center"
                    initial={{
                      opacity: 0,
                      scale: 0.9,
                      y: 20,
                    }}
                    animate={{
                      opacity: showPlayers ? (isComplete ? 0 : 1) : 0,
                      scale: 1,
                      y: 0,
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 200,
                      damping: 20,
                      delay: Math.min(index * 0.1, 1), // Cap the delay for many players
                    }}
                  >
                    {/* Team name if in team mode */}
                    {teamMode && teamNames[player.id] && (
                      <motion.div
                        className="mb-2"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(0.2 + index * 0.1, 1.2) }}
                      >
                        <motion.span
                          className={`inline-block px-3 py-1 rounded-full text-white text-sm font-semibold ${
                            // Use different colors based on index
                            [
                              "bg-blue-500",
                              "bg-red-500",
                              "bg-green-500",
                              "bg-yellow-500",
                              "bg-purple-500",
                              "bg-pink-500",
                            ][index % 6]
                          }`}
                          animate={{
                            boxShadow: [
                              `0 0 0px rgba(255, 255, 255, 0.3)`,
                              `0 0 8px rgba(255, 255, 255, 0.5)`,
                              `0 0 0px rgba(255, 255, 255, 0.3)`,
                            ],
                          }}
                          transition={{
                            boxShadow: {
                              repeat: Infinity,
                              duration: 2.5,
                              ease: "easeInOut",
                            },
                          }}
                        >
                          {teamNames[player.id]}
                        </motion.span>
                      </motion.div>
                    )}

                    {/* Player image container - adjust size based on player count */}
                    {showPlayerImages && (
                      <motion.div
                        className="relative mb-2"
                        whileHover={{ scale: 1.05 }}
                        animate={
                          showPlayers
                            ? {
                                y: [0, -3, 0],
                              }
                            : {}
                        }
                        transition={{
                          y: {
                            repeat: Infinity,
                            duration: 3,
                            ease: "easeInOut",
                            times: [0, 0.5, 1],
                          },
                          duration: 0.2,
                        }}
                      >
                        {/* Animated border - different colors for each player */}
                        <motion.div
                          className={`absolute -inset-2 rounded-full border-2 ${
                            [
                              "border-blue-400",
                              "border-red-400",
                              "border-green-400",
                              "border-yellow-400",
                              "border-purple-400",
                              "border-pink-400",
                            ][index % 6]
                          } opacity-70`}
                          animate={{
                            rotate: 360,
                            boxShadow: [
                              `0 0 0px rgba(255, 255, 255, 0.2)`,
                              `0 0 8px rgba(255, 255, 255, 0.4)`,
                              `0 0 0px rgba(255, 255, 255, 0.2)`,
                            ],
                          }}
                          transition={{
                            rotate: {
                              duration: 10,
                              repeat: Infinity,
                              ease: "linear",
                            },
                            boxShadow: {
                              repeat: Infinity,
                              duration: 2.5,
                              ease: "easeInOut",
                            },
                          }}
                        />

                        {/* Player image - smaller for All vs All challenges with many players */}
                        <motion.div
                          className={`relative ${
                            players.length > 4 ? "w-20 h-20" : "w-28 h-28"
                          } rounded-full overflow-hidden border-4 border-white`}
                          animate={
                            showPlayers
                              ? {
                                  boxShadow: `0 0 15px rgba(255, 255, 255, 0.5)`,
                                  scale: [1, 1.03, 1],
                                }
                              : {}
                          }
                          transition={{
                            repeat: Infinity,
                            duration: 3,
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

                    {/* Player name - smaller text for many players */}
                    {showPlayerNames && (
                      <motion.h3
                        className={`${
                          players.length > 4 ? "text-base" : "text-xl"
                        } font-bold text-white text-center max-w-[100px] truncate`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: showPlayers ? 1 : 0 }}
                        transition={{ delay: Math.min(0.2 + index * 0.1, 1.2) }}
                      >
                        {player.name}
                      </motion.h3>
                    )}
                  </motion.div>

                  {/* Insert VS badge after each player except the last one */}
                  {showVsText && 
                   players.length <= 4 && 
                   index < displayPlayers.length - 1 && (
                    <motion.div
                      key={`vs-${index}`}
                      className="relative z-10 -mx-1 mb-2 transform"
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{
                        opacity: showPlayers ? (isComplete ? 0 : 1) : 0,
                        scale: 1,
                        rotate: [-3, 3, -3],
                      }}
                      transition={{
                        opacity: { delay: 0.6 },
                        scale: {
                          type: "spring",
                          stiffness: 400,
                          damping: 10,
                          delay: 0.6,
                        },
                        rotate: {
                          repeat: Infinity,
                          duration: 6,
                          ease: "easeInOut",
                        },
                      }}
                    >
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
                          <span className="text-white font-black text-sm">
                            VS
                          </span>
                        </div>

                        {/* Pulsing glow effect */}
                        <motion.div
                          className="absolute -inset-1 rounded-full bg-yellow-400 -z-10"
                          animate={{
                            opacity: [0.1, 0.3, 0.1],
                            scale: [1, 1.2, 1],
                          }}
                          transition={{
                            repeat: Infinity,
                            duration: 1.5,
                            ease: "easeInOut",
                          }}
                        />
                      </div>
                    </motion.div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* "Are you ready?" Text */}
          {showReadyText && (
            <motion.div
              className="mt-12 mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{
                opacity: showReady ? (isComplete ? 0 : 1) : 0,
                y: showReady ? 0 : 20,
              }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 25,
              }}
            >
              <motion.div
                className="bg-gradient-to-r from-game-accent to-game-primary text-white px-8 py-4 rounded-full"
                animate={{
                  scale: [1, 1.03, 1],
                  boxShadow: [
                    "0 0 0px rgba(255, 209, 102, 0.4)",
                    "0 0 10px rgba(255, 209, 102, 0.6)",
                    "0 0 0px rgba(255, 209, 102, 0.4)",
                  ],
                }}
                transition={{
                  scale: {
                    repeat: Infinity,
                    duration: 2,
                  },
                  boxShadow: {
                    repeat: Infinity,
                    duration: 2,
                  },
                }}
              >
                <span className="text-2xl font-bold">
                  {customText || t("game.areYouReady")}
                </span>
              </motion.div>
            </motion.div>
          )}

          {/* Skip button in bottom right corner */}
          <motion.button
            className="absolute bottom-6 right-6 bg-transparent text-gray-400 hover:text-white border border-gray-500 px-3 py-1.5 text-sm rounded-full shadow-sm hover:bg-gray-800 transition-all"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 0.7, y: 0 }}
            whileHover={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            onClick={() => {
              // Skip the rest of the animation and call the completion callback
              if (onRevealComplete) {
                onRevealComplete();
              }
            }}
          >
            {t('common.skip')}
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MultiPlayerReveal;
