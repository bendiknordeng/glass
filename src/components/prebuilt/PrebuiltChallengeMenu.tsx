import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Challenge, PrebuiltChallengeType } from '@/types/Challenge';
import SpotifyMusicQuizForm from './SpotifyMusicQuizForm';
import Button from '@/components/common/Button';
import { 
  MusicalNoteIcon, 
  PlusIcon 
} from '@heroicons/react/24/solid';

interface PrebuiltChallengeMenuProps {
  onChallengeCreated: (challenge: Challenge) => void;
}

interface PrebuiltChallengeOption {
  type: PrebuiltChallengeType;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const PrebuiltChallengeMenu: React.FC<PrebuiltChallengeMenuProps> = ({
  onChallengeCreated
}) => {
  const { t } = useTranslation();
  
  // State for challenge form modals
  const [showSpotifyMusicQuizForm, setShowSpotifyMusicQuizForm] = useState(false);
  
  // List of available prebuilt challenges
  const prebuiltChallenges: PrebuiltChallengeOption[] = [
    {
      type: PrebuiltChallengeType.SPOTIFY_MUSIC_QUIZ,
      title: t('prebuilt.spotifyMusicQuiz.title'),
      description: t('prebuilt.spotifyMusicQuiz.shortDescription'),
      icon: <MusicalNoteIcon className="h-6 w-6" />,
      color: 'from-green-400 to-green-600'
    }
    // Add more prebuilt challenges here as they are developed
  ];
  
  // Handle opening the appropriate form based on challenge type
  const handleSelectChallenge = (type: PrebuiltChallengeType) => {
    switch (type) {
      case PrebuiltChallengeType.SPOTIFY_MUSIC_QUIZ:
        setShowSpotifyMusicQuizForm(true);
        break;
      default:
        console.error(`Form for challenge type ${type} not implemented`);
    }
  };
  
  return (
    <div>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
          {t('prebuilt.title')}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          {t('prebuilt.description')}
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {prebuiltChallenges.map((challenge) => (
          <motion.div
            key={challenge.type}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`
              rounded-lg overflow-hidden shadow-md border border-gray-200 dark:border-gray-700
              cursor-pointer transition-all duration-300 hover:shadow-lg
            `}
            onClick={() => handleSelectChallenge(challenge.type)}
          >
            <div className={`bg-gradient-to-r ${challenge.color} text-white p-4 flex items-center`}>
              <div className="mr-3 bg-white bg-opacity-20 p-2 rounded-full">
                {challenge.icon}
              </div>
              <h4 className="font-bold text-lg">{t(challenge.title)}</h4>
            </div>
            <div className="p-4 bg-white dark:bg-gray-800">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                {t(challenge.description)}
              </p>
              <Button
                variant="primary"
                leftIcon={<PlusIcon className="h-5 w-5" />}
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectChallenge(challenge.type);
                }}
              >
                {t('prebuilt.createChallenge')}
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
      
      {/* Coming Soon Section */}
      <div className="bg-gray-100 dark:bg-gray-800/50 rounded-lg p-4 border border-dashed border-gray-300 dark:border-gray-600 text-center">
        <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('prebuilt.comingSoon')}
        </h4>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          {t('prebuilt.moreChallengesComingSoon')}
        </p>
      </div>
      
      {/* Challenge Form Modals */}
      <SpotifyMusicQuizForm
        isOpen={showSpotifyMusicQuizForm}
        onClose={() => setShowSpotifyMusicQuizForm(false)}
        onChallengeCreated={onChallengeCreated}
      />
    </div>
  );
};

export default PrebuiltChallengeMenu; 