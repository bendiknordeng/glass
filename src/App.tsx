import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from './contexts/ThemeContext';
import Home from './pages/Home';
import Setup from './pages/Setup';
import Game from './pages/Game';
import Results from './pages/Results';
import { loadTranslations } from './i18n';

// Import default CSS
import './index.css';

// Preload web fonts
const preloadFonts = () => {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap';
  document.head.appendChild(link);
};

const App: React.FC = () => {
  const { isDarkMode } = useTheme();
  const { i18n } = useTranslation();
  
  // Preload fonts on mount
  useEffect(() => {
    preloadFonts();
  }, []);
  
  // Initialize translations on mount
  useEffect(() => {
    const initTranslations = async () => {
      const language = localStorage.getItem('i18nextLng') || 'en';
      await loadTranslations(language);
    };
    
    initTranslations();
  }, []);
  
  return (
    <div className={`min-h-screen font-game bg-gray-50 text-gray-900 ${isDarkMode ? 'dark' : ''}`}>
      <div className="dark:bg-gray-900 dark:text-white min-h-screen">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/setup" element={<Setup />} />
          <Route path="/game" element={<Game />} />
          <Route path="/results" element={<Results />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
};

export default App;