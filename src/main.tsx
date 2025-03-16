// Remove dotenv import attempt
// try {
//   // This is used by spotify-preview-finder
//   // Use dynamic import instead of require for Vite compatibility
//   import('dotenv').then(dotenv => {
//     dotenv.config();
//     console.log('dotenv loaded successfully');
//   });
// } catch (error) {
//   console.log('dotenv not available, environment variables will be loaded through Vite only');
// }

import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { i18nInstance } from './i18n';
import './index.css';
import App from './App';
import { GameProvider } from './contexts/GameContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';

// Wait for translations to be loaded before rendering
const init = async () => {
  await i18nInstance;
  
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <Suspense fallback="Loading...">
        <ThemeProvider>
          <LanguageProvider>
            <GameProvider>
              <BrowserRouter>
                <App />
              </BrowserRouter>
            </GameProvider>
          </LanguageProvider>
        </ThemeProvider>
      </Suspense>
    </React.StrictMode>
  );
};

init();