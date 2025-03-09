import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { formatTime } from '@/utils/helpers';

interface TimerProps {
  initialSeconds: number;
  onTimeUp?: () => void;
  isPaused?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showWarning?: boolean;
  warningThreshold?: number; // seconds
}

const Timer: React.FC<TimerProps> = ({
  initialSeconds,
  onTimeUp,
  isPaused = false,
  size = 'md',
  showWarning = true,
  warningThreshold = 60 // 1 minute warning by default
}) => {
  const { t } = useTranslation();
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isWarning, setIsWarning] = useState(false);
  const [isTimeUp, setIsTimeUp] = useState(false);
  
  useEffect(() => {
    setSeconds(initialSeconds);
    setIsTimeUp(false);
  }, [initialSeconds]);
  
  useEffect(() => {
    let interval: number | undefined;
    
    if (!isPaused && seconds > 0) {
      interval = window.setInterval(() => {
        setSeconds((prevSeconds) => {
          const newSeconds = prevSeconds - 1;
          
          // Check warning threshold
          if (showWarning && newSeconds <= warningThreshold && newSeconds > 0) {
            setIsWarning(true);
          }
          
          // Check time up
          if (newSeconds <= 0) {
            setIsTimeUp(true);
            if (onTimeUp) {
              onTimeUp();
            }
            return 0;
          }
          
          return newSeconds;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isPaused, seconds, onTimeUp, showWarning, warningThreshold]);
  
  // Size classes
  const sizeClasses = {
    sm: 'text-base py-1 px-2',
    md: 'text-lg py-2 px-3',
    lg: 'text-2xl py-2 px-4'
  };
  
  // Warning animation
  const warningAnimation = isWarning ? {
    scale: [1, 1.05, 1],
    transition: {
      repeat: Infinity,
      repeatType: "mirror" as const,
      duration: 0.5
    }
  } : {};
  
  // Time up animation
  const timeUpAnimation = isTimeUp ? {
    scale: [1, 1.2, 1],
    opacity: [1, 0.5, 1],
    transition: {
      repeat: 3,
      duration: 0.3
    }
  } : {};
  
  return (
    <motion.div
      className={`
        rounded-full font-bold ${sizeClasses[size]}
        ${isTimeUp ? 'bg-red-500 text-white' : 
          isWarning ? 'bg-amber-400 text-gray-800' : 'bg-game-primary text-white'}
      `}
      animate={isTimeUp ? timeUpAnimation : isWarning ? warningAnimation : {}}
    >
      {formatTime(seconds)}
    </motion.div>
  );
};

export default Timer;