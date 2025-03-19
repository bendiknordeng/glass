import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Setup from './pages/Setup';
import Game from './pages/Game';
import Results from './pages/Results';
import Login from './pages/Login';
import Profile from './pages/Profile';
import SpotifyCallback from './components/auth/SpotifyCallback';
import AuthCallback from './components/auth/AuthCallback';
import { loadTranslations } from './i18n';
import AppLayout from '@/components/layout/AppLayout';
import { GameProvider } from '@/contexts/GameContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthContext';
import Logout from './pages/Logout';

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
        <AuthProvider>
          <GameProvider>
            <Routes>
              {/* Auth routes - no AppLayout for these */}
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/auth/spotify/callback" element={<SpotifyCallback />} />
              <Route path="/login" element={<Login />} />
              <Route path="/logout" element={<Logout />} />
              
              {/* Main app routes with AppLayout */}
              <Route path="/" element={<AppLayout><Home /></AppLayout>} />
              <Route path="/setup" element={<AppLayout><Setup /></AppLayout>} />
              <Route path="/game" element={<AppLayout><Game /></AppLayout>} />
              <Route path="/results" element={<AppLayout><Results /></AppLayout>} />
              <Route path="/profile" element={<AppLayout><Profile /></AppLayout>} />
            </Routes>
          </GameProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default App;