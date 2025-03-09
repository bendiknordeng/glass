import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Challenge, ChallengeType } from '@/types/Challenge';

interface ChallengeRevealProps {
  challenge: Challenge;
  participants: { id: string; name: string; type: 'player' | 'team' }[];
  onRevealComplete?: () => void;
}

const ChallengeReveal: React.FC<ChallengeRevealProps> = ({
  challenge,
  participants,
  onRevealComplete
}) => {
  const { t } = useTranslation();
  const [stage, setStage] = useState<'type' | 'description' | 'participants' | 'complete'>('type');

  // Animation sequence
  useEffect(() => {
    const timer1 = setTimeout(() => {
      // First show the challenge type
      setStage('description');
    }, 1500);

    const timer2 = setTimeout(() => {
      // Then show the challenge description
      setStage('participants');
    }, 3000);

    const timer3 = setTimeout(() => {
      // Then show the participants
      setStage('complete');
    }, 4500);

    const timer4 = setTimeout(() => {
      // Notify parent that reveal is complete
      if (onRevealComplete) {
        onRevealComplete();
      }
    }, 6000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [onRevealComplete]);

  // Get challenge type text
  const getChallengeTypeText = () => {
    switch (challenge.type) {
      case ChallengeType.INDIVIDUAL:
        return t('game.challengeTypes.individual');
      case ChallengeType.ONE_ON_ONE:
        return t('game.challengeTypes.oneOnOne');
      case ChallengeType.TEAM:
        return t('game.challengeTypes.team');
      default:
        return '';
    }
  };

  // Get color based on challenge type
  const getChallengeTypeColor = () => {
    switch (challenge.type) {
      case ChallengeType.INDIVIDUAL:
        return 'bg-pastel-blue';
      case ChallengeType.ONE_ON_ONE:
        return 'bg-pastel-orange';
      case ChallengeType.TEAM:
        return 'bg-pastel-green';
      default:
        return 'bg-gray-100';
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 flex flex-col items-center justify-center bg-black bg-opacity-80 z-50 p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Challenge Reveal Container */}
        <motion.div
          className="w-full max-w-lg rounded-2xl overflow-hidden bg-white dark:bg-game-dark shadow-2xl"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ 
            type: 'spring',
            stiffness: 300,
            damping: 25
          }}
        >
          {/* Challenge Type */}
          <motion.div
            className={`p-4 text-center ${getChallengeTypeColor()}`}
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
              {getChallengeTypeText()}
            </h2>
          </motion.div>

          {/* Challenge Description */}
          <div className="p-6">
            <motion.div
              className="text-center mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: stage === 'description' || stage === 'participants' || stage === 'complete' ? 1 : 0 }}
              transition={{ duration: 0.5 }}
            >
              <h3 className="text-xl font-semibold mb-2 text-gray-700 dark:text-gray-100">
                {challenge.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {challenge.description}
              </p>
            </motion.div>

            {/* Participants */}
            {(challenge.type === ChallengeType.ONE_ON_ONE || challenge.type === ChallengeType.TEAM) && (
              <motion.div
                className="mt-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ 
                  opacity: stage === 'participants' || stage === 'complete' ? 1 : 0,
                  y: stage === 'participants' || stage === 'complete' ? 0 : 20 
                }}
                transition={{ duration: 0.5 }}
              >
                <div className="flex flex-col items-center">
                  <h4 className="text-center font-medium mb-2 text-gray-600 dark:text-gray-400">
                    {challenge.type === ChallengeType.ONE_ON_ONE ? 'Players' : 'Teams'}
                  </h4>
                  
                  <div className="flex justify-center items-center gap-4">
                    {participants.map((participant, index) => (
                      <React.Fragment key={participant.id}>
                        <div className="text-center">
                          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 text-white font-bold ${index === 0 ? 'bg-game-primary' : 'bg-game-secondary'}`}>
                            {participant.name.substring(0, 2).toUpperCase()}
                          </div>
                          <p className="text-sm font-medium dark:text-white">{participant.name}</p>
                        </div>
                        
                        {index < participants.length - 1 && (
                          <div className="text-xl font-bold text-game-accent">
                            {t('game.versus')}
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Points */}
            <motion.div
              className="mt-6 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: stage === 'complete' ? 1 : 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-block px-4 py-2 bg-pastel-yellow rounded-full text-gray-800 font-bold">
                {challenge.points} {challenge.points === 1 ? 'point' : 'points'}
              </div>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ChallengeReveal;