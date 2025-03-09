import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/contexts/GameContext';
import { useGameState } from '@/hooks/useGameState';
import { formatTime } from '@/utils/helpers';
import Button from '@/components/common/Button';
import ScoreBoard from '@/components/game/ScoreBoard';
import ChallengeDisplay from '@/components/game/ChallengeDisplay';
import PlayerSelection from '@/components/animations/PlayerSelection';
import ChallengeReveal from '@/components/animations/ChallengeReveal';

const Game: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state } = useGame();
  const {
    gameState,
    timeRemaining,
    isSelectingPlayer,
    isRevealingChallenge,
    isShowingResults,
    getCurrentParticipant,
    getChallengeParticipants,
    completeChallenge,
    startGame,
    selectNextChallenge
  } = useGameState();
  
  // Redirect to home if no game started
  useEffect(() => {
    if (!state.players.length) {
      navigate('/');
      return;
    }
    
    // Redirect to results if game finished
    if (state.gameFinished) {
      navigate('/results');
      return;
    }

    // Initialize or continue the game
    if (!state.currentChallenge && !isSelectingPlayer && !isRevealingChallenge) {
      // For continued games, just select the next challenge without animations
      if (state.results.length > 0) {
        selectNextChallenge();
      } else {
        // For new games, start with full animation flow
        startGame();
      }
    }
  }, [state.players.length, state.gameFinished, state.currentChallenge, 
      isSelectingPlayer, isRevealingChallenge, state.results.length, navigate, startGame, selectNextChallenge]);
  
  // Get current participant
  const currentParticipant = getCurrentParticipant();
  
  // Get challenge participants
  const challengeParticipants = getChallengeParticipants();
  
  // Determine if we should show the main game content
  const showGameContent = state.currentChallenge && !isSelectingPlayer && !isRevealingChallenge;
  
  return (
    <div>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
              {t('app.name')}
            </h1>
            <div className="flex flex-col gap-1">
              <p className="text-gray-600 dark:text-gray-400">
                {t('game.round', { round: state.currentRound })}
              </p>
              
              {/* Game Progress Status */}
              {state.gameDuration.type === 'time' ? (
                <p className="text-game-primary font-medium">
                  {timeRemaining !== null && formatTime(timeRemaining)}
                </p>
              ) : (
                <p className="text-game-primary font-medium">
                  {t('game.challengeProgress', {
                    current: state.results.length + 1,
                    total: state.gameDuration.value
                  })}
                </p>
              )}
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left sidebar (scoreboard) */}
          <div className="lg:col-span-1">
            <ScoreBoard
              players={state.players}
              teams={state.teams}
              gameMode={state.gameMode}
            />
          </div>
          
          {/* Main game area */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {showGameContent && state.currentChallenge ? (
                <motion.div
                  key="challenge-display"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <ChallengeDisplay
                    challenge={state.currentChallenge}
                    participants={state.currentChallengeParticipants}
                    players={state.players}
                    teams={state.teams}
                    gameMode={state.gameMode}
                    onComplete={completeChallenge}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center h-64 bg-white dark:bg-gray-800 rounded-lg shadow-md"
                >
                  <div className="animate-spin mb-4">
                    <svg className="w-12 h-12 text-game-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300">
                    {t('game.loadingChallenge')}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      
      {/* Animations */}
      <AnimatePresence>
        {isSelectingPlayer && currentParticipant && (
          <PlayerSelection
            currentParticipant={currentParticipant}
            isTeam={state.gameMode === 'teams'}
            players={state.players}
          />
        )}
        
        {isRevealingChallenge && state.currentChallenge && (
          <ChallengeReveal
            challenge={state.currentChallenge}
            onRevealComplete={() => {
              // The challenge will be shown in the main game area after the reveal is complete
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Game;