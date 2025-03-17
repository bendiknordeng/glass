import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/contexts/GameContext';
import { useGameState } from '@/hooks/useGameState';
import { formatTime, getParticipantById } from '@/utils/helpers';
import Button from '@/components/common/Button';
import ScoreBoard from '@/components/game/ScoreBoard';
import ChallengeDisplay from '@/components/game/ChallengeDisplay';
import ChallengeReveal from '@/components/animations/ChallengeReveal';
import TeamReveal from '@/components/animations/TeamReveal';
import PlayerReveal from '@/components/animations/PlayerReveal';
import MultiPlayerReveal from '@/components/animations/MultiPlayerReveal';
import { ChallengeType } from '@/types/Challenge';
import { Player } from '@/types/Player';
import { Team, GameMode } from '@/types/Team';

const Game: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state } = useGame();
  const {
    gameState,
    timeRemaining,
    isRevealingChallenge,
    isShowingResults,
    getCurrentParticipant,
    getChallengeParticipants,
    completeChallenge,
    startGame,
    selectNextChallenge,
    setIsRevealingChallenge,
    verifyParticipantsAssigned
  } = useGameState();
  
  // States for reveal flow
  const [isRevealingPlayer, setIsRevealingPlayer] = useState(false);
  const [isRevealingMultiPlayers, setIsRevealingMultiPlayers] = useState(false);
  const [isRevealingTeamVsTeam, setIsRevealingTeamVsTeam] = useState(false);
  
  // For hiding content until proper reveal
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [selectedPlayersForReveal, setSelectedPlayersForReveal] = useState<Player[]>([]);
  const [showContentAfterReveal, setShowContentAfterReveal] = useState(false);
  
  // Add refs to prevent update loops
  const animationInProgressRef = useRef(false);
  const gameInitializedRef = useRef(false);
  const participantRetryCount = useRef(0);
  
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
  }, [state.players.length, state.gameFinished, navigate]);
  
  // Handle game initialization in a separate effect
  useEffect(() => {
    // Only run game initialization if not already done and prerequisites are met
    if (!gameInitializedRef.current && state.players.length > 0 && !state.gameFinished) {
      console.log("Initializing game...");
      gameInitializedRef.current = true;
      
      // For continued games, just select the next challenge without animations
      if (state.results.length > 0) {
        console.log("Continuing existing game...");
        selectNextChallenge();
      } else {
        // For new games, start with full animation flow
        console.log("Starting new game...");
        startGame();
      }
    }
  }, [state.players.length, state.results.length, state.gameFinished, startGame, selectNextChallenge]);
  
  // Get current participant
  const currentParticipant = getCurrentParticipant();
  
  // Ensure we have valid participants assigned when needed
  useEffect(() => {
    // Since we no longer use isSelectingPlayer, we only need to verify participants
    // when we have a challenge but no valid participant
    if (!currentParticipant && state.currentChallenge) {
      console.log("Current participant is null but we have a challenge, trying to fix");
      
      // Increment retry counter
      participantRetryCount.current += 1;
      
      if (participantRetryCount.current <= 3) {
        // Try to verify and assign participants
        const success = verifyParticipantsAssigned();
        
        if (success) {
          console.log("Successfully fixed participants");
          // The next render will have the right participant
        } else if (participantRetryCount.current >= 3) {
          console.error("Failed to assign participants after multiple attempts, forcing challenge reveal");
          setIsRevealingChallenge(true);
        }
      } else {
        // Too many retries, just show the challenge
        console.error("Too many participant selection retries, forcing challenge reveal");
        setIsRevealingChallenge(true);
      }
    } else if (currentParticipant) {
      // Reset counter when we have a participant
      participantRetryCount.current = 0;
    }
  }, [currentParticipant, state.currentChallenge, verifyParticipantsAssigned, setIsRevealingChallenge]);
  
  // Get selected players for one-on-one challenges
  const getPlayersForOneOnOne = (): Player[] => {
    if (!state.currentChallengeParticipants || 
        state.currentChallengeParticipants.length === 0 || 
        state.currentChallenge?.type !== ChallengeType.ONE_ON_ONE) {
      return [];
    }
    
    let players: Player[] = [];
    
    if (state.gameMode === GameMode.TEAMS) {
      // For team mode, find a player from each team
      const teamIds = state.currentChallengeParticipants;
      
      teamIds.forEach((teamId, index) => {
        const team = state.teams.find(t => t.id === teamId);
        if (team && team.playerIds.length > 0) {
          // Deterministically select a player from each team based on round
          const playerIndex = (state.currentRound + index) % team.playerIds.length;
          const playerId = team.playerIds[playerIndex];
          const player = state.players.find(p => p.id === playerId);
          if (player) {
            players.push(player);
          }
        }
      });
    } else {
      // For individual mode, use the player IDs directly
      const playerIds = state.currentChallengeParticipants;
      playerIds.forEach(id => {
        const player = state.players.find(p => p.id === id);
        if (player) {
          players.push(player);
        }
      });
    }
    
    // Return all players, don't limit to just 2
    return players;
  };
  
  // Get selected player for individual reveals
  const getSelectedPlayerForReveal = (): Player | null => {
    if (!currentParticipant) return null;
    
    if (state.gameMode === GameMode.TEAMS) {
      // For team mode, find the team's selected player
      const team = currentParticipant as Team;
      if (!team.playerIds.length) return null;
      
      // Deterministically select a player from the team
      const playerIndex = state.currentRound % team.playerIds.length;
      const selectedPlayerId = team.playerIds[playerIndex];
      return state.players.find(p => p.id === selectedPlayerId) || null;
    } else {
      // For individual mode, the participant is the player
      return currentParticipant as Player;
    }
  };
  
  // Get team names for player displays
  const getTeamNamesForPlayers = (): Record<string, string> => {
    const teamNames: Record<string, string> = {};
    
    if (state.gameMode === GameMode.TEAMS) {
      state.teams.forEach(team => {
        team.playerIds.forEach(playerId => {
          teamNames[playerId] = team.name;
        });
      });
    }
    
    return teamNames;
  };
  
  // Get team name for a specific player
  const getTeamNameForPlayer = (playerId: string): string | undefined => {
    if (state.gameMode !== GameMode.TEAMS) return undefined;
    
    const team = state.teams.find(t => t.playerIds.includes(playerId));
    return team?.name;
  };

  // Handle player reveal complete
  const handlePlayerRevealComplete = () => {
    console.log("Player reveal complete");
    // Set transitioning state
    setIsTransitioning(true);
    
    // Turn off player reveal
    setIsRevealingPlayer(false);
    
    // Go to challenge reveal with a slight delay
    setTimeout(() => {
      setIsRevealingChallenge(true);
      
      // Clear transitioning after challenge reveal starts
      setTimeout(() => {
        setIsTransitioning(false);
      }, 300);
    }, 300);
  };
  
  // Handle multi-player reveal complete
  const handleMultiPlayerRevealComplete = () => {
    console.log("Multi-player reveal complete");
    // Set transitioning state to prevent showing main game area prematurely
    setIsTransitioning(true);
    
    // First turn off the multi-player reveal
    setIsRevealingMultiPlayers(false);
    
    // Then show challenge reveal with a slight delay to ensure smooth transition
    setTimeout(() => {
      setIsRevealingChallenge(true);
      
      // Clear the transitioning state after challenge reveal starts
      setTimeout(() => {
        setIsTransitioning(false);
      }, 300);
    }, 300);
  };
  
  // Handle team vs team reveal complete
  const handleTeamVsTeamRevealComplete = () => {
    console.log("Team vs team reveal complete");
    // Set transitioning state
    setIsTransitioning(true);
    
    // Turn off team reveal
    setIsRevealingTeamVsTeam(false);
    
    // Go to challenge reveal with a slight delay
    setTimeout(() => {
      setIsRevealingChallenge(true);
      
      // Clear transitioning after challenge reveal starts
      setTimeout(() => {
        setIsTransitioning(false);
      }, 300);
    }, 300);
  };
  
  // Handle challenge reveal complete
  const handleChallengeRevealComplete = () => {
    console.log("Challenge reveal complete");
    
    // Set transitioning state briefly
    setIsTransitioning(true);
    
    // Turn off challenge reveal
    setIsRevealingChallenge(false);
    
    // Allow main content to be shown after all reveals
    setTimeout(() => {
      setShowContentAfterReveal(true);
      setIsTransitioning(false);
      
      // Reset animation in progress flag for next challenge
      animationInProgressRef.current = false;
    }, 300);
  };
  
  // Start the reveal sequence based on challenge type
  const startRevealSequence = () => {
    console.log("Starting reveal sequence", state.currentChallenge?.type);
    
    // Prevent multiple reveal sequences from starting
    if (animationInProgressRef.current) {
      console.log("Animation already in progress, canceling this reveal");
      return;
    }
    
    // Set animation in progress flag
    animationInProgressRef.current = true;
    
    // Reset previous state
    setIsTransitioning(true);
    setShowContentAfterReveal(false);
    
    // Handle based on challenge type and game mode
    const challengeType = state.currentChallenge?.type;
    
    // Force participant verification
    verifyParticipantsAssigned();
    
    if (challengeType === ChallengeType.TEAM && state.gameMode === GameMode.TEAMS) {
      // For TEAM type challenges in team mode, show team vs team reveal
      console.log("Starting team vs team reveal for TEAM challenge");
      setIsRevealingTeamVsTeam(true);
      
      // Clear transitioning state once the animation starts
      setTimeout(() => setIsTransitioning(false), 300);
    }
    // Handle All vs All challenges
    else if (challengeType === ChallengeType.ALL_VS_ALL) {
      // Get all players for All vs All challenges
      let players: Player[] = [];
      
      if (state.gameMode === GameMode.TEAMS) {
        // In team mode, get players from all teams
        players = state.players.filter(player => {
          // Check if the player belongs to any team
          return state.teams.some(team => team.playerIds.includes(player.id));
        });
      } else {
        // In free-for-all mode, include all players
        players = state.players;
      }
      
      if (players.length > 0) {
        console.log(`Starting multi-player reveal for ALL_VS_ALL challenge with ${players.length} players`);
        setSelectedPlayersForReveal(players);
        setIsRevealingMultiPlayers(true);
        
        // Clear transitioning state once the animation starts
        setTimeout(() => setIsTransitioning(false), 300);
      } else {
        // No players found, skip to challenge
        console.error("No players found for All vs All reveal, skipping to challenge");
        setIsRevealingChallenge(true);
        setTimeout(() => setIsTransitioning(false), 300);
      }
    }
    // Select players for one-on-one challenges
    else if (challengeType === ChallengeType.ONE_ON_ONE) {
      const players = getPlayersForOneOnOne();
      setSelectedPlayersForReveal(players);
      
      if (players.length >= 2) {
        // For head-to-head challenges, show both players
        console.log("Starting multi-player reveal for ONE_ON_ONE challenge");
        setIsRevealingMultiPlayers(true);
        
        // Clear transitioning state once the animation starts
        setTimeout(() => setIsTransitioning(false), 300);
      } else {
        // Not enough players, skip to challenge
        console.error("Not enough players for one-on-one challenge, skipping to challenge");
        setIsRevealingChallenge(true);
        setTimeout(() => setIsTransitioning(false), 300);
      }
    } else {
      // For individual challenges, show the player
      const player = getSelectedPlayerForReveal();
      
      if (player) {
        console.log(`Starting player reveal for ${player.name}`);
        setSelectedPlayersForReveal([player]);
        setIsRevealingPlayer(true);
        
        // Clear transitioning state once the animation starts
        setTimeout(() => setIsTransitioning(false), 300);
      } else {
        // No player found, skip to challenge
        console.error("No player found for reveal, skipping to challenge");
        setIsRevealingChallenge(true);
        setTimeout(() => setIsTransitioning(false), 300);
      }
    }
  };
  
  // Add event listener for the custom reveal event
  useEffect(() => {
    const handleStartReveal = () => {
      startRevealSequence();
    };

    window.addEventListener('start-reveal-sequence', handleStartReveal);
    
    return () => {
      window.removeEventListener('start-reveal-sequence', handleStartReveal);
    };
  }, []);
  
  // Determine if we should show the main game content or loading
  const showGameContent = state.currentChallenge && 
                         !isRevealingChallenge && 
                         !isRevealingPlayer && 
                         !isRevealingMultiPlayers &&
                         !isRevealingTeamVsTeam &&
                         !isTransitioning &&
                         showContentAfterReveal;
  
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
          
          {/* Main game area - Only show once all reveals are complete */}
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
                    selectedParticipantPlayers={selectedPlayersForReveal}
                  />
                </motion.div>
              ) : (!showContentAfterReveal && state.currentChallenge) ? (
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
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </div>
      
      {/* Animations */}
      <AnimatePresence>
        {/* Team vs Team reveal (for team mode) */}
        {isRevealingTeamVsTeam && currentParticipant && 'playerIds' in currentParticipant && (
          <TeamReveal
            team={currentParticipant as Team}
            allTeams={state.teams}
            players={state.players}
            isTeamVsTeam={true}
            onRevealComplete={handleTeamVsTeamRevealComplete}
          />
        )}
        
        {/* Individual player reveal */}
        {isRevealingPlayer && selectedPlayersForReveal.length > 0 && (
          <PlayerReveal
            player={selectedPlayersForReveal[0]}
            teamName={state.gameMode === GameMode.TEAMS 
              ? getTeamNameForPlayer(selectedPlayersForReveal[0].id) 
              : undefined}
            isTeamMode={false} /* Disable Team X's turn text */
            onRevealComplete={handlePlayerRevealComplete}
          />
        )}
        
        {/* Multi-player reveal for one-on-one challenges */}
        {isRevealingMultiPlayers && selectedPlayersForReveal.length >= 2 && (
          <MultiPlayerReveal
            players={selectedPlayersForReveal}
            teamMode={state.gameMode === GameMode.TEAMS}
            teamNames={getTeamNamesForPlayers()}
            onRevealComplete={handleMultiPlayerRevealComplete}
            animationConfig={{
              // Set custom title based on challenge type
              customText: state.currentChallenge?.type === ChallengeType.ALL_VS_ALL 
                ? t('game.getReady') 
                : undefined,
              // Use different title for challenge types
              customTitle: state.currentChallenge?.type === ChallengeType.ALL_VS_ALL
                ? t('game.allVsAll')
                : undefined,
              // Use different title text for different challenge types
              showTitle: true,
              // For all-vs-all with many players, we might need to adjust the layout
              showVsText: state.currentChallenge?.type !== ChallengeType.ALL_VS_ALL || selectedPlayersForReveal.length <= 3
            }}
          />
        )}
        
        {/* Challenge reveal */}
        {isRevealingChallenge && state.currentChallenge && (
          <ChallengeReveal
            challenge={state.currentChallenge}
            onRevealComplete={handleChallengeRevealComplete}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Game;