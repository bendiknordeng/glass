import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
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
                <Toaster 
                  position="top-center"
                  toastOptions={{
                    duration: 3000,
                    className: "dark:bg-gray-800 dark:text-white dark:border-gray-700 bg-white text-gray-800 border border-gray-200 shadow-lg",
                    style: {
                      maxWidth: '500px',
                      padding: '12px 16px',
                    },
                    success: {
                      iconTheme: {
                        primary: '#10B981',
                        secondary: 'white',
                      },
                    },
                    error: {
                      iconTheme: {
                        primary: '#EF4444',
                        secondary: 'white',
                      },
                      style: {
                        borderLeft: '4px solid #EF4444',
                      },
                    },
                  }}
                />
              </BrowserRouter>
            </GameProvider>
          </LanguageProvider>
        </ThemeProvider>
      </Suspense>
    </React.StrictMode>
  );
};

init();