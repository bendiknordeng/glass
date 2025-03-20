import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import supabase from '@/services/supabase';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const AuthCallback: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debug, setDebug] = useState<string>('');
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const handleAuthRedirect = async () => {
      try {
        setIsLoading(true);
        
        // Add some diagnostic information
        const debugInfo = `URL: ${window.location.href}\nHash: ${location.hash}\nSearch: ${location.search}`;
        setDebug(debugInfo);
        
        // Check for errors explicitly
        const searchParams = new URLSearchParams(location.search);
        const errorParam = searchParams.get('error');
        
        if (errorParam) {
          const errorCode = searchParams.get('error_code');
          const errorDesc = searchParams.get('error_description');
          console.error('OAuth error details:', { error: errorParam, code: errorCode, description: errorDesc });
          setDebug(prev => `${prev}\nError detected: ${errorParam}\nDescription: ${errorDesc || 'None'}`);
          
          // Handle Google-specific errors
          if (errorDesc && errorDesc.includes('Unable to exchange external code')) {
            throw new Error('Google authentication failed. Please try again or use a different login method.');
          } else {
            throw new Error(`Authentication error: ${errorDesc || errorParam}`);
          }
        }
        
        // Process the OAuth callback - explicitly set refreshSession to true to force refresh
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting auth session:', error);
          setDebug(prev => `${prev}\nAuth session error: ${error.message}`);
          throw error;
        }
        
        // Add debug info about session
        const sessionInfo = data?.session 
          ? `User ID: ${data.session.user.id}, Email: ${data.session.user.email}`
          : 'No session found';
        setDebug(prev => `${prev}\nSession found: ${!!data?.session}\n${sessionInfo}`);
        
        if (data?.session) {
          // Set a slightly longer timeout to ensure state propagation
          setTimeout(() => {
            navigate('/');
          }, 1000);
        } else {
          console.error('No session found after authentication');
          setDebug(prev => `${prev}\nNo session found after authentication, will retry`);
          
          // Try refreshing the session explicitly - this can help when there are timing issues
          setTimeout(async () => {
            try {
              // Force refresh the auth session
              await supabase.auth.refreshSession();
              const retryResult = await supabase.auth.getSession();

              setDebug(prev => `${prev}\nRetry session result: ${!!retryResult.data.session}`);
              
              if (retryResult.data.session) {
                navigate('/');
              } else {
                setError('Could not establish a session. Please try again.');
                setIsLoading(false);
              }
            } catch (retryError) {
              console.error('Error during session retry:', retryError);
              setError('Failed to establish session. Please try logging in again.');
              setIsLoading(false);
            }
          }, 2000);
        }
      } catch (err) {
        console.error('Error in auth callback:', err);
        setError((err as Error).message || 'Authentication failed');
        setIsLoading(false);
      }
    };

    handleAuthRedirect();
  }, [location, navigate]);

  if (isAuthenticated && !isLoading) {
    return <Navigate to="/" />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-game-light dark:bg-game-dark">
      <div className="w-full max-w-md p-6 space-y-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
        {isLoading ? (
          <div className="flex flex-col items-center space-y-4">
            <LoadingSpinner size="lg" />
            <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
              Completing authentication...
            </p>
            
            {/* Show debug info in development */}
            {import.meta.env.DEV && debug && (
              <div className="mt-4 p-2 w-full bg-gray-100 dark:bg-gray-900 rounded text-xs font-mono overflow-x-auto">
                <pre>{debug}</pre>
              </div>
            )}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center space-y-4">
            <div className="p-4 rounded-full bg-pastel-pink bg-opacity-20">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-12 h-12 text-game-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-game-dark dark:text-game-light">
              Authentication Error
            </h2>
            <p className="text-center text-gray-600 dark:text-gray-400">{error}</p>
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 font-medium text-white rounded-lg bg-game-primary hover:bg-opacity-90"
            >
              Try Again
            </button>
            
            {/* Show debug info in development */}
            {import.meta.env.DEV && debug && (
              <div className="mt-4 p-2 w-full bg-gray-100 dark:bg-gray-900 rounded text-xs font-mono overflow-x-auto">
                <pre>{debug}</pre>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default AuthCallback; 