import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { Challenge, ChallengeType, Punishment } from '@/types/Challenge';
import { Player } from '@/types/Player';
import { Team, GameMode } from '@/types/Team';
import Button from '@/components/common/Button';
import PlayerCard from '@/components/common/PlayerCard';
import TeamCard from '@/components/common/TeamCard';
import PrebuiltChallengePlayer from '@/components/prebuilt/PrebuiltChallengePlayer';
import { getParticipantById } from '@/utils/helpers';
import { bounce, shake } from '@/utils/animations';

interface ChallengeDisplayProps {
  challenge: Challenge;
  participants: string[]; // IDs of players or teams involved
  players: Player[];
  teams: Team[];
  gameMode: GameMode;
  onComplete: (completed: boolean, winnerId?: string, scores?: Record<string, number>) => void;
  selectedParticipantPlayers?: Player[]; // For one-on-one challenges: the specific players selected from teams
}

const ChallengeDisplay: React.FC<ChallengeDisplayProps> = ({
  challenge,
  participants,
  players,
  teams,
  gameMode,
  onComplete,
  selectedParticipantPlayers = []
}) => {
  const { t } = useTranslation();
  const [selectedWinner, setSelectedWinner] = useState<string | null>(null);
  const [showPunishment, setShowPunishment] = useState(false);
  const [punishmentTarget, setPunishmentTarget] = useState<string | null>(null);
  const punishmentAnimationCompleted = useRef(false);
  
  // Get participant details
  const participantDetails = participants.map(id => 
    getParticipantById(id, players, teams)
  ).filter(p => p !== null) as { id: string; name: string; type: 'player' | 'team' }[];
  
  // Get current participant (first participant is always the current player/team)
  const currentParticipant = participantDetails[0];
  
  // Get the participant information for individual challenges
  const getParticipantInfo = () => {
    if (!currentParticipant) return null;
    
    // For individual challenges
    if (challenge.type === ChallengeType.INDIVIDUAL) {
      if (currentParticipant.type === 'team' && gameMode === GameMode.TEAMS) {
        // Team mode with individual challenge - show a player from the team
        const team = teams.find(t => t.playerIds.length === 0) || teams[0];
        if (!team || team.playerIds.length === 0) return null;
        
        // If we have a pre-selected player, use that
        if (selectedParticipantPlayers && selectedParticipantPlayers.length > 0) {
          return {
            player: selectedParticipantPlayers[0],
            team
          };
        }
        
        // Otherwise get the first player from the team
        const playerId = team.playerIds[0];
        const player = players.find(p => p.id === playerId);
        
        return {
          player,
          team
        };
      } else if (currentParticipant.type === 'player') {
        // Individual player in free-for-all mode
        const player = players.find(p => p.id === currentParticipant.id);
        
        // Check if player belongs to a team (in case mixed mode)
        const playerTeam = gameMode === GameMode.TEAMS ? 
          teams.find(team => team.playerIds.includes(currentParticipant.id)) : 
          undefined;
          
        return {
          player,
          team: playerTeam
        };
      }
    }
    
    return null;
  };
  
  const participantInfo = getParticipantInfo();
  
  // Get players to show for one-on-one challenges
  const getOneOnOnePlayers = () => {
    // If we have pre-selected players, use those
    if (selectedParticipantPlayers && selectedParticipantPlayers.length > 0) {
      return selectedParticipantPlayers;
    }
    
    // Otherwise try to find players from the participants
    const oneOnOnePlayers: Player[] = [];
    
    if (gameMode === GameMode.TEAMS) {
      // In team mode, get a player from each team
      participants.slice(0, 2).forEach(teamId => {
        const team = teams.find(t => t.id === teamId);
        if (team && team.playerIds.length > 0) {
          const player = players.find(p => p.id === team.playerIds[0]);
          if (player) oneOnOnePlayers.push(player);
        }
      });
    } else {
      // In individual mode, use the participants directly
      participants.slice(0, 2).forEach(playerId => {
        const player = players.find(p => p.id === playerId);
        if (player) oneOnOnePlayers.push(player);
      });
    }
    
    return oneOnOnePlayers;
  };
  
  // Get all players for All vs All challenge type
  const getAllPlayers = () => {
    if (gameMode === GameMode.FREE_FOR_ALL) {
      // In free-for-all mode, all players participate
      return players;
    }
    
    // In team mode, get selected players from all teams
    return selectedParticipantPlayers && selectedParticipantPlayers.length > 0
      ? selectedParticipantPlayers
      : players.filter(p => p.teamId && participants.includes(p.teamId));
  };
  
  // Get players to show for winner selection
  const getWinnerOptions = () => {
    if (challenge.type === ChallengeType.INDIVIDUAL) {
      // For individual challenges, the participant is automatically the winner
      return [];
    } else if (challenge.type === ChallengeType.ONE_ON_ONE) {
      // Get the players for one-on-one challenge
      const oneOnOnePlayers = getOneOnOnePlayers();
      
      // Convert to winner options
      return oneOnOnePlayers.map(player => {
        // Find the team for this player in team mode
        const team = gameMode === GameMode.TEAMS ? 
          teams.find(t => t.playerIds.includes(player.id)) : 
          null;
        
        return {
          id: gameMode === GameMode.TEAMS && team ? team.id : player.id,
          player,
          team,
          type: gameMode === GameMode.TEAMS && team ? 'team' : 'player'
        };
      });
    } else if (challenge.type === ChallengeType.TEAM) {
      // For team challenges, winners are all teams (in team mode) or participant players
      if (gameMode === GameMode.TEAMS) {
        return teams.map(team => ({
          id: team.id,
          player: null,
          team,
          type: 'team'
        }));
      } else {
        // In free-for-all, winners would be the teams created for this challenge
        return [];
      }
    } else if (challenge.type === ChallengeType.ALL_VS_ALL) {
      // For all vs all, every player is a potential winner
      const allPlayers = getAllPlayers();
      
      return allPlayers.map(player => {
        // Find the team for this player in team mode
        const team = gameMode === GameMode.TEAMS ? 
          teams.find(t => t.playerIds.includes(player.id)) : 
          null;
        
        return {
          id: player.id,
          player,
          team,
          type: 'player'
        };
      });
    }
    
    return [];
  };
  
  const winnerOptions = getWinnerOptions();
  
  // Handle challenge completion
  const handleCompleteChallenge = (completed: boolean, winnerId?: string, scores?: Record<string, number>) => {
    if (completed) {
      if (winnerId) {
        // If a winner ID is provided (from prebuilt challenges), use it
        onComplete(true, winnerId, scores);
      } else if (challenge.type === ChallengeType.INDIVIDUAL) {
        // For individual challenges, the participant is automatically the winner
        onComplete(true, participants[0]);
      } else if (selectedWinner) {
        // For one-on-one, team, or all vs all challenges, use the selected winner
        onComplete(true, selectedWinner);
      } else if (challenge.type === ChallengeType.ONE_ON_ONE || 
                challenge.type === ChallengeType.TEAM || 
                challenge.type === ChallengeType.ALL_VS_ALL) {
        // Show toast notification when no winner is selected for competitive challenges
        toast.error(t('game.selectWinner'), {
          icon: '⚠️',
          style: {
            borderRadius: '10px',
            background: '#333',
            color: '#fff',
          },
        });
        return; // Don't proceed until a winner is selected
      }
    } else {
      // Challenge failed/skipped - show punishment if available
      if (challenge.punishment) {
        setPunishmentTarget(
          // For individual challenges, punish the participant
          challenge.type === ChallengeType.INDIVIDUAL ? participants[0] :
          // For competitive challenges, punish the losing player/team (non-selected winner)
          selectedWinner ? 
            // If winner is selected, find all non-winners to punish
            participants.find(id => id !== selectedWinner) || null :
            // If no winner selected, punish all participants
            null
        );
        setShowPunishment(true);
      } else {
        // No punishment, just fail the challenge
        onComplete(false);
      }
    }
  };
  
  // Handle punishment animation complete
  const handlePunishmentAnimationComplete = () => {
    if (!punishmentAnimationCompleted.current) {
      punishmentAnimationCompleted.current = true;
      // Wait a bit before closing the punishment display
      setTimeout(() => {
        setShowPunishment(false);
        onComplete(false);
      }, 2000);
    }
  };
  
  // Select a winner
  const handleSelectWinner = (id: string) => {
    setSelectedWinner(id);
  };
  
  // Get team for a player
  const getTeamForPlayer = (playerId: string) => {
    return teams.find(team => team.playerIds.includes(playerId));
  };
  
  // Format punishment message
  const formatPunishmentMessage = () => {
    if (!challenge.punishment) return '';
    
    let targetName = '';
    if (punishmentTarget) {
      const target = getParticipantById(punishmentTarget, players, teams);
      targetName = target ? target.name : t('common.loser');
    } else {
      targetName = t('common.loser');
    }
    
    if (challenge.punishment.type === 'sips') {
      return t('game.punishmentSips', { count: challenge.punishment.value, target: targetName });
    } else if (challenge.punishment.type === 'custom') {
      return challenge.punishment.customDescription || t('game.customPunishment');
    }
    
    return '';
  };
  
  // Render the challenge content based on challenge type
  const renderChallengeContent = () => {
    // Enhanced debugging for challenge rendering
    console.log('ChallengeDisplay rendering challenge:', {
      id: challenge.id,
      title: challenge.title,
      type: challenge.type,
      isPrebuilt: challenge.isPrebuilt,
      prebuiltType: challenge.prebuiltType,
      hasSettings: !!challenge.prebuiltSettings
    });
    
    // For prebuilt challenges, render the appropriate player component
    if (challenge.isPrebuilt) {
      console.log('Using PrebuiltChallengePlayer for challenge:', challenge.id);
      
      // Double-check we have the required prebuilt properties
      if (!challenge.prebuiltType) {
        console.error('Prebuilt challenge missing prebuiltType:', challenge.id);
      }
      
      if (!challenge.prebuiltSettings) {
        console.error('Prebuilt challenge missing prebuiltSettings:', challenge.id);
      }
      
      return (
        <PrebuiltChallengePlayer 
          challenge={challenge}
          onComplete={onComplete}
          selectedParticipantPlayers={selectedParticipantPlayers}
        />
      );
    }
    
    // For regular challenges, render the standard challenge content
    console.log('Using standard challenge display for challenge:', challenge.id);
    return (
      <div>
        {/* Challenge Type Indicator */}
        <div className="mb-6 text-center">
          <span className={`inline-block text-sm font-medium px-3 py-1 rounded-full mb-2 ${
            challenge.type === ChallengeType.INDIVIDUAL ? 'bg-pastel-blue/20 text-pastel-blue-dark dark:bg-blue-500/20 dark:text-blue-300' :
            challenge.type === ChallengeType.ONE_ON_ONE ? 'bg-pastel-orange/20 text-pastel-orange-dark dark:bg-orange-500/20 dark:text-orange-300' :
            challenge.type === ChallengeType.TEAM ? 'bg-pastel-green/20 text-pastel-green-dark dark:bg-green-500/20 dark:text-green-300' :
            'bg-pastel-purple/20 text-pastel-purple-dark dark:bg-purple-500/20 dark:text-purple-300'
          }`}>
            {challenge.type === ChallengeType.INDIVIDUAL ? t('game.challengeTypes.individual') :
              challenge.type === ChallengeType.ONE_ON_ONE ? t('game.challengeTypes.oneOnOne') :
              challenge.type === ChallengeType.TEAM ? t('game.challengeTypes.team') :
              t('game.challengeTypes.allVsAll')}
          </span>
          
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white mb-2">{t(challenge.title)}</h2>
          
          <p className="text-gray-600 dark:text-gray-300">
            {t(challenge.description)}
          </p>
        </div>
        
        {/* Current Participants Display - Always show participants */}
        <div className="mb-6">
          {/* Show individual player for individual challenges */}
          {challenge.type === ChallengeType.INDIVIDUAL && participantInfo?.player && (
            <div className="flex flex-col items-center">
              <PlayerCard
                player={participantInfo.player}
                isActive={true}
                size="lg"
                animation="pulse"
              />
              {participantInfo.team && (
                <div className="mt-2 text-sm font-medium text-game-primary">
                  {participantInfo.team.name}
                </div>
              )}
            </div>
          )}
          
          {/* Show players for one-on-one challenges */}
          {challenge.type === ChallengeType.ONE_ON_ONE && (
            <div className="flex justify-center flex-wrap gap-4">
              {getOneOnOnePlayers().map((player) => {
                const isSelected = selectedWinner === player.id || 
                  (gameMode === GameMode.TEAMS && getTeamForPlayer(player.id) && 
                   selectedWinner === getTeamForPlayer(player.id)?.id);
                   
                return (
                  <div key={player.id} className="flex flex-col items-center">
                    <PlayerCard
                      player={player}
                      isActive={true}
                      isSelected={isSelected}
                      size="md"
                      onClick={() => handleSelectWinner(gameMode === GameMode.TEAMS && getTeamForPlayer(player.id) 
                        ? getTeamForPlayer(player.id)!.id 
                        : player.id)}
                    />
                    {gameMode === GameMode.TEAMS && getTeamForPlayer(player.id) && (
                      <div className="mt-2 text-xs font-medium text-game-primary">
                        {getTeamForPlayer(player.id)?.name}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Show all players for all vs all challenges - ONLY if in FREE_FOR_ALL mode to avoid duplication */}
          {challenge.type === ChallengeType.ALL_VS_ALL && gameMode === GameMode.FREE_FOR_ALL && (
            <div className="flex flex-wrap justify-center gap-4">
              {getAllPlayers().map((player) => {
                const isSelected = selectedWinner === player.id;
                return (
                  <div key={player.id} className="flex flex-col items-center">
                    <PlayerCard
                      player={player}
                      isActive={true}
                      isSelected={isSelected}
                      size="sm"
                      onClick={() => handleSelectWinner(player.id)}
                    />
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Show teams for team challenges - ONLY when in TEAMS mode */}
          {challenge.type === ChallengeType.TEAM && gameMode === GameMode.TEAMS && (
            <div className="flex flex-wrap justify-center gap-4">
              {teams.map((team) => (
                <div key={team.id} className="flex flex-col items-center">
                  <TeamCard 
                    team={team}
                    players={players.filter(p => team.playerIds.includes(p.id))}
                    size="md"
                    compact={true}
                    isSelected={selectedWinner === team.id}
                    onClick={() => handleSelectWinner(team.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Show punishment info if available */}
        {challenge.punishment && (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-5 mb-6">
            <div className="flex items-center text-amber-600 dark:text-amber-400 font-medium mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>
                {t('challenges.lostOrFailed')}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {challenge.punishment.type === 'sips' 
                ? t('game.failurePunishmentSips', { count: challenge.punishment.value }) 
                : t('game.failurePunishmentCustom')}
              {challenge.punishment.type === 'custom' && challenge.punishment.customDescription && (
                <span className="ml-1 italic">
                  "{challenge.punishment.customDescription}"
                </span>
              )}
            </p>
          </div>
        )}
        
        {/* Winner Selection for competitive challenges */}
        {(challenge.type === ChallengeType.ONE_ON_ONE || 
          challenge.type === ChallengeType.TEAM || 
          challenge.type === ChallengeType.ALL_VS_ALL) && 
          winnerOptions.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-medium text-center text-gray-700 dark:text-gray-300 mb-3">
              {t('game.selectWinnerPrompt')}
            </h3>
            
            {challenge.type === ChallengeType.ALL_VS_ALL && (
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-3">
                {t('game.allVsAllWinnerDescription')}
              </p>
            )}
            
            <div className="flex flex-wrap justify-center gap-4">
              {winnerOptions.map(option => (
                <div key={option.id} className="text-center">
                  {option.type === 'team' && option.team ? (
                    <div onClick={() => handleSelectWinner(option.id)}>
                      <TeamCard 
                        team={option.team}
                        players={players.filter(p => option.team?.playerIds.includes(p.id) || false)}
                        size="sm"
                        compact={true}
                        isSelected={selectedWinner === option.id}
                      />
                    </div>
                  ) : option.player ? (
                    <div onClick={() => handleSelectWinner(option.id)}>
                      <PlayerCard 
                        player={option.player}
                        size="sm"
                        showScore={false}
                        isSelected={selectedWinner === option.id}
                      />
                      {gameMode === GameMode.TEAMS && option.team && (
                        <div className="mt-1 text-xs font-medium text-game-primary">
                          {option.team.name}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Challenge Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
          <Button 
            variant="danger"
            onClick={() => handleCompleteChallenge(false)}
            className="w-full sm:w-auto order-1 sm:order-1"
          >
            {t('game.challengeFailed')}
          </Button>
          
          <Button 
            variant="success"
            onClick={() => handleCompleteChallenge(true)}
            className="w-full sm:w-auto order-2 sm:order-2"
          >
            {t('game.nextChallenge')}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="challenge-display max-w-3xl sm:px-6">
      <AnimatePresence mode="wait">
        {!showPunishment ? (
          <motion.div
            key="challenge-content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderChallengeContent()}
          </motion.div>
        ) : (
          <motion.div
            key="punishment-content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            onAnimationComplete={handlePunishmentAnimationComplete}
          >
            <div className="text-center mb-6">
              <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-lg mb-4">
                <p className="text-red-700 dark:text-red-300 mb-2 font-medium">
                  {t('challenges.didntDoOrFailed')}
                </p>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                  {t('challenges.punishmentExplanation')}
                </p>
              </div>
              <motion.div
                className="inline-block bg-red-500 text-white px-6 py-4 rounded-lg mb-4 text-xl font-bold"
                variants={shake}
                initial="hidden"
                animate="visible"
              >
                {formatPunishmentMessage()}
              </motion.div>
              
              {challenge.punishment && challenge.punishment.type === 'sips' && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.2, 1] }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="text-4xl font-bold"
                >
                  🍺 × {challenge.punishment.value}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChallengeDisplay;