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
import { HomeIcon, MoonIcon, SunIcon } from '@heroicons/react/24/solid';
import { UserCircleIcon, ArrowRightOnRectangleIcon, UserIcon, CogIcon } from '@heroicons/react/24/outline';

interface HeaderProps {
  showHomeButton?: boolean;
  isSidebar?: boolean;
  mobileDisplay?: boolean;
}

const Header: React.FC<HeaderProps> = ({ showHomeButton = false, isSidebar = false, mobileDisplay = false }) => {
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

  // For mobile display, only show a simplified user menu
  if (mobileDisplay) {
    return (
      <>
        {isAuthenticated ? (
          <Dropdown
            trigger={
              <button
                className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-game-primary to-purple-500 dark:from-game-primary-dark dark:to-purple-600 text-white hover:bg-opacity-90 transition-colors shadow-sm"
                aria-label="User menu"
              >
                {user?.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="User avatar" className="w-8 h-8 rounded-full" />
                ) : (
                  <h1 className="text-lg font-bold">
                    {user?.user_metadata?.full_name?.split(' ')[0].charAt(0).toUpperCase()}
                    {user?.user_metadata?.full_name?.split(' ')[1]?.charAt(0).toUpperCase() || ''}
                  </h1>
                )}
              </button>
            }
            items={[
              {
                label: (
                  <span className="flex items-center gap-2">
                    <UserIcon className="w-4 h-4" />
                    <span>{t('common.profile')}</span>
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
            className="dark:bg-game-primary-dark dark:hover:bg-opacity-90"
          >
            Login
          </Button>
        )}
      </>
    );
  }

  if (isSidebar) {
    return (
      <>
        <div className="flex flex-col h-full space-y-8">
          {/* App title/logo */}
          <div className="mt-4 mb-4 text-center">
            <div className="flex items-center justify-center mb-4">
              <img src={`/assets/images/${isDarkMode ? 'glass-light.png' : 'glass-dark.png'}`} alt="Logo" className="w-20 h-20" />
            </div>
            <h1 className="text-xl font-bold text-game-primary dark:text-game-primary-dark bg-gradient-to-r from-game-primary to-purple-500 dark:from-game-primary-dark dark:to-purple-400 bg-clip-text text-transparent">{t('app.name')}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('app.tagline')}</p>
          </div>

          {/* Navigation */}
          <div className="flex flex-col space-y-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/')}
              leftIcon={<HomeIcon className="w-4 h-4" />}
              className="justify-start w-full dark:bg-gray-800 dark:hover:bg-gray-700 dark:border-gray-700"
            >
              {t('common.home')}
            </Button>
            
            {isInActiveGame && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowEndGameModal(true)}
                className="justify-start w-full dark:bg-red-900 dark:hover:bg-red-800 dark:border-red-800"
              >
                {t('game.endGame')}
              </Button>
            )}
            
            {isAuthenticated && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/profile')}
                leftIcon={<UserIcon className="w-4 h-4" />}
                className="justify-start w-full dark:bg-gray-800 dark:hover:bg-gray-700 dark:border-gray-700"
              >
                {t('common.profile')}
              </Button>
            )}
          </div>
          
          {/* User section */}
          <div className="mt-4">
            {isAuthenticated ? (
              <div className="flex flex-col items-center space-y-3 p-4 rounded-lg bg-gray-100 dark:bg-gray-800/80 dark:backdrop-blur-sm dark:border dark:border-gray-700 shadow-sm dark:shadow-gray-950/20">
                {user?.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="User avatar" className="w-12 h-12 rounded-full ring-2 ring-white dark:ring-gray-700 shadow-md" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-game-primary to-purple-500 dark:from-game-primary-dark dark:to-purple-600 flex items-center justify-center text-white shadow-md">
                    <h1 className="text-lg font-bold">
                      {user?.user_metadata?.full_name?.split(' ')[0].charAt(0).toUpperCase()}
                      {user?.user_metadata?.full_name?.split(' ')[1]?.charAt(0).toUpperCase() || ''}
                    </h1>
                  </div>
                )}
                <div className="text-center">
                  <p className="font-medium dark:text-white">{user?.user_metadata?.full_name || user?.email}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleLogout}
                  leftIcon={<ArrowRightOnRectangleIcon className="w-4 h-4" />}
                  className="w-full mt-2 dark:bg-gray-700 dark:hover:bg-gray-600 dark:border-gray-600"
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/login')}
                className="w-full dark:bg-game-primary-dark dark:hover:bg-opacity-90"
              >
                Login
              </Button>
            )}
          </div>
          
          {/* Settings section */}
          <div className="mt-auto space-y-4 pb-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-100 dark:bg-gray-800/80 dark:backdrop-blur-sm dark:border dark:border-gray-700">
              <span className="text-sm dark:text-gray-300">{t('settings.toggleTheme')}</span>
              <div className="flex items-center">
                <Switch
                  checked={isDarkMode}
                  onChange={toggleTheme}
                  ariaLabel={t('settings.toggleTheme')}
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-100 dark:bg-gray-800/80 dark:backdrop-blur-sm dark:border dark:border-gray-700">
              <span className="text-sm dark:text-gray-300">{t('settings.toggleLanguage')}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setLanguage('en')}
                  className={`flex items-center justify-center w-8 h-8 rounded-full ${language === 'en' ? 'ring-2 ring-game-primary dark:ring-game-primary-dark shadow-md' : ''} hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors`}
                >
                  <GB className="w-6 h-6 rounded-sm" />
                </button>
                <button
                  onClick={() => setLanguage('no')}
                  className={`flex items-center justify-center w-8 h-8 rounded-full ${language === 'no' ? 'ring-2 ring-game-primary dark:ring-game-primary-dark shadow-md' : ''} hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors`}
                >
                  <NO className="w-6 h-6 rounded-sm" />
                </button>
              </div>
            </div>
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
  }

  // Original header for non-sidebar use - now only used internally in desktop view
  return (
    <>
      <div className="flex items-center justify-end">
        {isInActiveGame && (
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowEndGameModal(true)}
            className="mr-4 dark:bg-red-900 dark:hover:bg-red-800 dark:border-red-800"
          >
            {t('game.endGame')}
          </Button>
        )}
        
        {showHomeButton && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/')}
            leftIcon={
              <HomeIcon className="w-4 h-4" />
            }
            className="mr-4 dark:bg-gray-800 dark:hover:bg-gray-700 dark:border-gray-700"
          >
            {t('common.home')}
          </Button>
        )}
        
        <div className="flex gap-4 items-center">
          <Dropdown
            trigger={
              <button
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 shadow-sm text-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
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
                  className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-game-primary to-purple-500 dark:from-game-primary-dark dark:to-purple-600 text-white hover:bg-opacity-90 transition-colors shadow-sm"
                  aria-label="User menu"
                >
                  {user?.user_metadata?.avatar_url ? (
                    <img src={user.user_metadata.avatar_url} alt="User avatar" className="w-8 h-8 rounded-full" />
                  ) : (
                    <h1 className="text-lg font-bold">
                      {user?.user_metadata?.full_name?.split(' ')[0].charAt(0).toUpperCase()}
                      {user?.user_metadata?.full_name?.split(' ')[1]?.charAt(0).toUpperCase() || ''}
                    </h1>
                  )}
                </button>
              }
              items={[
                {
                  label: (
                    <span className="flex items-center gap-2">
                      <UserIcon className="w-4 h-4" />
                      <span>{t('common.profile')}</span>
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
              className="dark:bg-game-primary-dark dark:hover:bg-opacity-90"
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
