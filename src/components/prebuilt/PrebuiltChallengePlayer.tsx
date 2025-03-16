import React from 'react';
import { Challenge, PrebuiltChallengeType } from '@/types/Challenge';
import SpotifyMusicQuizPlayer from './SpotifyMusicQuizPlayer';

interface PrebuiltChallengePlayerProps {
  challenge: Challenge;
  onComplete: (completed: boolean, winnerId?: string) => void;
}

/**
 * Factory component that renders the appropriate player component 
 * based on the prebuilt challenge type.
 */
const PrebuiltChallengePlayer: React.FC<PrebuiltChallengePlayerProps> = ({
  challenge,
  onComplete
}) => {
  // Check if this is a prebuilt challenge
  if (!challenge.isPrebuilt || !challenge.prebuiltType) {
    console.error('Not a valid prebuilt challenge', challenge);
    return null;
  }

  // Select the appropriate player component based on the challenge type
  switch (challenge.prebuiltType) {
    case PrebuiltChallengeType.SPOTIFY_MUSIC_QUIZ:
      return (
        <SpotifyMusicQuizPlayer
          challenge={challenge}
          onComplete={onComplete}
        />
      );
    default:
      console.error(`No player component for challenge type: ${challenge.prebuiltType}`);
      return (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-md">
          Unsupported challenge type: {challenge.prebuiltType}
        </div>
      );
  }
};

export default PrebuiltChallengePlayer; 