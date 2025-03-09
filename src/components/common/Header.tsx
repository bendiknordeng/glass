import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GB, NO } from 'country-flag-icons/react/3x2';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGame } from '@/contexts/GameContext';
import Switch from './Switch';
import Dropdown from './Dropdown';
import Button from './Button';
import { ConfirmModal } from './Modal';
import { HomeIcon } from '@heroicons/react/24/solid';

interface HeaderProps {
  showHomeButton?: boolean;
}

const Header: React.FC<HeaderProps> = ({ showHomeButton = false }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme, isDarkMode } = useTheme();
  const { language, setLanguage } = useLanguage();
  const { state, dispatch } = useGame();
  const [showEndGameModal, setShowEndGameModal] = useState(false);

  // Toggle theme
  const toggleTheme = () => {
    setTheme(isDarkMode ? 'light' : 'dark');
  };

  // Check if we're in an active game
  const isInActiveGame = location.pathname === '/game' && state.players.length > 0 && !state.gameFinished;

  return (
    <>
      <div className="flex justify-between items-center">
        <div className="flex gap-3 items-center">
          {showHomeButton && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/')}
              leftIcon={
                <HomeIcon className="w-4 h-4" />
              }
            >
              {t('common.home')}
            </Button>
          )}
          
          {isInActiveGame && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowEndGameModal(true)}
            >
              {t('game.endGame')}
            </Button>
          )}
        </div>
        
        <div className="flex gap-3 items-center">
          <Dropdown
            trigger={
              <button
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 shadow-md text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                aria-label={t('settings.toggleLanguage')}
              >
                {language === 'en' ? (
                  <GB className="w-5 h-5 rounded-sm" />
                ) : (
                  <NO className="w-5 h-5 rounded-sm" />
                )}
                <span className="text-sm font-medium">
                  {language === 'en' ? 'English' : 'Norsk'}
                </span>
              </button>
            }
            items={[
              {
                label: (
                  <span className="flex items-center gap-3">
                    <GB className="w-5 h-5 rounded-sm" />
                    <span>English</span>
                  </span>
                ),
                value: 'en',
                onClick: () => setLanguage('en')
              },
              {
                label: (
                  <span className="flex items-center gap-3">
                    <NO className="w-5 h-5 rounded-sm" />
                    <span>Norsk</span>
                  </span>
                ),
                value: 'no',
                onClick: () => setLanguage('no')
              }
            ]}
            ariaLabel={t('settings.toggleLanguage')}
          />
          
          <Switch
            checked={isDarkMode}
            onChange={toggleTheme}
            ariaLabel={t('settings.toggleTheme')}
          />
        </div>
      </div>

      <ConfirmModal
        isOpen={showEndGameModal}
        onClose={() => setShowEndGameModal(false)}
        onConfirm={() => {
          dispatch({ type: 'END_GAME' });
          navigate('/results');
        }}
        title={t('game.endGame')}
        message={t('game.confirmEndGame')}
        confirmText={t('game.endGame')}
        cancelText={t('common.cancel')}
        confirmVariant="danger"
      />
    </>
  );
};

export default Header;
