import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
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
    completeChallenge
  } = useGameState();
  
  // Redirect to home if no game started
  useEffect(() => {
    if (!state.gameStarted && state.players.length === 0) {
      navigate('/');
    }
    
    // Redirect to results if game finished
    if (state.gameFinished) {
      navigate('/results');
    }
  }, [state.gameStarted, state.gameFinished, state.players.length, navigate]);
  
  // Get current participant
  const currentParticipant = getCurrentParticipant();
  
  // Get challenge participants
  const challengeParticipants = getChallengeParticipants();
  
  return (
    <div className="min-h-screen py-6 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
              {t('app.name')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {t('game.round', { round: state.currentRound })}
            </p>
          </div>
          
          {/* Timer (if using time limit) */}
          {state.gameDuration.type === 'time' && timeRemaining !== null && (
            <div className="bg-game-primary text-white px-4 py-2 rounded-full font-medium">
              {t('game.timeRemaining', { time: formatTime(timeRemaining) })}
            </div>
          )}
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
            {/* Current Challenge */}
            {state.currentChallenge ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
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
              <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                <div className="animate-spin mb-4">
                  <svg className="w-12 h-12 text-game-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <p className="text-gray-600 dark:text-gray-300">
                  {t('game.loadingChallenge')}
                </p>
              </div>
            )}
            
            {/* Home button */}
            <div className="mt-8 text-center">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/')}
              >
                {t('common.backToHome')}
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Animations */}
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
          participants={challengeParticipants}
        />
      )}
    </div>
  );
};

export default Game;