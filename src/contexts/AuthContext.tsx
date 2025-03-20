import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session, User, AuthChangeEvent, Provider } from '@supabase/supabase-js';
import supabase from '@/lib/supabase';
import DataService from '@/services/data';
import AuthService from '@/services/auth';
import axios from 'axios';
import { useValidatedAuth, getAnonymousUserId } from '@/utils/auth-helpers';

// Global flag to prevent multiple simultaneous sign out attempts
let isSigningOut = false;

// Interface for Spotify auth data
export interface SpotifyAuth {
  isConnected: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
}

// Define return types to match the AuthService
interface AuthResult {
  success: boolean;
  error?: unknown;
  data?: any;
}

// Interface for Auth context
interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  session: Session | null;
  spotifyAuth: SpotifyAuth;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  signOut: (redirectTo?: string) => Promise<void>;
  saveSpotifyCredentials: (accessToken: string, refreshToken: string, expiresIn: number) => Promise<void>;
  signInWithGoogle: () => Promise<AuthResult>;
  signInWithFacebook: () => Promise<AuthResult>;
  signInWithEmail: (email: string, password: string) => Promise<AuthResult>;
  signUpWithEmail: (email: string, password: string) => Promise<AuthResult>;
  refreshSpotifyAuth: () => Promise<void>;
}

// Default provider value
const defaultSpotifyAuth: SpotifyAuth = {
  isConnected: false,
};

// Create context
const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  session: null,
  spotifyAuth: defaultSpotifyAuth,
  isLoading: false,
  signIn: async () => ({ success: false }),
  signUp: async () => ({ success: false }),
  signOut: async () => {},
  saveSpotifyCredentials: async () => {},
  signInWithGoogle: async () => ({ success: false }),
  signInWithFacebook: async () => ({ success: false }),
  signInWithEmail: async () => ({ success: false }),
  signUpWithEmail: async () => ({ success: false }),
  refreshSpotifyAuth: async () => {},
});

// Provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [spotifyAuth, setSpotifyAuth] = useState<SpotifyAuth>(defaultSpotifyAuth);

  // Custom setter for isLoading that logs state changes
  const setLoadingWithLogging = (loading: boolean) => {
    setIsLoading(loading);
  }

  // Load Spotify auth data from Supabase
  const loadSpotifyAuth = async (userId: string) => {
    try {
      // Ensure user ID is in UUID format
      if (!userId || userId.trim() === '') {
        console.warn('Invalid user ID provided to loadSpotifyAuth');
        setSpotifyAuth(defaultSpotifyAuth);
        return;
      }
      
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        console.warn(`User ID "${userId}" is not in valid UUID format for Supabase`);
        setSpotifyAuth(defaultSpotifyAuth);
        return;
      }

      const result = await DataService.getSpotifyAuth(userId);
      
      if (result.success && result.data) {
        const { access_token, refresh_token, expires_at } = result.data;
        
        setSpotifyAuth({
          isConnected: true,
          accessToken: access_token,
          refreshToken: refresh_token,
          expiresAt: expires_at * 1000, // Convert from Unix timestamp
        });
      } else {
        // This is expected for users who haven't connected Spotify
        setSpotifyAuth(defaultSpotifyAuth);
      }
    } catch (error) {
      console.error('Error loading Spotify auth:', error);
      // Reset Spotify auth on error
      setSpotifyAuth(defaultSpotifyAuth);
    }
  };

  // Save Spotify credentials to Supabase
  const saveSpotifyCredentials = async (accessToken: string, refreshToken: string, expiresIn: number) => {
    if (!user) {
      throw new Error('User is not authenticated');
    }
    
    try {
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(user.id)) {
        console.error(`Cannot save Spotify auth: User ID "${user.id}" is not in valid UUID format`);
        throw new Error('Invalid user ID format for database operation');
      }
      
      // Calculate expiration timestamp
      const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;
      
      // Save to Supabase
      const result = await DataService.saveSpotifyAuth(
        user.id,
        accessToken,
        refreshToken,
        expiresAt
      );
      
      if (result.success) {
        // Update local state
        setSpotifyAuth({
          isConnected: true,
          accessToken,
          refreshToken,
          expiresAt: expiresAt * 1000, // Convert to milliseconds for local state
        });
      } else {
        console.error('Failed to save Spotify credentials:', result.error);
        throw new Error(`Failed to save Spotify credentials: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving Spotify credentials:', error);
      throw error;
    }
  };

  // Initial session and auth states
  useEffect(() => {
    const getInitialSession = async () => {
      try {
        setLoadingWithLogging(true);
        
        // Get session from Supabase
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Error getting session:', sessionError);
          setLoadingWithLogging(false);
          return;
        }
        
        if (initialSession) {
          setSession(initialSession);
          setUser(initialSession.user);
          setIsAuthenticated(true);
          
          // Load Spotify auth data if authenticated
          try {
            await loadSpotifyAuth(initialSession.user.id);
          } catch (spotifyError) {
            console.warn('Error loading Spotify auth (this is normal if user has not connected Spotify):', spotifyError);
          }
        }
      } catch (error) {
        console.error('Error in auth initialization:', error);
      } finally {
        // Ensure loading state is turned off regardless of success or failure
        setLoadingWithLogging(false);
      }
    };
    
    getInitialSession();
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, newSession: Session | null) => {
      
      // Handle duplicate auth events - if we're already authenticated and it's a SIGNED_IN event, ignore it
      if (event === 'SIGNED_IN' && isAuthenticated && newSession) {
        return;
      }
      
      try {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setLoadingWithLogging(true); // Set loading true while we process signing in
          if (newSession) {
            setSession(newSession);
            setUser(newSession.user);
            setIsAuthenticated(true);
            
            // Load Spotify auth data when signed in
            try {
              await loadSpotifyAuth(newSession.user.id);
            } catch (spotifyError) {
              console.warn('Error loading Spotify auth on sign-in:', spotifyError);
            }
          }
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setIsAuthenticated(false);
          setSpotifyAuth(defaultSpotifyAuth);
        }
      } catch (error) {
        console.error('Error handling auth state change:', error);
      } finally {
        // Always ensure loading is set to false after auth state changes
        setLoadingWithLogging(false);
      }
    });
    
    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Refresh Spotify token if needed
  const refreshSpotifyAuth = async () => {
    if (!user || !spotifyAuth.isConnected || !spotifyAuth.refreshToken) {
      throw new Error('Cannot refresh Spotify token: missing required data');
    }

    try {
      const response = await axios.post(
        'https://accounts.spotify.com/api/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: spotifyAuth.refreshToken,
          client_id: import.meta.env.VITE_SPOTIFY_CLIENT_ID || '',
          client_secret: import.meta.env.VITE_SPOTIFY_CLIENT_SECRET || '',
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const { access_token, refresh_token, expires_in } = response.data;
      
      // Save the new tokens
      await saveSpotifyCredentials(
        access_token,
        refresh_token || spotifyAuth.refreshToken, // Use new refresh token if provided
        expires_in
      );
    } catch (error) {
      console.error('Error refreshing Spotify token:', error);
      // Reset Spotify auth state on error
      setSpotifyAuth(defaultSpotifyAuth);
      throw error;
    }
  };

  // Sign in with Google
  const signInWithGoogle = async (): Promise<AuthResult> => {
    setLoadingWithLogging(true);
    const result = await AuthService.signInWithOAuth('google');
    setLoadingWithLogging(false);
    return result;
  };

  // Sign in with Facebook
  const signInWithFacebook = async (): Promise<AuthResult> => {
    setLoadingWithLogging(true);
    const result = await AuthService.signInWithOAuth('facebook');
    setLoadingWithLogging(false);
    return result;
  };

  // Sign in with email and password
  const signInWithEmail = async (email: string, password: string): Promise<AuthResult> => {
    setLoadingWithLogging(true);
    const result = await AuthService.signInWithEmail(email, password);
    setLoadingWithLogging(false);
    return result;
  };

  // Sign up with email and password
  const signUpWithEmail = async (email: string, password: string): Promise<AuthResult> => {
    setLoadingWithLogging(true);
    const result = await AuthService.signUpWithEmail(email, password);
    setLoadingWithLogging(false);
    return result;
  };

  // Sign in with email and password
  const signIn = async (email: string, password: string): Promise<AuthResult> => {
    return signInWithEmail(email, password);
  };
  
  // Sign up with email and password
  const signUp = async (email: string, password: string): Promise<AuthResult> => {
    return signUpWithEmail(email, password);
  };
  
  // Sign out
  const signOut = async (redirectTo = '/') => {
    // Check if sign out is already in progress to prevent multiple calls
    if (isSigningOut) {
      return;
    }
    
    // Set the global flag to prevent multiple sign out attempts
    isSigningOut = true;
    
    // Create a safety timeout - if anything hangs, we'll redirect anyway
    const safetyTimeout = setTimeout(() => {
      setLoadingWithLogging(false);
      isSigningOut = false;
      window.location.replace(redirectTo);
    }, 200);
    
    try {
      setLoadingWithLogging(true);
      
      // Clear local state immediately to ensure UI updates
      setIsAuthenticated(false);
      setUser(null);
      setSession(null);
      setSpotifyAuth(defaultSpotifyAuth);
      
      // Call AuthService.signOut which will handle cleanup with its own timeout
      const result = await AuthService.signOut(redirectTo);
      
      // Clear the safety timeout since we completed successfully
      clearTimeout(safetyTimeout);
      
      // Make sure loading is turned off before redirecting
      setLoadingWithLogging(false);
      isSigningOut = false;
      
      // Small delay to ensure state updates are processed
      setTimeout(() => {
        // Redirect now that everything is properly cleaned up
        window.location.replace(redirectTo);
      }, 100);
      
    } catch (error) {
      console.error('Error signing out:', error);
      
      // Clear the safety timeout
      clearTimeout(safetyTimeout);
      
      // Make sure loading is turned off
      setLoadingWithLogging(false);
      isSigningOut = false;
      
      // Redirect anyway even if there was an error
      window.location.replace(redirectTo);
    }
  };
  
  // Context value
  const value: AuthContextType = {
    isAuthenticated,
    user,
    session,
    spotifyAuth,
    isLoading,
    signIn,
    signUp,
    signOut,
    saveSpotifyCredentials,
    signInWithGoogle,
    signInWithFacebook,
    signInWithEmail,
    signUpWithEmail,
    refreshSpotifyAuth,
  };
  
  return (
    <AuthContext.Provider value={value}>
      {isLoading && !isAuthenticated ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-game-primary"></div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

// Hook to use auth context
export const useAuth = () => useContext(AuthContext); 