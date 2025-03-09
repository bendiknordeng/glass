import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Challenge, ChallengeType } from '@/types/Challenge';
import { Player } from '@/types/Player';
import { Team, GameMode } from '@/types/Team';
import Button from '@/components/common/Button';
import PlayerCard from '@/components/common/PlayerCard';
import TeamCard from '@/components/common/TeamCard';
import { getParticipantById } from '@/utils/helpers';

interface ChallengeDisplayProps {
  challenge: Challenge;
  participants: string[]; // IDs of players or teams involved
  players: Player[];
  teams: Team[];
  gameMode: GameMode;
  onComplete: (completed: boolean, winnerId?: string) => void;
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
  
  // Get participant details
  const participantDetails = participants.map(id => 
    getParticipantById(id, players, teams)
  ).filter(p => p !== null) as { id: string; name: string; type: 'player' | 'team' }[];
  
  // Get current participant (first participant is always the current player/team)
  const currentParticipant = participantDetails[0];
  
  // Fix bug in getParticipantInfo function
  const getParticipantInfo = () => {
    if (!currentParticipant) return null;
    
    // For individual challenges
    if (challenge.type === ChallengeType.INDIVIDUAL) {
      if (currentParticipant.type === 'team' && gameMode === GameMode.TEAMS) {
        // Team mode with individual challenge - show a player from the team
        const team = teams.find(t => t.id === currentParticipant.id);
        if (!team || team.playerIds.length === 0) return null;
        
        // Get a player from the team (could be random or specified)
        const playerId = team.playerIds[0]; // For now we'll use the first player
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
  
  // Get the participant information
  const participantInfo = getParticipantInfo();
  
  // Get players to show for winner selection
  const getWinnerOptions = () => {
    if (challenge.type === ChallengeType.INDIVIDUAL) {
      // For individual challenges, the participant is automatically the winner
      return [];
    } else if (challenge.type === ChallengeType.ONE_ON_ONE) {
      // For one-on-one challenges, winners are the displayed players
      return selectedParticipantPlayers.map(player => {
        // Find the team for this player
        const team = gameMode === GameMode.TEAMS ? 
          teams.find(t => t.playerIds.includes(player.id)) : 
          null;
        
        return {
          id: gameMode === GameMode.TEAMS ? team?.id || player.id : player.id,
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
        // (This would need custom handling based on your team creation logic)
        return [];
      }
    }
    
    return [];
  };
  
  const winnerOptions = getWinnerOptions();
  
  // Handle challenge completion
  const handleCompleteChallenge = (completed: boolean) => {
    if (completed) {
      if (challenge.type === ChallengeType.INDIVIDUAL) {
        // For individual challenges, the participant is automatically the winner
        onComplete(true, participants[0]);
      } else if (selectedWinner) {
        // For one-on-one or team challenges, use the selected winner
        onComplete(true, selectedWinner);
      } else {
        // No winner selected for a competitive challenge
        alert(t('game.selectWinner'));
      }
    } else {
      // Challenge failed/skipped
      onComplete(false);
    }
  };
  
  // Select a winner
  const handleSelectWinner = (id: string) => {
    setSelectedWinner(id);
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      {/* Current Turn Indicator - Only show for individual challenges */}
      {challenge.type === ChallengeType.INDIVIDUAL && (
        <div className="mb-6 text-center">
          <div className="inline-block bg-game-primary text-white px-4 py-2 rounded-full mb-4">
            <span className="font-medium">
              {t('game.currentTurn', {
                name: currentParticipant?.name,
                type: currentParticipant?.type === 'team' ? t('common.team') : t('common.player')
              })}
            </span>
          </div>
          
          {/* Display player information for individual challenges */}
          {challenge.type === ChallengeType.INDIVIDUAL && participantInfo && participantInfo.player && (
            <div className="flex flex-col items-center mb-6">
              {/* Team badge if in team mode */}
              {gameMode === GameMode.TEAMS && participantInfo.team && (
                <div className="mb-2 text-sm font-medium text-game-primary">
                  {t('game.teamMember', { team: participantInfo.team.name })}
                </div>
              )}
              
              {/* Player image and name */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', duration: 0.5 }}
                className="flex flex-col items-center"
              >
                <PlayerCard
                  player={participantInfo.player}
                  size="md"
                  animation="pulse"
                  showScore={false}
                />
                <p className="mt-2 text-gray-600 dark:text-gray-300">
                  {t('game.performingChallenge')}
                </p>
              </motion.div>
            </div>
          )}
        </div>
      )}

      {/* Selected players for one-on-one challenges */}
      {challenge.type === ChallengeType.ONE_ON_ONE && selectedParticipantPlayers.length > 0 && (
        <div className="mb-6">
          <div className="flex justify-center items-center gap-3">
            {selectedParticipantPlayers.map((player, index) => (
              <React.Fragment key={player.id}>
                {/* Player Card */}
                <div className="flex flex-col items-center">
                  {/* Team Label (if in team mode) */}
                  {gameMode === GameMode.TEAMS && (
                    <div className="mb-1 text-sm font-medium text-game-primary">
                      {(() => {
                        const team = teams.find(t => t.playerIds.includes(player.id));
                        return team ? team.name : '';
                      })()}
                    </div>
                  )}
                  
                  <PlayerCard 
                    player={player}
                    size="md"
                    showScore={false}
                    isSelected={selectedWinner === (gameMode === GameMode.TEAMS ? 
                      teams.find(t => t.playerIds.includes(player.id))?.id : player.id)}
                    onClick={() => {
                      const team = gameMode === GameMode.TEAMS ? 
                        teams.find(t => t.playerIds.includes(player.id)) : 
                        null;
                      if (team) {
                        handleSelectWinner(team.id);
                      } else {
                        handleSelectWinner(player.id);
                      }
                    }}
                  />
                </div>
                
                {/* VS between players (except after the last player) */}
                {index < selectedParticipantPlayers.length - 1 && (
                  <div className="bg-game-accent text-gray-900 px-4 py-2 rounded-lg font-bold text-xs">
                    VS
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center">
            {t('game.selectWinnerInstruction')}
          </p>
        </div>
      )}

      {/* Challenge Header */}
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          {challenge.title}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          {challenge.description}
        </p>
        <div className="flex justify-center items-center gap-2">
          <span className="bg-game-secondary text-white text-sm font-medium px-3 py-1 rounded-full">
            {challenge.type === ChallengeType.INDIVIDUAL 
              ? t('game.challengeTypes.individual')
              : challenge.type === ChallengeType.ONE_ON_ONE
                ? t('game.challengeTypes.oneOnOne')
                : t('game.challengeTypes.team')}
          </span>
          <span className="bg-game-accent text-gray-800 text-sm font-medium px-3 py-1 rounded-full">
            {challenge.points} {challenge.points === 1 ? t('common.point') : t('common.points')}
          </span>
        </div>
      </div>
      
      {/* Team selection for winners - Only for team challenges in team mode */}
      {challenge.type === ChallengeType.TEAM && gameMode === GameMode.TEAMS && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-3 text-center">
            {t('game.selectWinnerInstruction')}
          </h3>
          
          <div className="flex flex-wrap justify-center gap-4">
            {teams.map(team => (
              <motion.div
                key={team.id}
                whileHover={{ scale: 1.03 }}
                className={`cursor-pointer ${selectedWinner === team.id ? 'ring-4 ring-game-accent' : ''}`}
                onClick={() => handleSelectWinner(team.id)}
              >
                <TeamCard 
                  team={team} 
                  players={players}
                  showPlayers={true}
                  size="sm"
                />
              </motion.div>
            ))}
          </div>
        </div>
      )}
      
      {/* Completion Controls */}
      <div className="flex flex-col gap-3 mt-6">
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 text-center mb-2">
          {t('game.challengeQuestion')}
        </h3>
        
        <div className="flex justify-center gap-3">
          <Button
            variant="success"
            size="lg"
            onClick={() => handleCompleteChallenge(true)}
          >
            {t('game.completed')}
          </Button>
          
          <Button
            variant="danger"
            size="lg"
            onClick={() => handleCompleteChallenge(false)}
          >
            {t('game.failed')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChallengeDisplay;