import React, { useEffect } from 'react';
import { Challenge, PrebuiltChallengeType } from '@/types/Challenge';
import SpotifyMusicQuizPlayer from './SpotifyMusicQuizPlayer';
import QuizPlayer from './QuizPlayer';
import { Player } from '@/types/Player';

interface PrebuiltChallengePlayerProps {
  challenge: Challenge;
  onComplete: (completed: boolean, winnerId?: string, scores?: Record<string, number>) => void;
  selectedParticipantPlayers?: Player[]; // Add selected players for one-on-one challenges
}

/**
 * Factory component that renders the appropriate player component 
 * based on the prebuilt challenge type.
 */
const PrebuiltChallengePlayer: React.FC<PrebuiltChallengePlayerProps> = ({
  challenge,
  onComplete,
  selectedParticipantPlayers
}) => {
  // Enhanced debug information on mount
  useEffect(() => {
    console.log('PrebuiltChallengePlayer mounted for challenge:', {
      id: challenge.id,
      title: challenge.title,
      isPrebuilt: challenge.isPrebuilt,
      prebuiltType: challenge.prebuiltType,
      hasPrebuiltSettings: !!challenge.prebuiltSettings,
    });
  }, [challenge]);
  
  // Validate that this is actually a prebuilt challenge with required properties
  if (!challenge.isPrebuilt) {
    console.error('Challenge is missing isPrebuilt flag:', {
      id: challenge.id,
      title: challenge.title,
      type: challenge.type
    });
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-md">
        <p className="font-bold mb-2">Error: Invalid Prebuilt Challenge</p>
        <p>This challenge is not marked as a prebuilt challenge (missing isPrebuilt flag).</p>
        <p className="mt-2 text-sm">Challenge ID: {challenge.id}</p>
        <p className="text-sm">Challenge Title: {challenge.title}</p>
      </div>
    );
  }
  
  if (!challenge.prebuiltType) {
    console.error('Prebuilt challenge is missing prebuiltType:', {
      id: challenge.id,
      title: challenge.title,
      isPrebuilt: challenge.isPrebuilt
    });
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-md">
        <p className="font-bold mb-2">Error: Invalid Prebuilt Challenge Configuration</p>
        <p>This challenge is marked as prebuilt but is missing the prebuiltType property.</p>
        <p className="mt-2 text-sm">Challenge ID: {challenge.id}</p>
        <p className="text-sm">Challenge Title: {challenge.title}</p>
      </div>
    );
  }
  
  if (!challenge.prebuiltSettings) {
    console.error('Prebuilt challenge is missing prebuiltSettings:', {
      id: challenge.id,
      title: challenge.title,
      prebuiltType: challenge.prebuiltType
    });
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-md">
        <p className="font-bold mb-2">Error: Missing Prebuilt Challenge Settings</p>
        <p>This challenge is missing required prebuilt settings configuration.</p>
        <p className="mt-2 text-sm">Challenge ID: {challenge.id}</p>
        <p className="text-sm">Challenge Title: {challenge.title}</p>
        <p className="text-sm">Prebuilt Type: {challenge.prebuiltType}</p>
      </div>
    );
  }

  // Select the appropriate player component based on the challenge type
  switch (challenge.prebuiltType) {
    case PrebuiltChallengeType.SPOTIFY_MUSIC_QUIZ:
      console.log('Rendering SpotifyMusicQuizPlayer for challenge:', challenge.id);
      return (
        <SpotifyMusicQuizPlayer
          challenge={challenge}
          onComplete={(completed: boolean, winnerId?: string, scores?: Record<string, number>) => {
            console.log('SpotifyMusicQuizPlayer completed', { completed, winnerId, scores });
            onComplete(completed, winnerId, scores || {});
          }}
          selectedParticipantPlayers={selectedParticipantPlayers}
        />
      );
    case PrebuiltChallengeType.QUIZ:
      console.log('Rendering QuizPlayer for challenge:', challenge.id);
      return (
        <QuizPlayer
          challenge={challenge}
          onComplete={(completed: boolean, winnerId?: string, scores?: Record<string, number>) => {
            console.log('QuizPlayer completed', { completed, winnerId, scores });
            onComplete(completed, winnerId, scores || {});
          }}
          selectedParticipantPlayers={selectedParticipantPlayers}
        />
      );
    default:
      console.error(`No player component for prebuilt challenge type: ${challenge.prebuiltType}`, {
        id: challenge.id,
        title: challenge.title
      });
      return (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-md">
          <p className="font-bold mb-2">Unsupported Challenge Type</p>
          <p>The prebuilt challenge type "{challenge.prebuiltType}" is not supported.</p>
          <p className="mt-2 text-sm">Challenge ID: {challenge.id}</p>
          <p className="text-sm">Challenge Title: {challenge.title}</p>
        </div>
      );
  }
};

export default PrebuiltChallengePlayer; 