import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import spotifyService from '@/services/SpotifyService';
import { useValidatedAuth } from '@/utils/auth-helpers';
import DataService from '@/services/data';
import { supabase } from '@/services/supabase';

/**
 * Component that handles Spotify OAuth callback
 */
const SpotifyCallback: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useValidatedAuth();
  
  // Use refs to prevent duplicate execution
  const isProcessingRef = useRef(false);
  const hasRunRef = useRef(false);
  
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  useEffect(() => {
    // Prevent multiple executions of the callback handler
    if (hasRunRef.current) return;
    hasRunRef.current = true;
    
    // Get return path from localStorage instead of sessionStorage
    const returnToPath = localStorage.getItem('spotify_return_path') || '/setup';
    
    const handleCallback = async () => {
      if (isProcessingRef.current) return;
      isProcessingRef.current = true;
      
      try {
        console.log('SpotifyCallback: Starting to process callback');
        
        // Check if Spotify credentials are configured
        if (!spotifyService.hasCredentials()) {
          setStatus('error');
          setErrorMessage('Spotify API credentials are not configured properly');
          return;
        }
        
        // Get the code and state from URL
        const urlParams = new URLSearchParams(location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');
        
        console.log('SpotifyCallback: Received params', { 
          hasCode: !!code, 
          hasState: !!state, 
          error 
        });
        
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
        
        // Get current user from Supabase
        const { data: authData } = await supabase.auth.getUser();
        const currentUser = authData?.user;
        console.log('SpotifyCallback: Current user', currentUser?.id);
        
        // Exchange the code for tokens
        const success = await spotifyService.handleCallback(code, state);
        
        if (success) {
          console.log('SpotifyCallback: Successfully authenticated with Spotify');
          
          // Only try to save to Supabase if we have a logged in user
          if (currentUser && currentUser.id) {
            try {
              // Check if auth data already exists
              const { success: hasAuth } = await DataService.getSpotifyAuth(currentUser.id);
              
              // Only save if we don't already have auth data
              if (!hasAuth) {
                console.log('No Spotify auth in Supabase yet, saving it...');
                
                const authState = localStorage.getItem('spotifyAuthState');
                if (authState) {
                  const parsedAuthState = JSON.parse(authState);
                  
                  await DataService.saveSpotifyAuth(
                    currentUser.id,
                    parsedAuthState.accessToken,
                    parsedAuthState.refreshToken,
                    parsedAuthState.expiresAt
                  );
                  console.log('Successfully saved Spotify auth to Supabase');
                }
              } else {
                console.log('Spotify auth already exists in Supabase');
              }
            } catch (error) {
              console.error('Error saving to Supabase:', error);
              // Continue anyway since auth is in localStorage
            }
          }
          
          setStatus('success');
          
          // Redirect back to the original page after a short delay
          setTimeout(() => {
            // Clear the return path
            localStorage.removeItem('spotify_return_path');
            navigate(returnToPath);
          }, 1000);
        } else {
          setStatus('error');
          setErrorMessage(t('auth.spotifyCallbackError'));
        }
      } catch (error) {
        console.error('SpotifyCallback: Error in handleCallback:', error);
        setStatus('error');
        setErrorMessage(error instanceof Error ? error.message : t('error.general'));
      } finally {
        isProcessingRef.current = false;
      }
    };
    
    handleCallback();
    
    // Return cleanup function
    return () => {
      isProcessingRef.current = false;
    };
  }, [navigate, location.search, t]); // Simplified dependencies to reduce re-renders
  
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