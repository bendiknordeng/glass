import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GB, NO } from 'country-flag-icons/react/3x2';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGame } from '@/contexts/GameContext';
import { useAuth } from '@/contexts/AuthContext';
import Switch from './Switch';
import Dropdown from './Dropdown';
import Button from './Button';
import { ConfirmModal } from './Modal';
import { HomeIcon } from '@heroicons/react/24/solid';
import { UserCircleIcon, ArrowRightOnRectangleIcon, UserIcon, CogIcon } from '@heroicons/react/24/outline';

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
  const { user, isAuthenticated, signOut } = useAuth();
  const [showEndGameModal, setShowEndGameModal] = useState(false);

  // Toggle theme
  const toggleTheme = () => {
    setTheme(isDarkMode ? 'light' : 'dark');
  };

  // Handle logout
  const handleLogout = () => {
    try {
      console.log("Header: Executing sign out");
      
      // Show feedback to the user
      const userButton = document.querySelector('[aria-label="User menu"]');
      if (userButton instanceof HTMLElement) {
        userButton.classList.add('opacity-50');
      }
      
      // Navigate to the logout page directly
      // This provides immediate feedback and the Logout component will handle the rest
      navigate('/logout');
    } catch (error) {
      console.error('Header: Logout error:', error);
    }
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
        
        <div className="flex gap-7 items-center">
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

{isAuthenticated ? (
            <Dropdown
              trigger={
                <button
                  className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-game-primary text-white hover:bg-opacity-90 transition-colors"
                  aria-label="User menu"
                >
                  {user?.user_metadata?.avatar_url ? (
                    <img src={user.user_metadata.avatar_url} alt="User avatar" className="w-8 h-8 rounded-full" />
                  ) : (
                    <h1 className="text-lg font-bold">{user?.user_metadata?.full_name?.split(' ')[0].charAt(0).toUpperCase()}{user?.user_metadata?.full_name?.split(' ')[1].charAt(0).toUpperCase()}</h1>
                  )}
                </button>
              }
              items={[
                {
                  label: (
                    <span className="flex items-center gap-2">
                      <UserIcon className="w-4 h-4" />
                      <span>Profile</span>
                    </span>
                  ),
                  value: 'profile',
                  onClick: () => navigate('/profile')
                },
                {
                  label: (
                    <span className="flex items-center gap-2">
                      <ArrowRightOnRectangleIcon className="w-4 h-4" />
                      <span>Sign Out</span>
                    </span>
                  ),
                  value: 'signout',
                  onClick: handleLogout
                }
              ]}
              ariaLabel="User menu"
            />
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/login')}
            >
              Login
            </Button>
          )}
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
