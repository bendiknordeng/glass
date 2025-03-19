import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "@/components/common/Header";
import Button from "@/components/common/Button";
import { useTranslation } from "react-i18next";
import { useGame } from "@/contexts/GameContext";
import { useTheme } from "@/contexts/ThemeContext";
import { XMarkIcon, Bars3Icon } from "@heroicons/react/24/outline";

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const showHomeButton = location.pathname !== "/";
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { state, dispatch } = useGame();
  const { isDarkMode } = useTheme();
  
  // Close sidebar when navigating to a new page
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  // Check if we're in an active game
  const isInActiveGame = location.pathname === '/game' && state.players.length > 0 && !state.gameFinished;

  // Handle ending the game
  const handleEndGame = () => {
    dispatch({ type: "END_GAME" });
    navigate('/results');
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 dark:bg-black dark:bg-opacity-80 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Mobile Sidebar - only visible when toggled on small screens */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 shadow-lg dark:shadow-gray-950/50 border-r border-gray-100 dark:border-gray-800 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:hidden`}
      >
        <div className="px-4 py-4 h-full flex flex-col">
          <div className="flex justify-end">
            <button 
              onClick={toggleSidebar} 
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1">
            <Header showHomeButton={showHomeButton} isSidebar={true} />
          </div>
        </div>
      </div>
      
      {/* Desktop header - visible on md+ screens */}
      <header className="hidden md:block sticky top-0 z-10 bg-white dark:bg-gray-900 shadow-md dark:shadow-gray-950/30 border-b border-gray-100 dark:border-gray-800">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left side - Logo and name */}
            <div className="flex items-center space-x-3">
              <img src={`/assets/images/${isDarkMode ? 'glass-light.png' : 'glass-dark.png'}`} alt="Logo" className="w-8 h-8" />
              <h1 className="text-lg font-bold text-game-primary dark:text-game-primary-dark bg-gradient-to-r from-game-primary to-purple-500 dark:from-game-primary-dark dark:to-purple-400 bg-clip-text text-transparent">
                {t('app.name')}
              </h1>
            </div>
            
            {/* Right side - Controls */}
            <Header showHomeButton={showHomeButton} isSidebar={false} />
          </div>
        </div>
      </header>
      
      {/* Mobile header - only visible on small screens */}
      <header className="md:hidden sticky top-0 z-10 bg-white dark:bg-gray-900 shadow-sm dark:shadow-gray-950/30 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <button 
              onClick={toggleSidebar} 
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              aria-label="Toggle menu"
            >
              <Bars3Icon className="w-6 h-6" />
            </button>
            
            {/* App name */}
            <h1 className="text-lg font-bold text-game-primary dark:text-game-primary-dark bg-gradient-to-r from-game-primary to-purple-500 dark:from-game-primary-dark dark:to-purple-400 bg-clip-text text-transparent">
              {t('app.name')}
            </h1>
          </div>
          
          {/* User menu for mobile */}
          <div className="flex items-center">
            {isInActiveGame && (
              <Button
                variant="danger"
                size="sm"
                onClick={handleEndGame}
                className="mr-2 dark:bg-red-900 dark:hover:bg-red-800 dark:border-red-800"
              >
                {t('game.endGame')}
              </Button>
            )}
            <Header showHomeButton={false} isSidebar={false} mobileDisplay={true} />
          </div>
        </div>
      </header>
      
      {/* Main content with proper paddings */}
      <main className="flex-1 bg-white dark:bg-gray-950">
        <div className="container mx-auto px-4 py-6 h-full">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
