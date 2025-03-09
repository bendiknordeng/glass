import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Challenge, ChallengeType } from '@/types/Challenge';

interface ChallengeRevealProps {
  challenge: Challenge;
  onRevealComplete?: () => void;
}

const ChallengeReveal: React.FC<ChallengeRevealProps> = ({
  challenge,
  onRevealComplete
}) => {
  const { t } = useTranslation();
  const [stage, setStage] = useState<'initial' | 'title' | 'details' | 'complete'>('initial');
  const [show, setShow] = useState(false);

  // Animation sequence
  useEffect(() => {
    console.log("ChallengeReveal animation sequence started", { challenge: challenge.title });
    
    // Start by showing the component
    const timer0 = setTimeout(() => {
      console.log("ChallengeReveal Timer 0: showing component");
      setShow(true);
    }, 500);

    const timer1 = setTimeout(() => {
      console.log("ChallengeReveal Timer 1: showing title");
      // First show the challenge title
      setStage('title');
    }, 1000);

    const timer2 = setTimeout(() => {
      console.log("ChallengeReveal Timer 2: showing details");
      // Then show the challenge details (type, difficulty, points)
      setStage('details');
    }, 2000);

    const timer3 = setTimeout(() => {
      console.log("ChallengeReveal Timer 3: completing reveal");
      // Complete the reveal
      setStage('complete');
    }, 3000);

    const timer4 = setTimeout(() => {
      console.log("ChallengeReveal Timer 4: starting exit animation");
      // Start exit animation
      setShow(false);
    }, 5000);

    const timer5 = setTimeout(() => {
      console.log("ChallengeReveal Timer 5: notifying completion");
      // Notify parent that reveal is complete
      if (onRevealComplete) {
        onRevealComplete();
      } else {
        console.log("No onRevealComplete callback provided for ChallengeReveal");
      }
    }, 6000);

    return () => {
      console.log("ChallengeReveal component unmounting, clearing timers");
      clearTimeout(timer0);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      clearTimeout(timer5);
    };
  }, [onRevealComplete, challenge.title]);

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
      {show && (
        <motion.div
          className="fixed inset-0 flex flex-col items-center justify-center bg-black bg-opacity-80 z-50 p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Challenge Reveal Container */}
          <motion.div
            className="w-full max-w-lg rounded-2xl overflow-hidden bg-white dark:bg-game-dark shadow-2xl"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ 
              type: 'spring',
              stiffness: 300,
              damping: 25
            }}
          >
            {/* Challenge Title */}
            <motion.div
              className="p-8 text-center"
              initial={{ y: -20, opacity: 0 }}
              animate={{ 
                y: stage === 'title' || stage === 'details' || stage === 'complete' ? 0 : -20,
                opacity: stage === 'title' || stage === 'details' || stage === 'complete' ? 1 : 0
              }}
              transition={{ duration: 0.6 }}
            >
              <motion.div
                className="text-lg text-game-primary font-medium mb-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                {t('game.newChallenge')}
              </motion.div>
              <h2 className="text-4xl font-bold text-gray-800 dark:text-white">
                {challenge.title}
              </h2>
            </motion.div>

            {/* Challenge Details */}
            <motion.div
              className="p-8 bg-gray-50 dark:bg-gray-800"
              initial={{ y: 20, opacity: 0 }}
              animate={{ 
                y: stage === 'details' || stage === 'complete' ? 0 : 20,
                opacity: stage === 'details' || stage === 'complete' ? 1 : 0
              }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex flex-col items-center gap-6">
                {/* Challenge Type */}
                <div className={`px-6 py-3 rounded-full ${getChallengeTypeColor()} text-gray-800 font-medium text-lg`}>
                  {getChallengeTypeText()}
                </div>

                {/* Points */}
                <div className="px-6 py-3 bg-pastel-yellow rounded-full text-gray-800 font-bold text-lg">
                  {challenge.points} {challenge.points === 1 ? t('common.point') : t('common.points')}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ChallengeReveal;