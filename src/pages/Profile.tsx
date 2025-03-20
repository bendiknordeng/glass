import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Player, DBChallenge, Game } from '@/types/supabase';
import spotifyService from '@/services/SpotifyService';
import LoadingState from '@/components/common/LoadingState';
import { SupabaseClient } from '@supabase/supabase-js';
import { playersService, challengesService, gamesService } from '@/services/supabase';
import { useTranslation } from 'react-i18next';
interface ServiceResult {
  success: boolean;
  error?: any;
  data?: any;
}

const Profile: React.FC = () => {
  const { user, spotifyAuth, signOut, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  // Check if user is connected to Facebook or Google using identities
  const isConnectedToFacebook = user?.identities?.some(
    (identity) => identity.provider === 'facebook'
  );
  
  const isConnectedToGoogle = user?.identities?.some(
    (identity) => identity.provider === 'google'
  );
  
  // Loading states for different data types
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(true);
  const [isLoadingChallenges, setIsLoadingChallenges] = useState(true);
  const [isLoadingGames, setIsLoadingGames] = useState(true);
  
  // Error states
  const [playersError, setPlayersError] = useState<string | null>(null);
  const [challengesError, setChallengesError] = useState<string | null>(null);
  const [gamesError, setGamesError] = useState<string | null>(null);
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [challenges, setChallenges] = useState<DBChallenge[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [activeTab, setActiveTab] = useState<'players' | 'challenges' | 'games'>('games');
  
  useEffect(() => {
    // If not authenticated, redirect to login
    if (!isAuthenticated) {
      navigate('/login?redirect=/profile');
      return;
    }
    
    const loadUserData = async () => {
      if (user) {
        // Reset loading and error states
        setIsLoadingPlayers(true);
        setIsLoadingChallenges(true);
        setIsLoadingGames(true);
        setPlayersError(null);
        setChallengesError(null);
        setGamesError(null);
        
        // Set timeouts to prevent indefinite loading
        const playersTimeout = setTimeout(() => {
          setIsLoadingPlayers(false);
          setPlayersError('Timed out while loading players');
        }, 5000);
        
        const challengesTimeout = setTimeout(() => {
          setIsLoadingChallenges(false);
          setChallengesError('Timed out while loading challenges');
        }, 5000);
        
        const gamesTimeout = setTimeout(() => {
          setIsLoadingGames(false);
          setGamesError('Timed out while loading games');
        }, 5000);
        
        try {
          // Load recent players
          const playersResult = await playersService.getPlayers(user.id);
          clearTimeout(playersTimeout);
          
          if (playersResult) {
            setPlayers(playersResult);
          }
        } catch (error) {
          clearTimeout(playersTimeout);
          setIsLoadingPlayers(false);
          setPlayersError(t('error.loadingPlayers'));
          console.error('Error loading players:', error);
        }
        
        try {
          // Load recent challenges
          const challengesResult = await challengesService.getChallenges(user.id);
          clearTimeout(challengesTimeout);
          
          if (challengesResult) {
            setChallenges(challengesResult);
          }
          setIsLoadingChallenges(false);
        } catch (error) {
          clearTimeout(challengesTimeout);
          setIsLoadingChallenges(false);
          setChallengesError(t('error.loadingChallenges'));
          console.error('Error loading challenges:', error);
        }
        
        try {
          // Load recent games
          const gamesResult = await gamesService.getGames(user.id);
          clearTimeout(gamesTimeout);
          
          if (gamesResult) {
            setGames(gamesResult);
          }
          setIsLoadingGames(false);
        } catch (error) {
          clearTimeout(gamesTimeout);
          setIsLoadingGames(false);
          setGamesError(t('error.loadingGames'));
          console.error('Error loading games:', error);
        }
      }
    };
    
    loadUserData();
  }, [user, isAuthenticated, navigate]);
  
  const handleSignOut = () => {
    try {
      // Navigate to the logout page which will handle the sign out process
      navigate('/logout');
    } catch (error) {
      console.error('Profile: Logout error:', error);
    }
  };
  
  const connectSpotify = () => {
    // Clear any existing Spotify auth state to avoid conflicts
    localStorage.removeItem('spotify_redirect_attempts');
    localStorage.removeItem('spotify_code_verifier');
    localStorage.removeItem('spotify_auth_state'); // Make sure to clear existing state
    
    // Get login URL from Spotify service and redirect
    const loginUrl = spotifyService.getLoginUrl();
    window.location.href = loginUrl;
  };
  
  const connectFacebook = () => {
    navigate('/login?provider=facebook&redirect=/profile');
  };
  
  const connectGoogle = () => {
    navigate('/login?provider=google&redirect=/profile');
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  if (!isAuthenticated) {
    return null; // Will redirect in the useEffect
  }
  
  return (
    <div className="container max-w-4xl px-4 py-8 mx-auto">
      {/* Profile Header */}
      <div className="overflow-hidden bg-white rounded-lg shadow dark:bg-gray-800">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex items-center space-x-4">
              {user?.user_metadata?.avatar_url ? (
                <img src={user?.user_metadata?.avatar_url} alt="Avatar" className="w-16 h-16 rounded-full" />
              ) : (
                <div className="flex items-center justify-center w-16 h-16 text-2xl font-bold text-white rounded-full bg-game-primary">
                  {user?.user_metadata?.full_name?.split(' ')[0].charAt(0).toUpperCase() || '?'}{user?.user_metadata?.full_name?.split(' ')[1].charAt(0).toUpperCase() || '?'}
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {user?.user_metadata?.full_name}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {user?.email}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
            <div className="mt-4 md:mt-0">
              <button
                onClick={handleSignOut}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-white rounded-md bg-game-primary hover:bg-opacity-90"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Connected Accounts Section */}
      <div className="mt-6 overflow-hidden bg-white rounded-lg shadow dark:bg-gray-800">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Connected Accounts</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Spotify Connection */}
            <div className="flex flex-col p-4 border rounded-lg dark:border-gray-700">
              <div className="flex items-center mb-3">
                <svg className="w-6 h-6 mr-2 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
                <span className="text-lg font-medium text-gray-900 dark:text-white">Spotify</span>
              </div>
              <div className="mt-auto">
                {spotifyAuth.isConnected ? (
                  <span className="inline-flex items-center px-3 py-1 text-sm text-green-700 bg-green-100 rounded-full dark:bg-green-900 dark:text-green-300">
                    <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Connected
                  </span>
                ) : (
                  <button
                    onClick={connectSpotify}
                    className="inline-flex items-center px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 rounded-md dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    Connect
                  </button>
                )}
              </div>
            </div>
            
            {/* Facebook Connection */}
            <div className="flex flex-col p-4 border rounded-lg dark:border-gray-700">
              <div className="flex items-center mb-3">
                <svg className="w-6 h-6 mr-2 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span className="text-lg font-medium text-gray-900 dark:text-white">Facebook</span>
              </div>
              <div className="mt-auto">
                {isConnectedToFacebook ? (
                  <span className="inline-flex items-center px-3 py-1 text-sm text-blue-700 bg-blue-100 rounded-full dark:bg-blue-900 dark:text-blue-300">
                    <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Connected
                  </span>
                ) : (
                  <button
                    onClick={connectFacebook}
                    className="inline-flex items-center px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 rounded-md dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    Connect
                  </button>
                )}
              </div>
            </div>
            
            {/* Google Connection */}
            <div className="flex flex-col p-4 border rounded-lg dark:border-gray-700">
              <div className="flex items-center mb-3">
                <svg className="w-6 h-6 mr-2 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
                </svg>
                <span className="text-lg font-medium text-gray-900 dark:text-white">Google</span>
              </div>
              <div className="mt-auto">
                {isConnectedToGoogle ? (
                  <span className="inline-flex items-center px-3 py-1 text-sm text-red-700 bg-red-100 rounded-full dark:bg-red-900 dark:text-red-300">
                    <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Connected
                  </span>
                ) : (
                  <button
                    onClick={connectGoogle}
                    className="inline-flex items-center px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 rounded-md dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    Connect
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex overflow-x-auto mt-6 mb-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('games')}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'games'
              ? 'text-game-primary border-b-2 border-game-primary'
              : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          Recent Games
        </button>
        <button
          onClick={() => setActiveTab('players')}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'players'
              ? 'text-game-primary border-b-2 border-game-primary'
              : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          Recent Players
        </button>
        <button
          onClick={() => setActiveTab('challenges')}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'challenges'
              ? 'text-game-primary border-b-2 border-game-primary'
              : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          Recent Challenges
        </button>
      </div>
      
      {/* Content */}
      <div className="bg-white rounded-lg shadow dark:bg-gray-800">
        <div className="p-4">
          {/* Recent Games */}
          {activeTab === 'games' && (
            <div>
              <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Recent Games</h2>
              
              <LoadingState
                isLoading={isLoadingGames}
                hasData={games.length > 0}
                error={gamesError}
                loadingMessage="Loading your recent games..."
                emptyMessage="No recent games found."
                emptySubMessage="Start a new game to see it here."
              />
              
              {!isLoadingGames && !gamesError && games.length > 0 && (
                <div className="overflow-hidden bg-white shadow sm:rounded-md dark:bg-gray-800">
                  <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {games.map((game) => (
                      <li key={game.id}>
                        <div className="flex items-center px-4 py-4 sm:px-6">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate dark:text-white">
                              {game.game_mode}
                            </p>
                            <div className="flex mt-1 text-xs text-gray-500 dark:text-gray-400">
                              <p>Score: {typeof game.scores === 'object' ? 
                                Object.values(game.scores).join(' - ') : 
                                JSON.stringify(game.scores)}
                              </p>
                              <span className="mx-1">•</span>
                              <p>Duration: {game.completed_at && game.started_at ? 
                                Math.floor((new Date(game.completed_at).getTime() - new Date(game.started_at).getTime()) / 60000) + 'm ' + 
                                Math.floor(((new Date(game.completed_at).getTime() - new Date(game.started_at).getTime()) % 60000) / 1000) + 's' : 
                                'In progress'}
                              </p>
                              <span className="mx-1">•</span>
                              <p>Players: {typeof game.players === 'object' ? 
                                (Array.isArray(game.players) ? 
                                  game.players.join(', ') : 
                                  Object.values(game.players)
                                    .map(player => typeof player === 'object' && player.name ? player.name : String(player))
                                    .join(', ')) : 
                                JSON.stringify(game.players)}
                              </p>
                            </div>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              {formatDate(game.started_at)}
                            </p>
                          </div>
                          {game.winner_id && (
                            <div className="px-2 py-1 ml-2 text-xs font-medium text-green-700 bg-green-100 rounded-full dark:bg-green-900 dark:text-green-300">
                              Winner: {typeof game.players === 'object' && 
                                Object.entries(game.players).find(([id, _]) => id === game.winner_id)?.[1]?.name || 
                                game.winner_id}
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          
          {/* Recent Players */}
          {activeTab === 'players' && (
            <div>
              <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Recent Players</h2>
              
              <LoadingState
                isLoading={isLoadingPlayers}
                hasData={players.length > 0}
                error={playersError}
                loadingMessage="Loading your recent players..."
                emptyMessage="No recent players found."
                emptySubMessage="Add players to your games to see them here."
              />
              
              {!isLoadingPlayers && !playersError && players.length > 0 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {players.map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center p-4 bg-white rounded-lg shadow dark:bg-gray-700"
                    >
                      <div className="flex items-center justify-center w-10 h-10 mr-4 text-white rounded-full bg-pastel-blue">
                        {player.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {player.name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Score: {player.score}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Recent Challenges */}
          {activeTab === 'challenges' && (
            <div>
              <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Recent Challenges</h2>
              
              <LoadingState
                isLoading={isLoadingChallenges}
                hasData={challenges.length > 0}
                error={challengesError}
                loadingMessage="Loading your recent challenges..."
                emptyMessage="No recent challenges found."
                emptySubMessage="Create challenges to see them here."
              />
              
              {!isLoadingChallenges && !challengesError && challenges.length > 0 && (
                <div className="grid grid-cols-1 gap-4">
                  {challenges.map((challenge) => (
                    <div
                      key={challenge.id}
                      className="p-4 bg-white rounded-lg shadow dark:bg-gray-700"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                          {challenge.title}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          challenge.type === 'INDIVIDUAL'  
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                            : challenge.type === 'ONE_ON_ONE'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                              : challenge.type === 'TEAM'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                                : challenge.type === 'ALL_VS_ALL'
                                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                        }`}>
                          {challenge.type.charAt(0).toUpperCase() + challenge.type.slice(1)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(challenge.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile; 