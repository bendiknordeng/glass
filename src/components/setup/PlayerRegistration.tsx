import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/contexts/GameContext';
import Button from '@/components/common/Button';
import PlayerCard from '@/components/common/PlayerCard';
import LoadingState from '@/components/common/LoadingState';
import { fileToDataUrl } from '@/utils/helpers';
import { getAvatarByName } from '@/utils/avatarUtils';
import { Player } from '@/types/Player';
import { playersService } from '@/services/supabase';
import { useValidatedAuth } from '@/utils/auth-helpers'; // Use validated auth
import { getAnonymousUserId } from '@/utils/auth-helpers'; // Import anonymous user ID helper
import { Player as DbPlayer } from '@/types/supabase'; // Import the database Player type

// Maximum number of recent players to store
const MAX_RECENT_PLAYERS = 10;
const RECENT_PLAYERS_KEY = 'recentPlayers';

// Helper function to update recent players in local storage (for fallback)
const updateRecentPlayersLocally = (newPlayer: Player) => {
  try {
    const recentPlayers = JSON.parse(localStorage.getItem(RECENT_PLAYERS_KEY) || '[]');
    
    // Remove any existing player with the same name (case insensitive)
    const filteredPlayers = recentPlayers.filter(
      (player: Player) => player.name.toLowerCase() !== newPlayer.name.toLowerCase()
    );
    
    // Add new player to the beginning
    const updatedPlayers = [newPlayer, ...filteredPlayers].slice(0, MAX_RECENT_PLAYERS);
    
    localStorage.setItem(RECENT_PLAYERS_KEY, JSON.stringify(updatedPlayers));
  } catch (error) {
    console.error('Error updating recent players locally:', error);
  }
};

// Helper function to delete a player from local storage (for fallback)
const deleteRecentPlayerLocally = (playerId: string) => {
  try {
    const recentPlayers = JSON.parse(localStorage.getItem(RECENT_PLAYERS_KEY) || '[]');
    const updatedPlayers = recentPlayers.filter((player: Player) => player.id !== playerId);
    localStorage.setItem(RECENT_PLAYERS_KEY, JSON.stringify(updatedPlayers));
    return updatedPlayers;
  } catch (error) {
    console.error('Error deleting recent player locally:', error);
    return [];
  }
};

const PlayerRegistration: React.FC = () => {
  const { t } = useTranslation();
  const { state, dispatch } = useGame();
  const { user, isAuthenticated, getValidUserId } = useValidatedAuth(); // Get the validated user ID function
  
  const [playerName, setPlayerName] = useState('');
  const [playerImage, setPlayerImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [recentPlayers, setRecentPlayers] = useState<Player[]>([]);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // Add state for player deletion confirmation
  const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Add this state to cache database players and optimize reloading
  const [dbPlayersCached, setDbPlayersCached] = useState<Player[]>([]);
  const [lastLoadTime, setLastLoadTime] = useState<number>(0);
  const DB_CACHE_TIMEOUT = 30000; // 30 seconds cache timeout
  
  // Add this after other state declarations in the component
  const prevPlayersRef = useRef<Player[]>([]);
  
  // Convert DbPlayer to app Player type
  const dbPlayerToAppPlayer = (dbPlayer: DbPlayer): Player => ({
    id: dbPlayer.id,
    name: dbPlayer.name,
    image: dbPlayer.image || '',
    score: dbPlayer.score
  });
  
  // Load recent players from Supabase or localStorage
  const loadRecentPlayers = async (forceRefresh = false) => {
    // Don't reload if already loading
    if (isLoadingPlayers && !forceRefresh) return;
    
    setIsLoadingPlayers(true);
    setLoadError(null);
    
    // Set a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      setIsLoadingPlayers(false);
      setLoadError(t('error.timeoutLoadingPlayers'));
    }, 5000); // 5 seconds max loading time
    
    // Create a Set of current player IDs and names for faster lookups
    const currentPlayerIds = new Set(state.players.map(p => p.id));
    const currentPlayerNames = new Set(state.players.map(p => p.name.toLowerCase()));
    
    // Helper to filter out current players
    const filterCurrentPlayers = (players: Player[]) => {
      return players.filter((recentPlayer: Player) => 
        !currentPlayerIds.has(recentPlayer.id) && 
        !currentPlayerNames.has(recentPlayer.name.toLowerCase())
      );
    };
    
    try {
      // Check if we can use cached data (if not forced refresh and cache is fresh)
      const now = Date.now();
      const cacheIsFresh = now - lastLoadTime < DB_CACHE_TIMEOUT;
      
      if (isAuthenticated && user) {
        // For authenticated users: use cache or fetch from DB
        if (!forceRefresh && cacheIsFresh && dbPlayersCached.length > 0) {
          // Use cached data if available and not forcing refresh
          const filteredPlayers = filterCurrentPlayers(dbPlayersCached);
          setRecentPlayers(filteredPlayers);
        } else {
          // Need to load from database
          const validUserId = getValidUserId();
          if (!validUserId) {
            throw new Error('Could not get a valid user ID');
          }

          // Load from Supabase with user ID filter
          const dbPlayers = await playersService.getPlayers(validUserId);
          
          // Map the database players to app Player format
          const formattedPlayers = dbPlayers.map(dbPlayerToAppPlayer);
          
          // Cache the full set of players for future filtering
          setDbPlayersCached(formattedPlayers);
          setLastLoadTime(now);
          
          // Filter players already in the game
          const filteredPlayers = filterCurrentPlayers(formattedPlayers);
          setRecentPlayers(filteredPlayers);
        }
      } else {
        // For non-authenticated users: use localStorage
        const localPlayers = getRecentPlayersLocally();
        const filteredPlayers = filterCurrentPlayers(localPlayers);
        setRecentPlayers(filteredPlayers);
      }
    } catch (error) {
      console.error('Error loading recent players:', error);
      setLoadError(t('error.loadingPlayers'));
      // Fallback to localStorage
      const players = getRecentPlayersLocally();
      const filteredPlayers = filterCurrentPlayers(players);
      setRecentPlayers(filteredPlayers);
    } finally {
      clearTimeout(loadingTimeout);
      setIsLoadingPlayers(false);
    }
  };
  
  // Helper function to get recent players from local storage
  const getRecentPlayersLocally = (): Player[] => {
    try {
      const stored = localStorage.getItem(RECENT_PLAYERS_KEY);
      if (!stored) return [];
      
      const players = JSON.parse(stored);
      // Filter happens in loadRecentPlayers now
      return players;
    } catch (error) {
      console.error('Error reading recent players from local storage:', error);
      return [];
    }
  };
  
  // Load recent players only on mount and when authentication changes, not on every player change
  useEffect(() => {
    loadRecentPlayers();
    // Only depend on isAuthenticated, not state.players
  }, [isAuthenticated]);
  
  // Add this effect to detect when players are removed from the game
  useEffect(() => {
    // Skip on first render
    if (prevPlayersRef.current.length === 0) {
      prevPlayersRef.current = state.players;
      return;
    }

    // Find players that were in the previous state but not in the current state
    const removedPlayers = prevPlayersRef.current.filter(prevPlayer => 
      !state.players.some(currentPlayer => currentPlayer.id === prevPlayer.id)
    );

    // If we have removed players and cached data, add them back to recent players
    if (removedPlayers.length > 0) {
      // Find removed players in our cache if they exist
      if (dbPlayersCached.length > 0) {
        const playersToAdd = removedPlayers.filter(removedPlayer => 
          dbPlayersCached.some(cachedPlayer => cachedPlayer.id === removedPlayer.id)
        );

        if (playersToAdd.length > 0) {
          // Add removed players back to recent players list
          setRecentPlayers(prev => [...playersToAdd, ...prev]);
        }
      } else if (!isAuthenticated) {
        // For local storage users, just add the removed players back
        setRecentPlayers(prev => [...removedPlayers, ...prev]);
      }
    }

    // Update the ref to current value
    prevPlayersRef.current = state.players;
  }, [state.players]);
  
  // Handle enter key press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isProcessing && playerName.trim() !== '') {
      handleAddPlayer();
    }
  };
  
  // Dropzone setup for image upload
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif'],
    },
    maxFiles: 1,
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        setPlayerImage(file);
        
        // Create preview
        const preview = URL.createObjectURL(file);
        setPreviewUrl(preview);
      }
    },
  });
  
  // Add a new player
  const handleAddPlayer = async () => {
    if (playerName.trim() === '') {
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Convert image to data URL if provided
      let imageDataUrl = '';
      if (playerImage) {
        imageDataUrl = await fileToDataUrl(playerImage);
      } else {
        // If no image uploaded, use the avatar based on player name
        imageDataUrl = getAvatarByName(playerName.trim()).url;
      }

      const playerData = {
        name: playerName.trim(),
        image: imageDataUrl,
        score: 0
      };

      // Create player in database if authenticated
      if (isAuthenticated && user) {
        // Get a valid UUID format user ID
        const validUserId = getValidUserId();
        if (!validUserId) {
          throw new Error('Could not get a valid user ID');
        }
        
        
        const newDbPlayer = await playersService.addPlayer({
          user_id: validUserId,
          name: playerData.name,
          image: playerData.image,
          score: 0,
          favorite: false,
          last_played_at: new Date().toISOString()
        });

        if (newDbPlayer) {
          // Convert database player to app player type
          const newPlayer = dbPlayerToAppPlayer(newDbPlayer);

          // Dispatch action to add player
          dispatch({
            type: 'ADD_PLAYER',
            payload: {
              name: newPlayer.name,
              image: newPlayer.image,
              id: newPlayer.id
            }
          });
        } else {
          console.warn("Failed to add player to Supabase, falling back to client-side ID generation");
          // Fallback to client-side ID generation if database insert fails
          const newPlayer = {
            ...playerData,
            id: Date.now().toString()
          };

          // Dispatch action to add player
          dispatch({
            type: 'ADD_PLAYER',
            payload: {
              name: newPlayer.name,
              image: newPlayer.image,
              id: newPlayer.id
            }
          });

          // Store locally as fallback
          updateRecentPlayersLocally(newPlayer);
        }
      } else {
        // Not authenticated, generate ID client-side
        const newPlayer = {
          ...playerData,
          id: Date.now().toString()
        };

        // Dispatch action to add player
        dispatch({
          type: 'ADD_PLAYER',
          payload: {
            name: newPlayer.name,
            image: newPlayer.image,
            id: newPlayer.id
          }
        });

        // Store locally
        updateRecentPlayersLocally(newPlayer);
      }
      
      // Update the displayed recent players
      await loadRecentPlayers();
      
      // Reset form
      setPlayerName('');
      setPlayerImage(null);
      setPreviewUrl('');
    } catch (error) {
      console.error('Error adding player:', error);
      // Display error to user if needed
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Add a recent player
  const handleAddRecentPlayer = (player: Player) => {
    // Optimistic UI update - immediately add to current players
    dispatch({
      type: 'ADD_PLAYER',
      payload: {
        name: player.name,
        image: player.image,
        id: player.id
      }
    });
    
    // Optimistic UI update - immediately remove from recent players list
    setRecentPlayers(prev => prev.filter(p => p.id !== player.id));
    
    // Update last_played_at in the database asynchronously
    if (isAuthenticated && user) {
      playersService.updatePlayer(player.id, {
        last_played_at: new Date().toISOString()
      }).catch(error => {
        console.error('Error updating player last played timestamp:', error);
      });
    } else {
      // For non-authenticated users, update localStorage
      updateRecentPlayersLocally(player);
    }
  };
  
  // Add all recent players to the game
  const handleAddAllRecentPlayers = () => {
    // Make a copy to prevent modification during iteration
    const playersToAdd = [...recentPlayers];
    
    // Optimistic UI update - immediately add all to current players
    for (const player of playersToAdd) {
      dispatch({
        type: 'ADD_PLAYER',
        payload: {
          name: player.name,
          image: player.image,
          id: player.id
        }
      });
    }
    
    // Optimistic UI update - immediately clear recent players
    setRecentPlayers([]);
    
    // Update database records asynchronously
    if (isAuthenticated && user) {
      const promises = playersToAdd.map(player => 
        playersService.updatePlayer(player.id, {
          last_played_at: new Date().toISOString()
        })
      );
      
      // Handle any errors in the background
      Promise.allSettled(promises).then(results => {
        results.forEach((result, i) => {
          if (result.status === 'rejected') {
            console.error(`Error updating player ${playersToAdd[i].name}:`, result.reason);
          }
        });
      });
    } else {
      // For non-authenticated users, update localStorage
      for (const player of playersToAdd) {
        updateRecentPlayersLocally(player);
      }
    }
  };
  
  // Update the handleRemovePlayer function to update database timestamp
  const handleRemovePlayer = (playerId: string) => {
    // Find the player before removing them
    const playerToRemove = state.players.find(p => p.id === playerId);
    
    // Remove from current players
    dispatch({
      type: 'REMOVE_PLAYER',
      payload: playerId
    });
    
    // If found and authenticated, update last_played_at in database
    if (playerToRemove && isAuthenticated && user) {
      playersService.updatePlayer(playerToRemove.id, {
        last_played_at: new Date().toISOString()
      }).catch(error => {
        console.error('Error updating removed player timestamp:', error);
      });
    }
  };
  
  // Handle initiating deletion of a recent player
  const initiateDeleteRecentPlayer = (e: React.MouseEvent, player: Player) => {
    e.stopPropagation(); // Prevent triggering the add player action
    setPlayerToDelete(player);
    setShowDeleteConfirm(true);
  };
  
  // Handle confirming deletion of a recent player
  const handleDeleteRecentPlayer = async () => {
    if (!playerToDelete) return;
    
    // Optimistic UI update - immediately remove from recent players
    setRecentPlayers(prev => prev.filter(p => p.id !== playerToDelete.id));
    
    // Also remove from cache if it exists there
    if (dbPlayersCached.length > 0) {
      setDbPlayersCached(prev => prev.filter(p => p.id !== playerToDelete.id));
    }
    
    // Reset deletion state immediately for better UX
    const playerToDeleteCopy = playerToDelete;
    setShowDeleteConfirm(false);
    setPlayerToDelete(null);
    
    // Perform actual deletion asynchronously
    if (isAuthenticated && user) {
      playersService.deletePlayer(playerToDeleteCopy.id)
        .catch(error => {
          console.error('Error deleting player:', error);
          // Optionally show error toast/notification here
        });
    } else {
      // Fallback to local storage
      deleteRecentPlayerLocally(playerToDeleteCopy.id);
    }
  };
  
  // Handle canceling deletion
  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setPlayerToDelete(null);
  };
  
  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white text-center">
        {t('setup.playerRegistration')}
      </h2>
      
      {/* Player Input Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Player Name Input */}
          <div className="h-full flex flex-col">
            <label htmlFor="playerName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('setup.playerName')}
            </label>
            <input
              type="text"
              id="playerName"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full flex-1 rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-game-primary focus:ring focus:ring-game-primary focus:ring-opacity-50 dark:bg-gray-700 dark:text-white"
              placeholder="Enter player name"
              onKeyDown={handleKeyDown}
            />
          </div>
          
          {/* Player Image Upload */}
          <div className="h-full flex flex-col">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('setup.uploadImage')} ({t('common.optional')})
            </label>
            <div
              {...getRootProps()}
              className={`
                flex-1 border-2 border-dashed rounded-md p-4 text-center cursor-pointer transition-colors flex items-center justify-center
                ${isDragActive ? 'border-game-primary bg-game-primary bg-opacity-10' : 'border-gray-300 dark:border-gray-600'}
                hover:border-game-primary hover:bg-game-primary hover:bg-opacity-5 dark:hover:bg-opacity-10
              `}
            >
              <input {...getInputProps()} />
              
              {previewUrl ? (
                <div className="flex flex-col items-center">
                  <img 
                    src={previewUrl} 
                    alt="Preview" 
                    className="h-24 w-24 object-cover rounded-full mb-2"
                  />
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {t('setup.clickToChange')}
                  </span>
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">
                  {t('setup.dragDropImage')}
                </p>
              )}
            </div>
          </div>
        </div>
        
        {/* Add Player Button */}
        <div className="mt-6 flex justify-center">
          <Button
            variant="primary"
            size="lg"
            isDisabled={playerName.trim() === ''}
            isLoading={isProcessing}
            onClick={handleAddPlayer}
            className="w-full md:w-auto"
          >
            {t('setup.addPlayer')}
          </Button>
        </div>
      </div>
      
      {/* Player deletion confirmation dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
              {t('common.confirmDelete')}
            </h3>
            <p className="mb-6 text-gray-600 dark:text-gray-300">
              {t('setup.confirmDeletePlayer', { item: playerToDelete?.name || 'player' })}
            </p>
            <div className="flex justify-end space-x-4">
              <Button
                variant="secondary"
                size="md"
                onClick={handleCancelDelete}
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="danger"
                size="md"
                onClick={handleDeleteRecentPlayer}
              >
                {t('common.delete')}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Recent Players */}
      <LoadingState 
        isLoading={isLoadingPlayers} 
        hasData={recentPlayers.length > 0} 
        error={loadError}
        emptyMessage={t('setup.noRecentPlayers')}
        emptySubMessage={t('setup.addPlayersToSee')}
      />
      
      {!isLoadingPlayers && !loadError && recentPlayers.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
              {t('setup.recentPlayers')}
            </h3>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleAddAllRecentPlayers}
              className="ml-4"
            >
              {t('setup.addAllPlayers')}
            </Button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
            {recentPlayers.map((player) => (
              <motion.div
                key={player.id}
                className="relative cursor-pointer transform transition-transform hover:scale-105"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleAddRecentPlayer(player)}
              >
                <PlayerCard player={player} showScore={false} size="sm" />
                <button
                  className="absolute -top-2 -left-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-md hover:bg-red-600 transition-colors focus:outline-none"
                  onClick={(e) => initiateDeleteRecentPlayer(e, player)}
                >
                  &times;
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}
      
      {/* Player List */}
      <div>
        <h3 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">
          {t('setup.addedPlayers', { count: state.players.length })}
        </h3>
        
        {state.players.length > 0 ? (
          <motion.div 
            className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.05
                }
              }
            }}
          >
            <AnimatePresence>
              {state.players.map((player) => (
                <motion.div
                  key={player.id}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.3 }}
                  className="relative"
                >
                  <PlayerCard player={player} showScore={false} />
                  <button
                    className="absolute -top-2 -left-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-md hover:bg-red-600 transition-colors focus:outline-none"
                    onClick={() => handleRemovePlayer(player.id)}
                  >
                    &times;
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg">
            <p>{t('setup.noPlayersYet')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerRegistration;