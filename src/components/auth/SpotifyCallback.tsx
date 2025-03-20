import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import spotifyService from '@/services/SpotifyService';
import { useValidatedAuth } from '@/utils/auth-helpers';
import DataService from '@/services/data';

/**
 * Component that handles Spotify OAuth callback
 */
const SpotifyCallback: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, getValidUserId } = useValidatedAuth();
  
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check if Spotify credentials are configured
        if (!spotifyService.hasCredentials()) {
          setStatus('error');
          setErrorMessage('Spotify API credentials are not configured properly');
          return;
        }
        
        // Get the code and state from URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');
        
        
        // Check if there's an error from Spotify
        if (error) {
          setStatus('error');
          setErrorMessage(`Spotify authentication error: ${error}`);
          return;
        }
        
        // Check if code and state are present
        if (!code || !state) {
          setStatus('error');
          setErrorMessage('Missing required parameters');
          return;
        }
        
        // Exchange the code for tokens
        const success = await spotifyService.handleCallback(code, state);
        
        if (success) {
          // If the user is authenticated with Supabase, save the Spotify auth data to Supabase
          if (user) {
            // Get a valid UUID format for the user ID
            const validUserId = getValidUserId();
            if (!validUserId) {
              console.error('SpotifyCallback: Failed to get a valid user ID');
              setStatus('error');
              setErrorMessage('Authentication error: Invalid user ID format');
              return;
            }
            
            
            // Spotify auth state is already in localStorage, load it
            const authState = localStorage.getItem('spotifyAuthState');
            if (authState) {
              const parsedAuthState = JSON.parse(authState);
              
              try {
                // Save to Supabase with validated user ID
                await DataService.saveSpotifyAuth(
                  validUserId,
                  parsedAuthState.accessToken,
                  parsedAuthState.refreshToken,
                  Math.floor(parsedAuthState.expiresAt / 1000) // Convert to Unix timestamp
                );
              } catch (saveError) {
                console.error('SpotifyCallback: Error saving to Supabase:', saveError);
                // We continue anyway since the auth is already in localStorage
                // Just log the error but don't show it to the user
              }
            } else {
              console.error('SpotifyCallback: No Spotify auth state found in localStorage');
            }
          }
          
          setStatus('success');
          
          // Redirect back to the music quiz creation page after a short delay
          setTimeout(() => {
            navigate('/setup');
          }, 1500);
        } else {
          setStatus('error');
          setErrorMessage(t('auth.spotifyCallbackError'));
        }
      } catch (error) {
        console.error('SpotifyCallback: Error in handleCallback:', error);
        setStatus('error');
        setErrorMessage(error instanceof Error ? error.message : t('error.general'));
      }
    };
    
    handleCallback();
  }, [navigate, user, getValidUserId]);
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8">
        {status === 'processing' && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-game-primary mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
              {t('auth.spotifyConnecting')}
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              {t('auth.spotifyProcessing')}
            </p>
          </div>
        )}
        
        {status === 'success' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 text-green-500 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
              {t('auth.spotifyConnected')}
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              {t('auth.spotifyRedirecting')}
            </p>
          </div>
        )}
        
        {status === 'error' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900 text-red-500 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
              {t('auth.spotifyError')}
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {errorMessage}
            </p>
            <button
              onClick={() => navigate('/setup')}
              className="px-4 py-2 bg-game-primary text-white rounded-md hover:bg-game-primary-dark transition-colors"
            >
              {t('common.back')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpotifyCallback; 