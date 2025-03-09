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