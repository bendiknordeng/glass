import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Player, DBChallenge, Game } from '@/types/supabase';
import spotifyService from '@/services/SpotifyService';
import LoadingState from '@/components/common/LoadingState';
import { SupabaseClient } from '@supabase/supabase-js';
import { playersService, challengesService, gamesService } from '@/services/supabase';
import { useTranslation } from 'react-i18next';
import PlayerCard from '@/components/common/PlayerCard';
import { Player as AppPlayer } from '@/types/Player';
import PlayerEditForm from '@/components/forms/PlayerEditForm';
import { useGameActive } from '@/hooks/useGameActive';
import { supabase } from '@/services/supabase';

interface ServiceResult {
  success: boolean;
  error?: any;
  data?: any;
}

const Profile: React.FC = () => {
  const { user, spotifyAuth, signOut, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isGameActive = useGameActive();
  
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
  
  // State for player editing modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [playerToEdit, setPlayerToEdit] = useState<Player | null>(null);
  
  // Modal states
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [modalAction, setModalAction] = useState<'end' | 'delete' | null>(null);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  
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
          setGamesError(t('error.loadingGames'));
        }, 15000); // Increased from 5000 to 15000 (15 seconds)
        
        try {
          // Load recent players
          const playersResult = await playersService.getPlayers(user.id);
          clearTimeout(playersTimeout);
          
          if (playersResult) {
            setPlayers(playersResult);
          }
          setIsLoadingPlayers(false);
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
          // Load recent games with limited count for better performance
          const gamesResult = await gamesService.getGames(user.id);
          clearTimeout(gamesTimeout);
          
          if (gamesResult) {
            // Limit to 10 most recent games for better performance
            // Need to cast as Game[] to satisfy TypeScript
            setGames(gamesResult as Game[]);
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
  
  // Function to handle opening the edit modal
  const handleEditPlayer = (player: Player, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent any other click handlers
    
    // Prevent editing during active game
    if (isGameActive) {
      console.warn('Cannot edit players during an active game');
      return;
    }
    
    setPlayerToEdit(player);
    setIsEditModalOpen(true);
  };
  
  // Function to close the edit modal
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setPlayerToEdit(null);
  };
  
  // Function to save player edits
  const handleSavePlayerEdit = async (updatedPlayer: Player) => {
    try {
      // Update player in database
      await playersService.updatePlayer(updatedPlayer.id, {
        name: updatedPlayer.name,
        image: updatedPlayer.image
      });
      
      // Update player in state
      setPlayers(prevPlayers => 
        prevPlayers.map(p => p.id === updatedPlayer.id ? updatedPlayer : p)
      );
      
      // Close modal
      handleCloseEditModal();
    } catch (error) {
      console.error('Error updating player:', error);
      // You could add error handling/feedback here
    }
  };
  
  // Handle ending an active game
  const handleEndGame = async (gameId: string) => {
    try {
      setIsLoadingGames(true);
      // Call the complete game function with no winner
      const result = await gamesService.completeGame(gameId, null);
      if (result) {
        // Update the local state by marking the game as completed
        setGames(games.map(game => 
          game.id === gameId 
            ? { ...game, status: 'completed', completed_at: new Date().toISOString() } 
            : game
        ));
      }
    } catch (error) {
      console.error('Error ending game:', error);
      setGamesError('Failed to end game');
    } finally {
      setIsLoadingGames(false);
    }
  };

  // Handle deleting a game
  const handleDeleteGame = async (gameId: string) => {
    try {
      setIsLoadingGames(true);
      const result = await gamesService.deleteGame(gameId);
      if (result) {
        // Remove the game from the local state
        setGames(games.filter(game => game.id !== gameId));
      }
    } catch (error) {
      console.error('Error deleting game:', error);
      setGamesError('Failed to delete game');
    } finally {
      setIsLoadingGames(false);
    }
  };

  // Confirm modal for end/delete actions
  const openConfirmModal = (gameId: string, action: 'end' | 'delete') => {
    setSelectedGameId(gameId);
    setModalAction(action);
    setShowConfirmModal(true);
  };

  // Handle confirm action
  const handleConfirmAction = async () => {
    if (!selectedGameId || !modalAction) return;
    
    if (modalAction === 'end') {
      await handleEndGame(selectedGameId);
    } else if (modalAction === 'delete') {
      await handleDeleteGame(selectedGameId);
    }
    
    // Close the modal
    setShowConfirmModal(false);
    setSelectedGameId(null);
    setModalAction(null);
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
          {t('profile.games')}
        </button>
        <button
          onClick={() => setActiveTab('players')}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'players'
              ? 'text-game-primary border-b-2 border-game-primary'
              : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          {t('profile.players')}
        </button>
        <button
          onClick={() => setActiveTab('challenges')}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'challenges'
              ? 'text-game-primary border-b-2 border-game-primary'
              : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          {t('profile.challenges')}
        </button>
      </div>
      
      {/* Content */}
      <div className="bg-white rounded-lg shadow dark:bg-gray-800">
        <div className="p-4">
          {/* Recent Games */}
          {activeTab === 'games' && (
            <div>
              <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
                {t('profile.games')}
              </h2>
              
              <LoadingState
                isLoading={isLoadingGames}
                hasData={games.length > 0}
                error={gamesError}
                loadingMessage="Loading your recent games..."
                emptyMessage="No recent games found."
                emptySubMessage="Start a new game to see it here."
              />
              
              {!isLoadingGames && !gamesError && games.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {games.map((game) => {
                    // Format duration for display
                    const getDuration = () => {
                      if (game.completed_at && game.started_at) {
                        const duration = new Date(game.completed_at).getTime() - new Date(game.started_at).getTime();
                        const minutes = Math.floor(duration / 60000);
                        const seconds = Math.floor((duration % 60000) / 1000);
                        return `${minutes}m ${seconds}s`;
                      }
                      return 'In progress';
                    };
                    
                    // Get player names
                    const getPlayerNames = () => {
                      if (typeof game.players === 'object') {
                        if (Array.isArray(game.players)) {
                          return game.players.join(', ');
                        } else {
                          return Object.values(game.players)
                            .map(player => typeof player === 'object' && player.name ? player.name : String(player))
                            .join(', ');
                        }
                      }
                      return JSON.stringify(game.players);
                    };
                    
                    // Get formatted scores
                    const getScores = () => {
                      if (typeof game.scores === 'object') {
                        return Object.values(game.scores).join(' - ');
                      }
                      return JSON.stringify(game.scores);
                    };
                    
                    // Get winner name
                    const getWinnerName = () => {
                      if (game.winner_id && typeof game.players === 'object') {
                        const winner = Object.entries(game.players).find(([id, _]) => id === game.winner_id);
                        if (winner && winner[1] && typeof winner[1] === 'object' && winner[1].name) {
                          return winner[1].name;
                        }
                        return game.winner_id;
                      }
                      return null;
                    };
                    
                    // Check if game is a team game
                    const isTeamGame = () => {
                      return game.teams && typeof game.teams === 'object' && Object.keys(game.teams).length > 0;
                    };

                    // Get players grouped by teams
                    const getTeamPlayers = () => {
                      if (!isTeamGame() || !game.teams) return null;
                      
                      const teamPlayers: Record<string, { name: string, members: Array<{ id: string, name: string, score?: number }> }> = {};
                      
                      // Initialize teams
                      Object.entries(game.teams as Record<string, any>).forEach(([teamId, team]) => {
                        teamPlayers[teamId] = {
                          name: team.name || `Team ${teamId}`,
                          members: []
                        };
                      });
                      
                      // Assign players to teams
                      if (game.players && typeof game.players === 'object') {
                        Object.entries(game.players as Record<string, any>).forEach(([playerId, player]) => {
                          const playerData = typeof player === 'object' ? player : { name: String(player) };
                          // Get the player's team ID from the player data
                          const teamId = playerData.team_id || 
                                     (typeof player === 'object' && player.teamId ? player.teamId : null);
                          
                          // Find which team the player belongs to if not specified in player data
                          let assignedTeamId = teamId;
                          if (!assignedTeamId) {
                            // Check each team to see if this player is a member
                            Object.entries(game.teams as Record<string, any>).forEach(([tid, teamData]) => {
                              if (teamData.members && 
                                  Array.isArray(teamData.members) && 
                                  teamData.members.includes(playerId)) {
                                assignedTeamId = tid;
                              } else if (teamData.playerIds && 
                                         Array.isArray(teamData.playerIds) && 
                                         teamData.playerIds.includes(playerId)) {
                                assignedTeamId = tid;
                              }
                            });
                          }

                          // If still no team found, place in 'unassigned'
                          assignedTeamId = assignedTeamId || 'unassigned';
                          
                          // Create the 'unassigned' team if it doesn't exist
                          if (assignedTeamId === 'unassigned' && !teamPlayers['unassigned']) {
                            teamPlayers['unassigned'] = {
                              name: 'Unassigned Players',
                              members: []
                            };
                          }
                          
                          if (teamPlayers[assignedTeamId]) {
                            const playerScore = game.scores && game.scores[playerId] 
                              ? Number(game.scores[playerId]) 
                              : undefined;
                              
                            teamPlayers[assignedTeamId].members.push({
                              id: playerId,
                              name: playerData.name || `Player ${playerId}`,
                              score: playerScore
                            });
                          }
                        });
                      }
                      
                      return teamPlayers;
                    };
                    
                    // Format team scores with more detail
                    const getTeamScores = () => {
                      if (!isTeamGame() || !game.scores) return null;
                      
                      return Object.entries(game.scores).map(([teamId, score]) => {
                        // Get team name if available
                        let teamName = teamId;
                        let teamPlayerCount = 0;
                        
                        // Get team data
                        if (game.teams && typeof game.teams === 'object') {
                          const teamData = game.teams[teamId];
                          if (teamData) {
                            // Use team name if available
                            if (teamData.name) {
                              teamName = teamData.name;
                            }
                            
                            // Count team members
                            if (teamData.members && Array.isArray(teamData.members)) {
                              teamPlayerCount = teamData.members.length;
                            } else if (teamData.playerIds && Array.isArray(teamData.playerIds)) {
                              teamPlayerCount = teamData.playerIds.length;
                            }
                          }
                        }
                        
                        // Find players manually if they're not in the team's member lists
                        if (teamPlayerCount === 0) {
                          // Count players that have this team ID
                          if (game.players && typeof game.players === 'object') {
                            Object.values(game.players).forEach(player => {
                              if (typeof player === 'object' && 
                                  (player.team_id === teamId || player.teamId === teamId)) {
                                teamPlayerCount++;
                              }
                            });
                          }
                        }
                        
                        return {
                          id: teamId,
                          name: teamName,
                          score: score,
                          playerCount: teamPlayerCount
                        };
                      });
                    };
                    
                    // Get all players for free-for-all games
                    const getAllPlayers = () => {
                      if (!game.players || typeof game.players !== 'object') {
                        return [];
                      }
                      
                      return Object.entries(game.players as Record<string, any>).map(([playerId, player]) => {
                        const playerName = typeof player === 'object' && player.name 
                          ? player.name 
                          : (typeof player === 'string' ? player : `Player ${playerId}`);
                          
                        const playerScore = game.scores && game.scores[playerId] 
                          ? game.scores[playerId] 
                          : null;
                          
                        return {
                          id: playerId,
                          name: playerName,
                          score: playerScore,
                          isWinner: playerId === game.winner_id
                        };
                      }).sort((a, b) => {
                        // Sort by score (if available) or alphabetically
                        if (a.score !== null && b.score !== null) {
                          return Number(b.score) - Number(a.score); // Descending
                        }
                        return a.name.localeCompare(b.name);
                      });
                    };
                    
                    // Get team color based on index
                    const getTeamColor = (index: number) => {
                      const teamColors = [
                        'from-blue-600 to-blue-800',
                        'from-red-600 to-red-800',
                        'from-green-600 to-green-800',
                        'from-purple-600 to-purple-800',
                        'from-yellow-600 to-yellow-800',
                        'from-pink-600 to-pink-800',
                        'from-indigo-600 to-indigo-800',
                        'from-teal-600 to-teal-800'
                      ];
                      return teamColors[index % teamColors.length];
                    };
                    
                    // Get background style based on game mode
                    const getGameModeStyle = () => {
                      switch(game.game_mode.toLowerCase()) {
                        case 'music quiz':
                          return 'bg-gradient-to-r from-purple-500 to-indigo-600';
                        case 'trivia':
                          return 'bg-gradient-to-r from-blue-500 to-teal-400';
                        case 'challenge':
                          return 'bg-gradient-to-r from-orange-500 to-pink-500';
                        default:
                          return 'bg-gradient-to-r from-gray-700 to-gray-900';
                      }
                    };

                    // Get appropriate game mode icon
                    const getGameModeIcon = () => {
                      switch(game.game_mode.toLowerCase()) {
                        case 'music quiz':
                          return (
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                            </svg>
                          );
                        case 'trivia':
                          return (
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                            </svg>
                          );
                        default:
                          return (
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                          );
                      }
                    };
                    
                    return (
                      <div 
                        key={game.id} 
                        className={`rounded-lg shadow-lg overflow-hidden ${getGameModeStyle()} text-white transform transition-all duration-300 hover:scale-105 hover:shadow-xl`}
                      >
                        <div className="px-6 py-4">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center">
                              {getGameModeIcon()}
                              <h3 className="text-xl font-semibold">{game.game_mode.charAt(0).toUpperCase() + game.game_mode.slice(1)}</h3>
                              {isTeamGame() && (
                                <span className="ml-2 bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full flex items-center">
                                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                  </svg>
                                  {Object.keys(game.teams || {}).length} Team{Object.keys(game.teams || {}).length !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                            {game.status === 'active' ? (
                              <div className="flex items-center">
                                <span className="relative flex h-3 w-3 mr-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                </span>
                                <span className="bg-green-400 text-green-900 text-xs font-bold px-3 py-1 rounded-full">
                                  Active
                                </span>
                              </div>
                            ) : (
                              <span className="bg-gray-200 text-gray-800 text-xs font-bold px-3 py-1 rounded-full">
                                Completed
                              </span>
                            )}
                          </div>
                          <p className="text-sm opacity-90 mt-2">{formatDate(game.started_at)}</p>
                          <p className="text-sm opacity-80 mt-1">Duration: {getDuration()}</p>
                          
                          {/* Game action buttons */}
                          <div className="flex justify-end space-x-2 mt-2">
                            {game.status === 'active' && (
                              <button
                                onClick={() => openConfirmModal(game.id, 'end')}
                                className="bg-orange-500 hover:bg-orange-600 text-white text-xs py-1 px-2 rounded"
                              >
                                End Game
                              </button>
                            )}
                            <button
                              onClick={() => openConfirmModal(game.id, 'delete')}
                              className="bg-red-500 hover:bg-red-600 text-white text-xs py-1 px-2 rounded"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        
                        <div className="px-6 py-3 bg-black bg-opacity-20">
                          {isTeamGame() ? (
                            /* Team Game Score Layout */
                            <div>
                              <p className="text-gray-300 mb-2 font-medium">Team Scores</p>
                              <div className="space-y-2">
                                {getTeamScores()?.map((team, index) => (
                                  <div key={team.id} className={`flex justify-between items-center rounded px-3 py-2 bg-gradient-to-r ${getTeamColor(index)}`}>
                                    <div className="flex items-center">
                                      <span className="text-sm font-bold text-white">{team.name}</span>
                                      <span className="ml-1 text-xs text-gray-200">({team.playerCount} players)</span>
                                    </div>
                                    <span className={`text-sm font-bold px-3 py-1.5 rounded ${
                                      game.winner_id === team.id ? 'bg-yellow-500 text-yellow-900' : 'bg-white bg-opacity-20 text-white'
                                    }`}>
                                      Score: {team.score}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            /* Free-for-all Score Layout */
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-gray-300 mb-1">Total Players</p>
                                <p className="font-medium">{Object.keys(game.players || {}).length}</p>
                              </div>
                              <div>
                                <p className="text-gray-300 mb-1">Top Score</p>
                                <p className="font-medium">
                                  {getAllPlayers().length > 0 
                                    ? (getAllPlayers()[0].score !== null 
                                        ? getAllPlayers()[0].score 
                                        : 'No scores') 
                                    : 'No players'}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="px-6 py-3">
                          {isTeamGame() ? (
                            /* Team Players Layout */
                            <div>
                              <p className="text-gray-300 text-sm mb-2 font-medium">Team Members</p>
                              <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                                {Object.entries(getTeamPlayers() || {}).map(([teamId, team], index) => {
                                  // Skip empty teams
                                  if (team.members.length === 0) return null;
                                  
                                  return (
                                    <div key={teamId} className={`bg-gradient-to-r ${getTeamColor(index)} rounded-md p-2`}>
                                      <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center">
                                          <p className="text-sm font-medium text-white">{team.name}</p>
                                        </div>
                                        {game.winner_id === teamId && (
                                          <span className="bg-yellow-500 text-yellow-900 text-xs px-2 py-0.5 rounded-full font-bold">
                                            Winner
                                          </span>
                                        )}
                                      </div>
                                      
                                      <div className="flex flex-wrap gap-1.5">
                                        {team.members.map(player => (
                                          <span key={player.id} className="inline-flex items-center bg-black bg-opacity-30 px-2 py-1 rounded text-xs text-white">
                                            {player.name}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            /* Free-for-all Players Layout */
                            <div>
                              <p className="text-gray-300 text-sm mb-2">Players</p>
                              <div className="max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent pr-2">
                                <div className="space-y-1">
                                  {getAllPlayers().map(player => (
                                    <div 
                                      key={player.id} 
                                      className={`flex justify-between items-center px-2 py-1 rounded ${
                                        player.isWinner ? 'bg-yellow-500 bg-opacity-20' : 'bg-black bg-opacity-20'
                                      }`}
                                    >
                                      <span className="text-sm font-medium flex items-center">
                                        {player.isWinner && (
                                          <svg className="w-3 h-3 text-yellow-500 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                          </svg>
                                        )}
                                        {player.name}
                                      </span>
                                      {player.score !== null && (
                                        <span className="text-sm text-gray-300">{player.score}</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="px-6 py-3 bg-black bg-opacity-10 flex justify-between items-center text-xs">
                          <span>Game ID: {game.id.substring(0, 8)}...</span>
                          {game.settings && (
                            <span className="bg-white bg-opacity-20 px-2 py-1 rounded-full">
                              Custom settings
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          
          {/* Recent Players */}
          {activeTab === 'players' && (
            <div>
              <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
                {t('profile.players')}
              </h2>
              
              <LoadingState
                isLoading={isLoadingPlayers}
                hasData={players.length > 0}
                error={playersError}
                loadingMessage="Loading your recent players..."
                emptyMessage="No recent players found."
                emptySubMessage="Add players to your games to see them here."
              />
              
              {!isLoadingPlayers && !playersError && players.length > 0 && (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {players.map((player) => {
                    // Convert supabase Player type to App Player type
                    const appPlayer: AppPlayer = {
                      id: player.id,
                      name: player.name,
                      image: player.image || '',
                      score: player.score
                    };
                    
                    return (
                      <div key={player.id} className="relative">
                        <PlayerCard 
                          player={appPlayer}
                          showScore={true}
                          size="md"
                          className="aspect-square w-full h-auto"
                        />
                        {!isGameActive && (
                          <button
                            onClick={(e) => handleEditPlayer(player, e)}
                            className="absolute top-1 right-1 bg-gray-800 bg-opacity-70 text-white rounded-full p-1.5 shadow-md hover:bg-gray-900 transition-colors"
                            aria-label="Edit player"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              
              {/* Player Edit Modal */}
              {isEditModalOpen && playerToEdit && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
                    <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
                      {t('player.editPlayer')}
                    </h3>
                    <PlayerEditForm 
                      player={playerToEdit}
                      onSave={handleSavePlayerEdit}
                      onCancel={handleCloseEditModal}
                      isInGame={isGameActive}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Recent Challenges */}
          {activeTab === 'challenges' && (
            <div>
              <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
                {t('profile.challenges')}
              </h2>
              
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
          
          {/* Confirmation Modal */}
          {showConfirmModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-sm w-full">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {modalAction === 'end' ? 'End Game' : 'Delete Game'}
                </h3>
                <p className="text-gray-700 dark:text-gray-300 mb-6">
                  {modalAction === 'end' 
                    ? 'Are you sure you want to end this game?' 
                    : 'Are you sure you want to delete this game? This action cannot be undone.'}
                </p>
                <div className="flex justify-end space-x-4">
                  <button
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    onClick={() => setShowConfirmModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className={`px-4 py-2 rounded ${
                      modalAction === 'end'
                        ? 'bg-orange-500 hover:bg-orange-600 text-white'
                        : 'bg-red-500 hover:bg-red-600 text-white'
                    }`}
                    onClick={handleConfirmAction}
                  >
                    {modalAction === 'end' ? 'End Game' : 'Delete Game'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;