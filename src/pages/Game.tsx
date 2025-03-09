import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/contexts/GameContext';
import { useGameState } from '@/hooks/useGameState';
import { formatTime, getParticipantById } from '@/utils/helpers';
import Button from '@/components/common/Button';
import ScoreBoard from '@/components/game/ScoreBoard';
import ChallengeDisplay from '@/components/game/ChallengeDisplay';
import PlayerSelection from '@/components/animations/PlayerSelection';
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
    isSelectingPlayer,
    isRevealingChallenge,
    isShowingResults,
    getCurrentParticipant,
    getChallengeParticipants,
    completeChallenge,
    startGame,
    selectNextChallenge,
    setIsSelectingPlayer,
    setIsRevealingChallenge
  } = useGameState();
  
  // States for reveal flow
  const [isRevealingTeam, setIsRevealingTeam] = useState(false);
  const [isRevealingPlayer, setIsRevealingPlayer] = useState(false);
  const [isRevealingMultiPlayers, setIsRevealingMultiPlayers] = useState(false);
  
  // Add a state to track animation transitions
  const [isTransitioning, setIsTransitioning] = useState(false);
  
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
    if (!state.currentChallenge && !isSelectingPlayer && !isRevealingChallenge &&
        !isRevealingTeam && !isRevealingPlayer && !isRevealingMultiPlayers) {
      // For continued games, just select the next challenge without animations
      if (state.results.length > 0) {
        selectNextChallenge();
      } else {
        // For new games, start with full animation flow
        startGame();
      }
    }
  }, [state.players.length, state.gameFinished, state.currentChallenge, 
      isSelectingPlayer, isRevealingChallenge, isRevealingTeam, 
      isRevealingPlayer, isRevealingMultiPlayers, 
      state.results.length, navigate, startGame, selectNextChallenge, state.gameMode]);
  
  // Get current participant
  const currentParticipant = getCurrentParticipant();
  
  // Get challenge participants
  const challengeParticipants = getChallengeParticipants();
  
  // Handle team reveal complete
  const handleTeamRevealComplete = () => {
    // Set transitioning state
    setIsTransitioning(true);
    
    const challenge = state.currentChallenge;
    if (!challenge) {
      // If no challenge somehow, just go to challenge reveal
      setIsRevealingTeam(false);
      setIsRevealingChallenge(true);
      
      // Clear transitioning after a delay
      setTimeout(() => {
        setIsTransitioning(false);
      }, 500);
      return;
    }
    
    // Always turn off team reveal first
    setIsRevealingTeam(false);
    
    // For individual challenges in team mode, show player reveal next
    if (challenge.type === ChallengeType.INDIVIDUAL && state.gameMode === GameMode.TEAMS) {
      // Find a player from the team
      const currentTeam = currentParticipant as Team;
      if (currentTeam && currentTeam.playerIds.length > 0) {
        // Randomly select one player from the team
        const randomIndex = Math.floor(Math.random() * currentTeam.playerIds.length);
        const selectedPlayerId = currentTeam.playerIds[randomIndex];
        const selectedPlayer = state.players.find(p => p.id === selectedPlayerId);
        
        if (selectedPlayer) {
          setTimeout(() => {
            setIsRevealingPlayer(true);
            
            // Clear transitioning after player reveal starts
            setTimeout(() => {
              setIsTransitioning(false);
            }, 500);
          }, 500);
          return;
        }
      }
    } else if (challenge.type === ChallengeType.ONE_ON_ONE) {
      // For one-on-one challenges, show multi-player reveal
      
      // Get all players for the one-on-one challenge
      const playerIds: string[] = [];
      challengeParticipants.forEach(participant => {
        const entity = getParticipantById(participant.id, state.players, state.teams);
        if (entity) {
          if (entity && 'playerIds' in entity) {
            // It's a team
            const team = state.teams.find(t => t.id === entity.id);
            if (team && team.playerIds.length > 0) {
              const randomIndex = Math.floor(Math.random() * team.playerIds.length);
              playerIds.push(team.playerIds[randomIndex]);
            }
          } else {
            // It's a player
            playerIds.push(entity.id);
          }
        }
      });
      
      // Only proceed if we have players
      if (playerIds.length > 0) {
        setTimeout(() => {
          setIsRevealingMultiPlayers(true);
          
          // Clear transitioning after multi-player reveal starts
          setTimeout(() => {
            setIsTransitioning(false);
          }, 500);
        }, 500);
        return;
      }
    }
    
    // Default case: go to challenge reveal
    setTimeout(() => {
      setIsRevealingChallenge(true);
      
      // Clear transitioning after challenge reveal starts
      setTimeout(() => {
        setIsTransitioning(false);
      }, 500);
    }, 500);
  };
  
  // Handle player reveal complete
  const handlePlayerRevealComplete = () => {
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
      }, 500);
    }, 500);
  };
  
  // Handle multi-player reveal complete
  const handleMultiPlayerRevealComplete = () => {
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
      }, 500);
    }, 500);
  };
  
  // Determine which players to show in reveals
  const getSelectedPlayersForReveal = (): Player[] => {
    // Default is a single player from the current participant
    let selectedPlayers: Player[] = [];
    
    // For one-on-one challenges, we need one player from each team
    if (state.currentChallenge?.type === ChallengeType.ONE_ON_ONE) {
      // Get all participant IDs (these should be team IDs in team mode)
      const participantIds = state.currentChallengeParticipants;
      
      // For each participant (team), select one player
      participantIds.forEach(participantId => {
        if (state.gameMode === GameMode.TEAMS) {
          // In team mode, find a player from the team
          const team = state.teams.find(t => t.id === participantId);
          if (team && team.playerIds.length > 0) {
            // We'll deterministically select a player based on team turn index to make it fair
            // This way the same player isn't always selected from a team
            const playerIndex = state.currentRound % team.playerIds.length;
            const playerId = team.playerIds[playerIndex];
            const player = state.players.find(p => p.id === playerId);
            if (player) {
              selectedPlayers.push(player);
            }
          }
        } else {
          // In free-for-all mode, just find the player
          const player = state.players.find(p => p.id === participantId);
          if (player) {
            selectedPlayers.push(player);
          }
        }
      });
    } else if (currentParticipant) {
      // For individual challenges
      if ('playerIds' in currentParticipant) {
        // It's a team, randomly select one player
        const teamPlayerIds = (currentParticipant as Team).playerIds;
        if (teamPlayerIds.length > 0) {
          const randomIndex = Math.floor(Math.random() * teamPlayerIds.length);
          const player = state.players.find(p => p.id === teamPlayerIds[randomIndex]);
          if (player) selectedPlayers.push(player);
        }
      } else {
        // It's a player
        selectedPlayers.push(currentParticipant as Player);
      }
    }
    
    return selectedPlayers;
  };
  
  // Get team names for players in multi-player reveal
  const getTeamNamesForPlayers = (): Record<string, string> => {
    const teamNames: Record<string, string> = {};
    
    if (state.gameMode === GameMode.TEAMS) {
      // More descriptive logic for team mode
      const selectedPlayers = getSelectedPlayersForReveal();
      
      // Get team for each selected player
      selectedPlayers.forEach(player => {
        // Find which team this player belongs to
        const playerTeam = state.teams.find(team => team.playerIds.includes(player.id));
        if (playerTeam) {
          teamNames[player.id] = playerTeam.name;
        }
      });
    }
    
    return teamNames;
  };
  
  // Get the selected player for individual reveal
  const getSelectedPlayerForReveal = (): Player | null => {
    const players = getSelectedPlayersForReveal();
    return players.length > 0 ? players[0] : null;
  };
  
  // Get the team name for the selected player
  const getTeamNameForPlayer = (playerId: string): string | undefined => {
    const playerTeam = state.teams.find(team => team.playerIds.includes(playerId));
    return playerTeam?.name;
  };
  
  // Determine if we should show the main game content
  const showGameContent = state.currentChallenge && 
                          !isSelectingPlayer && 
                          !isRevealingChallenge && 
                          !isRevealingTeam && 
                          !isRevealingPlayer && 
                          !isRevealingMultiPlayers &&
                          !isTransitioning;
  
  // Add this useEffect to check important state values when they change
  useEffect(() => {
    // If isSelectingPlayer is true but currentParticipant is null, we have a problem
    if (isSelectingPlayer) {
      if (!currentParticipant) {
        console.error("isSelectingPlayer is true but currentParticipant is null, forcing challenge reveal");
        // Force a transition to challenge reveal to avoid getting stuck
        setIsSelectingPlayer(false);
        if (state.currentChallenge) {
          setIsRevealingChallenge(true);
        }
      } else if (!state.currentChallenge) {
        // Also handle case where we have a participant but no challenge
        console.error("isSelectingPlayer is true but no current challenge");
        setIsSelectingPlayer(false);
        selectNextChallenge();
      }
    }
  }, [isSelectingPlayer, currentParticipant, state.currentChallenge, setIsSelectingPlayer, setIsRevealingChallenge, selectNextChallenge]);
  
  // Update the showGameContent logic to store selected players
  const selectedPlayersForOneOnOne = 
    state.currentChallenge?.type === ChallengeType.ONE_ON_ONE ? 
    getSelectedPlayersForReveal() : 
    [];
  
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
                    selectedParticipantPlayers={selectedPlayersForOneOnOne}
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
        {/* Initial player/team selection */}
        {isSelectingPlayer && (() => {
          if (!currentParticipant) {
            console.error("Trying to render PlayerSelection but currentParticipant is null");
            // Force transition to next phase
            setTimeout(() => {
              setIsSelectingPlayer(false);
              if (state.currentChallenge) {
                setIsRevealingChallenge(true);
              }
            }, 100);
            return null;
          }
          
          return (
            <PlayerSelection
              currentParticipant={currentParticipant}
              isTeam={state.gameMode === 'teams'}
              players={state.players}
              onSelectionComplete={() => {
                // Use the callback to trigger the transition directly
                setIsSelectingPlayer(false);
                
                // Start next phase of reveal
                const challenge = state.currentChallenge;
                if (!challenge) {
                  console.error("No challenge available after player selection");
                  return;
                }
                
                // Choose the correct next reveal based on game mode and challenge type
                if (state.gameMode === GameMode.TEAMS) {
                  if (challenge.type === ChallengeType.TEAM) {
                    // Team challenges go straight to challenge reveal
                    setIsRevealingChallenge(true);
                  } else if (challenge.type === ChallengeType.ONE_ON_ONE) {
                    // For one-on-one in team mode, we skip team reveal and go directly to multi-player
                    // This fixes the issue where selected players weren't being shown
                    const selectedPlayers = getSelectedPlayersForReveal();
                    
                    if (selectedPlayers.length >= 2) {
                      // We have enough players for a one-on-one
                      setIsRevealingMultiPlayers(true);
                    } else {
                      // Fallback if we don't have enough players
                      setIsRevealingChallenge(true);
                    }
                  } else if (currentParticipant && 'playerIds' in currentParticipant) {
                    // For individual challenges in team mode, show team reveal first
                    setIsRevealingTeam(true);
                  } else {
                    // Fallback
                    setIsRevealingChallenge(true);
                  }
                } else {
                  // Free for all mode
                  if (challenge.type === ChallengeType.ONE_ON_ONE) {
                    setIsRevealingMultiPlayers(true);
                  } else {
                    setIsRevealingPlayer(true);
                  }
                }
              }}
            />
          );
        })()}
        
        {/* Team reveal (for team mode) */}
        {isRevealingTeam && currentParticipant && 'playerIds' in currentParticipant && (
          <TeamReveal
            team={currentParticipant as Team}
            players={state.players}
            onRevealComplete={handleTeamRevealComplete}
          />
        )}
        
        {/* Individual player reveal */}
        {isRevealingPlayer && getSelectedPlayerForReveal() && (
          <PlayerReveal
            player={getSelectedPlayerForReveal()!}
            teamName={state.gameMode === GameMode.TEAMS 
              ? getTeamNameForPlayer(getSelectedPlayerForReveal()!.id) 
              : undefined}
            isTeamMode={state.gameMode === GameMode.TEAMS}
            onRevealComplete={handlePlayerRevealComplete}
          />
        )}
        
        {/* Multi-player reveal for one-on-one challenges */}
        {isRevealingMultiPlayers && getSelectedPlayersForReveal().length > 0 && (
          <MultiPlayerReveal
            players={getSelectedPlayersForReveal()}
            teamMode={state.gameMode === GameMode.TEAMS}
            teamNames={getTeamNamesForPlayers()}
            onRevealComplete={handleMultiPlayerRevealComplete}
          />
        )}
        
        {/* Challenge reveal */}
        {isRevealingChallenge && state.currentChallenge && (
          <ChallengeReveal
            challenge={state.currentChallenge}
            onRevealComplete={() => {
              // End the challenge reveal animation and display the challenge in the main game area
              setIsRevealingChallenge(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Game;