import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useGame } from '@/contexts/GameContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Button from '@/components/common/Button';
import { ConfirmModal } from '@/components/common/Modal';

const Home: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state, dispatch } = useGame();
  const { theme, setTheme, isDarkMode } = useTheme();
  const { language, setLanguage } = useLanguage();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  // Check if there's a game in progress
  const hasGameInProgress = state.players.length > 0;
  
  // Handle start new game
  const handleNewGame = () => {
    if (hasGameInProgress) {
      setShowResetConfirm(true);
    } else {
      dispatch({ type: 'RESET_GAME' });
      navigate('/setup');
    }
  };
  
  // Handle continue game
  const handleContinueGame = () => {
    if (state.gameStarted && !state.gameFinished) {
      navigate('/game');
    } else {
      navigate('/setup');
    }
  };
  
  // Handle reset and start new game
  const handleResetAndStart = () => {
    dispatch({ type: 'RESET_GAME' });
    navigate('/setup');
  };
  
  // Toggle theme
  const toggleTheme = () => {
    setTheme(isDarkMode ? 'light' : 'dark');
  };
  
  // Toggle language
  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'no' : 'en');
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      {/* Language and Theme toggles */}
      <div className="absolute top-4 right-4 flex gap-3">
        <button
          onClick={toggleLanguage}
          className="p-2 rounded-full bg-white dark:bg-gray-800 shadow-md text-gray-700 dark:text-white"
          aria-label={t('settings.toggleLanguage')}
        >
          {language === 'en' ? '🇬🇧' : '🇳🇴'}
        </button>
        
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full bg-white dark:bg-gray-800 shadow-md text-gray-700 dark:text-white"
          aria-label={t('settings.toggleTheme')}
        >
          {isDarkMode ? '☀️' : '🌙'}
        </button>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.h1 
            className="text-5xl font-bold mb-2 text-game-primary"
            animate={{ 
              scale: [1, 1.05, 1],
            }}
            transition={{ 
              repeat: Infinity,
              repeatType: "reverse",
              duration: 4
            }}
          >
            {t('app.name')}
          </motion.h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            {t('app.tagline')}
          </p>
        </motion.div>
        
        <motion.div
          className="card-glass p-8 w-full max-w-md"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div className="space-y-4">
            <Button
              variant="primary"
              size="lg"
              isFullWidth
              onClick={handleNewGame}
              className="text-lg"
            >
              {t('home.newGame')}
            </Button>
            
            {hasGameInProgress && (
              <Button
                variant="secondary"
                size="lg"
                isFullWidth
                onClick={handleContinueGame}
                className="text-lg"
              >
                {t('home.continueGame')}
              </Button>
            )}
          </div>
        </motion.div>
        
        <motion.div
          className="mt-12 text-sm text-gray-500 dark:text-gray-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ delay: 1 }}
        >
          {t('app.creator')}
        </motion.div>
      </div>
      
      {/* Reset game confirmation */}
      <ConfirmModal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={handleResetAndStart}
        title={t('home.startNewGame')}
        message={t('home.startNewGameWarning')}
        confirmText={t('home.startNew')}
        cancelText={t('common.cancel')}
      />
    </div>
  );
};

export default Home;