import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Team } from '@/types/Team';
import { Player } from '@/types/Player';
import TeamCard from '@/components/common/TeamCard';
import confetti from 'canvas-confetti';

interface TeamRevealProps {
  team: Team;
  players: Player[];
  onRevealComplete?: () => void;
}

const TeamReveal: React.FC<TeamRevealProps> = ({
  team,
  players,
  onRevealComplete
}) => {
  const { t } = useTranslation();
  const [showReveal, setShowReveal] = useState(false);
  const [showText, setShowText] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  
  // Animation sequence
  useEffect(() => {    
    const timer1 = setTimeout(() => {
      // Start by showing the component
      setShowReveal(true);
    }, 500);
    
    const timer2 = setTimeout(() => {
      // Show the text announcement
      setShowText(true);
      
      // Trigger celebration effect
      confetti({
        particleCount: 80,
        spread: 100,
        origin: { y: 0.5, x: 0.5 }
      });
    }, 1500);
    
    const timer3 = setTimeout(() => {
      // Start fade out
      setIsComplete(true);
    }, 4500);

    const timer4 = setTimeout(() => {
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
    };
  }, [onRevealComplete]);
  
  return (
    <AnimatePresence>
      {showReveal && (
        <motion.div
          className="fixed inset-0 flex flex-col items-center justify-center bg-black bg-opacity-80 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Team Announcement Banner */}
          <motion.div
            className="absolute top-1/3 w-full max-w-2xl mx-auto"
            initial={{ opacity: 0, scale: 0.8, y: -50 }}
            animate={{ 
              opacity: showText ? (isComplete ? 0 : 1) : 0, 
              scale: showText ? 1 : 0.8,
              y: showText ? 0 : -50
            }}
            transition={{ 
              duration: 0.6, 
              type: 'spring', 
              stiffness: 400, 
              damping: 15 
            }}
          >
            <div className="text-center mb-8">
              <h2 className="text-5xl font-bold text-white mb-2">
                {t('game.teamTurnAnnouncement', { team: team.name })}
              </h2>
              
              {/* Animated underline */}
              <motion.div
                className="h-1 bg-gradient-to-r from-game-primary via-game-accent to-game-secondary mx-auto rounded-full"
                initial={{ width: 0 }}
                animate={{ width: '80%' }}
                transition={{ duration: 0.8, delay: 0.2 }}
              />
            </div>
          </motion.div>
          
          {/* Team Card with Animation */}
          <motion.div
            className="relative"
            initial={{ scale: 0, rotate: -10 }}
            animate={{ 
              scale: 1, 
              rotate: 0,
              opacity: isComplete ? 0 : 1
            }}
            transition={{ 
              type: 'spring',
              stiffness: 300,
              damping: 20,
              opacity: { duration: 0.4 }
            }}
          >
            <TeamCard 
              team={team} 
              players={players}
              size="lg"
              animation="highlight"
              showPlayers={true}
              className="min-w-80"
            />
            
            {/* Animated particles */}
            {showText && !isComplete && (
              <>
                {[...Array(10)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-4 h-4 rounded-full"
                    style={{
                      backgroundColor: [
                        '#FF6B6B', '#4ECDC4', '#FFD166', 
                        '#A6D0DD', '#FFB6C1', '#B5EAD7'
                      ][i % 6],
                      top: '50%',
                      left: '50%'
                    }}
                    initial={{ x: 0, y: 0 }}
                    animate={{
                      x: (Math.random() - 0.5) * 400,
                      y: (Math.random() - 0.5) * 400,
                      opacity: [1, 0.8, 0],
                      scale: [0, 1, 0.5]
                    }}
                    transition={{
                      duration: 2.5,
                      ease: 'easeOut',
                      delay: Math.random() * 0.3
                    }}
                  />
                ))}
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TeamReveal; 