import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from './contexts/ThemeContext';
import Home from './pages/Home';
import Setup from './pages/Setup';
import Game from './pages/Game';
import Results from './pages/Results';
import SpotifyCallback from './components/auth/SpotifyCallback';
import { loadTranslations } from './i18n';
import AppLayout from '@/components/layout/AppLayout';
import { GameProvider } from '@/contexts/GameContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';

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
    <ThemeProvider>
      <LanguageProvider>
        <GameProvider>
          <Routes>
            {/* Spotify callback route should not use AppLayout */}
            <Route path="/auth/spotify/callback" element={<SpotifyCallback />} />
            
            {/* Main app routes with AppLayout */}
            <Route path="/" element={<AppLayout><Home /></AppLayout>} />
            <Route path="/setup" element={<AppLayout><Setup /></AppLayout>} />
            <Route path="/game" element={<AppLayout><Game /></AppLayout>} />
            <Route path="/results" element={<AppLayout><Results /></AppLayout>} />
          </Routes>
        </GameProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default App;