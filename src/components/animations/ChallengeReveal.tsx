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
  const [showReveal, setShowReveal] = useState(false);
  const [showTitle, setShowTitle] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  
  // Get icon based on challenge type
  const getChallengeTypeIcon = () => {
    switch (challenge.type) {
      case ChallengeType.INDIVIDUAL:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        );
      case ChallengeType.TEAM:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
        );
      case ChallengeType.ONE_ON_ONE:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="12" y1="8" x2="12" y2="16"></line>
            <line x1="8" y1="12" x2="16" y2="12"></line>
          </svg>
        );
      default:
        return null;
    }
  };
  
  // Animation sequence
  useEffect(() => {
    const timer1 = setTimeout(() => {
      // Start by showing the component
      setShowReveal(true);
    }, 300);
    
    const timer2 = setTimeout(() => {
      // Show the challenge title
      setShowTitle(true);
    }, 1200);
    
    const timer3 = setTimeout(() => {
      // Show the challenge description
      setShowDescription(true);
    }, 2200);
    
    const timer4 = setTimeout(() => {
      // Start fade out
      setIsComplete(true);
    }, 4500);
    
    const timer5 = setTimeout(() => {
      // Notify parent that reveal is complete
      if (onRevealComplete) {
        onRevealComplete();
      }
    }, 5000);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      clearTimeout(timer5);
    };
  }, [onRevealComplete]);
  
  return (
    <AnimatePresence>
      {showReveal && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-90 z-50 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Subtle spotlight effect */}
          <motion.div
            className="absolute w-full h-full pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
          >
            <div className="w-full h-full bg-[radial-gradient(circle,rgba(255,255,255,0.1)_0%,rgba(0,0,0,0)_70%)]" />
          </motion.div>
          
          {/* Challenge Card */}
          <motion.div
            className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-2xl max-w-md w-full mx-4 relative"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ 
              scale: isComplete ? 0.8 : 1,
              opacity: isComplete ? 0 : 1,
              boxShadow: ['0 0 0px rgba(255, 255, 255, 0.3)', '0 0 20px rgba(255, 255, 255, 0.5)', '0 0 0px rgba(255, 255, 255, 0.3)'],
            }}
            transition={{
              scale: { type: 'spring', stiffness: 300, damping: 25 },
              opacity: { duration: 0.5 },
              boxShadow: { repeat: Infinity, duration: 3, ease: "easeInOut" }
            }}
          >
            {/* Challenge Type Badge - Improved positioning and styling */}
            <motion.div 
              className="absolute top-3 left-0 right-0 flex justify-center"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ 
                type: 'spring',
                stiffness: 300,
                damping: 20,
                delay: 0.5 
              }}
            >
              <div className="inline-flex items-center bg-gradient-to-r from-game-accent/90 to-game-primary/90 px-4 py-1.5 rounded-full shadow-md">
                <span className="text-white text-sm font-medium mr-1.5">{t(`challenges.type.${challenge.type}`)}</span>
                {getChallengeTypeIcon()}
              </div>
            </motion.div>
            
            {/* Card Content */}
            <div className="p-6 pt-16">
              {/* Challenge Title */}
              <motion.h2
                className="text-2xl font-bold text-gray-900 dark:text-white mb-4 text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ 
                  opacity: showTitle ? 1 : 0,
                  y: showTitle ? 0 : 20,
                  textShadow: showTitle ? '0 0 8px rgba(0, 0, 0, 0.2)' : '0 0 0px rgba(0, 0, 0, 0)'
                }}
                transition={{ 
                  type: 'spring',
                  stiffness: 300,
                  damping: 25
                }}
              >
                {challenge.title}
              </motion.h2>
              
              {/* Animated Divider */}
              {showTitle && (
                <motion.div
                  className="h-1 bg-gradient-to-r from-game-accent to-game-primary mx-auto rounded-full mb-6"
                  initial={{ width: 0 }}
                  animate={{ width: '60%' }}
                  transition={{ 
                    duration: 0.8,
                    ease: "easeOut"
                  }}
                />
              )}
              
              {/* Challenge Description */}
              <motion.div
                className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg mb-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ 
                  opacity: showDescription ? 1 : 0,
                  y: showDescription ? 0 : 20,
                  boxShadow: showDescription ? '0 4px 12px rgba(0, 0, 0, 0.1)' : '0 0 0px rgba(0, 0, 0, 0)'
                }}
                transition={{ 
                  type: 'spring',
                  stiffness: 300,
                  damping: 25
                }}
              >
                <p className="text-gray-700 dark:text-gray-300 text-lg">
                  {challenge.description}
                </p>
              </motion.div>
              
              {/* Challenge Points */}
              {showDescription && (
                <motion.div
                  className="flex justify-center mt-6"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: [0.95, 1.03, 1] }}
                  transition={{ 
                    opacity: { duration: 0.5 },
                    scale: { duration: 0.7, times: [0, 0.6, 1] }
                  }}
                >
                  <motion.div 
                    className="bg-game-primary bg-opacity-20 px-6 py-2 rounded-full"
                    animate={{
                      boxShadow: ['0 0 0px rgba(255, 209, 102, 0.2)', '0 0 10px rgba(255, 209, 102, 0.4)', '0 0 0px rgba(255, 209, 102, 0.2)']
                    }}
                    transition={{
                      boxShadow: { repeat: Infinity, duration: 2.5 }
                    }}
                  >
                    <span className="text-game-primary font-bold text-xl">
                      {t('challenges.points', { points: challenge.points })}
                    </span>
                  </motion.div>
                </motion.div>
              )}
            </div>
          </motion.div>
          
          {/* Skip button in bottom right corner */}
          <motion.button
            className="absolute bottom-6 right-6 bg-transparent text-gray-400 hover:text-white border border-gray-500 px-3 py-1.5 text-sm rounded-full shadow-sm hover:bg-gray-800 transition-all"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 0.7, y: 0 }}
            whileHover={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            onClick={() => {
              // Skip the rest of the animation and call the completion callback
              if (onRevealComplete) {
                onRevealComplete();
              }
            }}
          >
            {t('common.skip')}
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ChallengeReveal;