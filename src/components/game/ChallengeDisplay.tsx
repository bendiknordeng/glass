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
}

const ChallengeDisplay: React.FC<ChallengeDisplayProps> = ({
  challenge,
  participants,
  players,
  teams,
  gameMode,
  onComplete
}) => {
  const { t } = useTranslation();
  const [selectedWinner, setSelectedWinner] = useState<string | null>(null);
  
  // Get participant details
  const participantDetails = participants.map(id => 
    getParticipantById(id, players, teams)
  ).filter(p => p !== null) as { id: string; name: string; type: 'player' | 'team' }[];
  
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
            {challenge.points} {challenge.points === 1 ? t('challenges.point') : t('challenges.points')}
          </span>
        </div>
      </div>
      
      {/* Participants */}
      {challenge.type !== ChallengeType.INDIVIDUAL && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-3 text-center">
            {t('game.participants')}
          </h3>
          
          <div className="flex flex-wrap justify-center gap-4">
            {participantDetails.map((participant) => {
              if (participant.type === 'team') {
                const team = teams.find(t => t.id === participant.id);
                if (!team) return null;
                
                return (
                  <motion.div
                    key={participant.id}
                    whileHover={{ scale: 1.03 }}
                    className={`cursor-pointer ${selectedWinner === participant.id ? 'ring-4 ring-game-accent' : ''}`}
                    onClick={() => handleSelectWinner(participant.id)}
                  >
                    <TeamCard 
                      team={team} 
                      players={players}
                      showPlayers={true}
                      size="sm"
                    />
                  </motion.div>
                );
              } else {
                const player = players.find(p => p.id === participant.id);
                if (!player) return null;
                
                return (
                  <motion.div
                    key={participant.id}
                    whileHover={{ scale: 1.05 }}
                    className={`cursor-pointer ${selectedWinner === participant.id ? 'ring-4 ring-game-accent' : ''}`}
                    onClick={() => handleSelectWinner(participant.id)}
                  >
                    <PlayerCard 
                      player={player}
                      size="md"
                    />
                  </motion.div>
                );
              }
            })}
          </div>
          
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center">
            {t('game.selectWinnerInstruction')}
          </p>
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