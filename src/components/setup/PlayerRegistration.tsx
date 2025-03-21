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
import { useValidatedAuth } from '@/utils/auth-helpers';
import { Player as DbPlayer } from '@/types/supabase';
import PlayerEditForm from '@/components/forms/PlayerEditForm';
import { useGameActive } from '@/hooks/useGameActive';

// Maximum number of recent players to store
const MAX_RECENT_PLAYERS = 15;
const RECENT_PLAYERS_KEY = 'recentPlayers';

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

// Since we're hitting TypeScript compatibility issues, let's create adapter functions
// to safely convert between different Player types
const appPlayerToDbPlayer = (player: Player): DbPlayer => ({
  id: player.id,
  user_id: 'local',
  name: player.name,
  image: player.image,
  score: player.score,
  favorite: false,
  last_played_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  total_games: 0,
  wins: 0
});

const dbPlayerToAppPlayer = (dbPlayer: DbPlayer): Player => ({
  id: dbPlayer.id,
  name: dbPlayer.name,
  image: dbPlayer.image || '',
  score: dbPlayer.score
});

// Add a helper function to compress images before upload
const compressImage = async (file: File, maxWidth = 800, maxHeight = 800, quality = 0.8): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        // Create canvas
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Calculate new dimensions while maintaining aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }
        
        // Set canvas dimensions and draw image
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to data URL with compression
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
  });
};

const PlayerRegistration: React.FC = () => {
  const { t } = useTranslation();
  const { state, dispatch } = useGame();
  const { user, isAuthenticated, getValidUserId } = useValidatedAuth(); // Get the validated user ID function
  const isGameActive = useGameActive();
  
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
  
  // Add state for player editing modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [playerToEdit, setPlayerToEdit] = useState<DbPlayer | null>(null);
  
  // Helper function to update recent players in local storage (for fallback)
  const updateRecentPlayersLocally = (newPlayer: Player) => {
    try {
      // For authenticated users, don't store in localStorage (already in Supabase)
      if (isAuthenticated && user) {
        return;
      }
      
      const recentPlayers = JSON.parse(localStorage.getItem(RECENT_PLAYERS_KEY) || '[]');
      
      // Store only the essential data, no images
      let playerToStore = {
        id: newPlayer.id,
        name: newPlayer.name,
        score: newPlayer.score
      };
      
      // Add new player to the beginning
      const updatedPlayers = [playerToStore, ...recentPlayers].slice(0, MAX_RECENT_PLAYERS);
      
      localStorage.setItem(RECENT_PLAYERS_KEY, JSON.stringify(updatedPlayers));
    } catch (error) {
      console.error('Error updating recent players locally:', error);
    }
  };
  
  // Helper to filter out current players from recent players list
  const filterRecentPlayers = (players: Player[]): Player[] => {
    // Create a Set of current player IDs and names for faster lookups
    const currentPlayerIds = new Set(state.players.map(p => p.id));
    
    return players.filter((recentPlayer: Player) => 
      !currentPlayerIds.has(recentPlayer.id)
    );
  };
  
  // Cache players in localStorage - only store IDs and names
  const cachePlayers = (players: Player[]) => {
    try {
      // For all users, store only essential player data
      const playersToCache = players.map(player => ({
        id: player.id,
        name: player.name,
        score: player.score
      }));
      
      localStorage.setItem('cachedPlayers', JSON.stringify(playersToCache));
    } catch (error) {
      console.error('Error caching players:', error);
    }
  };
  
  // Generate an avatar for a player based on reference
  const getAvatarFromReference = (imageRef: string): string => {
    if (!imageRef.startsWith('avatar_ref_')) {
      return imageRef; // Not a reference, return as is
    }
    
    try {
      // Extract player name from reference (format: avatar_ref_id|name)
      const parts = imageRef.split('|');
      if (parts.length > 1) {
        const playerName = decodeURIComponent(parts[1]);
        return getAvatarByName(playerName).url;
      }
      
      // If format is incorrect, generate a generic avatar
      return getAvatarByName('Unknown Player').url;
    } catch (error) {
      console.error('Error generating avatar from reference:', error);
      return getAvatarByName('Error').url;
    }
  };
  
  /**
   * Load recent players from database or localStorage
   */
  const loadRecentPlayers = async (forceRefresh = false) => {
    // Don't reload if we're already loading and not forcing a refresh
    if (isLoadingPlayers && !forceRefresh) return;
    
    // Don't reload if it's been less than the cache timeout unless forced
    const now = Date.now();
    if (!forceRefresh && now - lastLoadTime < DB_CACHE_TIMEOUT && dbPlayersCached.length > 0) {
      console.log('Using cached players - skipping database load');
      // Just filter the cached players to get recent ones
      const filteredPlayers = filterRecentPlayers(dbPlayersCached);
      setRecentPlayers(filteredPlayers);
      return;
    }
    
    setIsLoadingPlayers(true);
    setLoadError(null);
    
    const loadingTimeout = setTimeout(() => {
      setIsLoadingPlayers(false);
      setLoadError(t('error.timeoutLoadingPlayers'));
    }, 5000);
    
    try {
      if (isAuthenticated && user) {
        const validUserId = getValidUserId();
        if (!validUserId) {
          throw new Error('Could not get a valid user ID');
        }

        // If we already have cached players and just need to refresh
        if (dbPlayersCached.length > 0 && forceRefresh) {
          // Just use the cached data and update timestamps
          const filteredPlayers = filterRecentPlayers(dbPlayersCached);
          setRecentPlayers(filteredPlayers);
          setLastLoadTime(now);
          
          // Asynchronously refresh the cache in background without blocking UI
          playersService.getPlayers(validUserId)
            .then(dbPlayers => {
              const formattedPlayers = dbPlayers.map(dbPlayerToAppPlayer);
              
              // Update players with images
              const playersWithImages = formattedPlayers.map(player => {
                if (!player.image || player.image === '') {
                  return { ...player, image: getAvatarByName(player.name).url };
                }
                return player;
              });
              
              setDbPlayersCached(playersWithImages);
              cachePlayers(playersWithImages);
              
              // Refresh the display with new data if needed
              const newFilteredPlayers = filterRecentPlayers(playersWithImages);
              setRecentPlayers(newFilteredPlayers);
            })
            .catch(error => console.error('Background player refresh error:', error));
        } else {
          // Always load fresh from database when authenticated
          const dbPlayers = await playersService.getPlayers(validUserId);
          const formattedPlayers = dbPlayers.map(dbPlayerToAppPlayer);
          
          // IMPORTANT: Ensure all players have their actual images from the database
          const playersWithImages = formattedPlayers.map(player => {
            // If there is no image or it's empty, generate an avatar
            if (!player.image || player.image === '') {
              return {
                ...player,
                image: getAvatarByName(player.name).url
              };
            }
            // Otherwise keep the actual database image
            return player;
          });
          
          // Store all database players in memory to ensure we always have the original images
          setDbPlayersCached(playersWithImages);
          
          // Also cache minimal player data (without images)
          cachePlayers(playersWithImages);
          
          const filteredPlayers = filterRecentPlayers(playersWithImages);
          
          // Set the filtered players to state
          setRecentPlayers(filteredPlayers);
          setLastLoadTime(now);
        }
      } else {
        // For non-authenticated users: use localStorage with generated avatars
        const localPlayers = getRecentPlayersLocally();
        const filteredPlayers = filterRecentPlayers(localPlayers);
        setRecentPlayers(filteredPlayers);
      }
    } catch (error) {
      console.error('Error loading recent players:', error);
      setLoadError(t('error.loadingPlayers'));
      // For non-authenticated users, fallback to localStorage
      if (!isAuthenticated) {
        const players = getRecentPlayersLocally();
        const filteredPlayers = filterRecentPlayers(players);
        setRecentPlayers(filteredPlayers);
      }
    } finally {
      clearTimeout(loadingTimeout);
      setIsLoadingPlayers(false);
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
      // On initial mount, refilter recent players to ensure they don't include current players
      // This is important for page refreshes when state.players may load after recent players
      if (state.players.length > 0 && recentPlayers.length > 0) {
        setRecentPlayers(filterRecentPlayers(recentPlayers));
      }
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
          // Add removed players back to recent players list but ensure no duplicates
          setRecentPlayers(prev => {
            // Combine previous recent players with newly removed players
            const updatedPlayers = [...playersToAdd, ...prev];
            
            // Remove any duplicates (by id)
            const uniquePlayers = [...new Map(updatedPlayers.map(p => [p.id, p])).values()];
            
            // Filter out any players that are in the current game
            return filterRecentPlayers(uniquePlayers);
          });
        }
      } else if (!isAuthenticated) {
        // For local storage users, just add the removed players back
        setRecentPlayers(prev => {
          // Combine previous recent players with newly removed players
          const updatedPlayers = [...removedPlayers, ...prev];
          
          // Remove any duplicates (by id)
          const uniquePlayers = [...new Map(updatedPlayers.map(p => [p.id, p])).values()];
          
          // Filter out any players that are in the current game
          return filterRecentPlayers(uniquePlayers);
        });
      }
    }

    // Update the ref to current value
    prevPlayersRef.current = state.players;
  }, [state.players]);
  
  // Modify this useEffect to run more frequently
  useEffect(() => {
    // Only filter if we have recent players and game players
    if (recentPlayers.length > 0 && state.players.length > 0) {
      // Apply the filter to ensure no recent player is in the current game
      const filteredPlayers = filterRecentPlayers(recentPlayers);
      
      // Only update the state if the filtered list is different from the current one
      if (JSON.stringify(filteredPlayers) !== JSON.stringify(recentPlayers)) {
        setRecentPlayers(filteredPlayers);
      }
    }
  }, [state.players, recentPlayers]);
  
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
      // Convert image to data URL if provided, with compression
      let imageDataUrl = '';
      if (playerImage) {
        try {
          // Compress the image before upload
          imageDataUrl = await compressImage(playerImage, 600, 600, 0.85);
          console.log('Image compressed successfully');
        } catch (compressionError) {
          console.error('Error compressing image:', compressionError);
          // Fall back to original fileToDataUrl if compression fails
          imageDataUrl = await fileToDataUrl(playerImage);
        }
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
        
        try {
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

            // Add to player cache to ensure we have it for future operations
            if (dbPlayersCached.length > 0) {
              setDbPlayersCached(prev => [...prev, newPlayer]);
            }

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
            throw new Error('Failed to add player to database');
          }
        } catch (error) {
          console.error("Error adding player to Supabase:", error);
          
          // Check if the error is about the image size
          if (error instanceof Error && 
              (error.message.includes('too large') || 
               error.message.includes('payload size') || 
               error.message.includes('size limit'))) {
            
            console.warn("Image too large for Supabase, trying with default avatar instead");
            
            // Retry with default avatar instead of the large image
            const defaultImage = getAvatarByName(playerData.name).url;
            
            const newDbPlayer = await playersService.addPlayer({
              user_id: validUserId,
              name: playerData.name,
              image: defaultImage,
              score: 0,
              favorite: false,
              last_played_at: new Date().toISOString()
            });
            
            if (newDbPlayer) {
              // Convert database player to app player type
              const newPlayer = dbPlayerToAppPlayer(newDbPlayer);

              // Add to player cache to ensure we have it for future operations
              if (dbPlayersCached.length > 0) {
                setDbPlayersCached(prev => [...prev, newPlayer]);
              }

              // Dispatch action to add player
              dispatch({
                type: 'ADD_PLAYER',
                payload: {
                  name: newPlayer.name,
                  image: newPlayer.image,
                  id: newPlayer.id
                }
              });
              
              // Show warning about using default image
              console.warn("Using default avatar for player due to image size constraints");
            } else {
              throw new Error('Failed to add player with default avatar');
            }
          } else {
            // For other errors, fall back to client-side ID generation
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
          }
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

        // Store locally only for non-authenticated users - without images
        updateRecentPlayersLocally(newPlayer);
      }
      
      // Update the displayed recent players
      await loadRecentPlayers(true); // Force refresh to ensure we get the latest
      
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
    // IMPORTANT: Ensure we're using the actual image from the database if it exists
    // Find the player in our cached DB players to get the original image
    let playerToAdd = player;
    if (dbPlayersCached.length > 0) {
      const cachedPlayer = dbPlayersCached.find(p => p.id === player.id);
      if (cachedPlayer && cachedPlayer.image) {
        playerToAdd = { ...player, image: cachedPlayer.image };
      }
    }

    // Optimistic UI update - immediately add to current players
    dispatch({
      type: 'ADD_PLAYER',
      payload: {
        name: playerToAdd.name,
        image: playerToAdd.image,
        id: playerToAdd.id
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
    // IMPORTANT: Ensure we're using original images from database
    for (const player of playersToAdd) {
      // Get the original player from DB cache if available
      let playerWithOriginalImage = player;
      if (dbPlayersCached.length > 0) {
        const cachedPlayer = dbPlayersCached.find(p => p.id === player.id);
        if (cachedPlayer && cachedPlayer.image) {
          playerWithOriginalImage = { ...player, image: cachedPlayer.image };
        }
      }
      
      dispatch({
        type: 'ADD_PLAYER',
        payload: {
          name: playerWithOriginalImage.name,
          image: playerWithOriginalImage.image,
          id: playerWithOriginalImage.id
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
  
  // TypeScript-friendly edit function
  const handleEditPlayer = (player: Player, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent any other click handlers
    
    if (isGameActive) {
      console.warn('Cannot edit players during an active game');
      return;
    }
    
    // For database players, try to find in cache
    if (isAuthenticated && user) {
      // Type assertion as DbPlayer[] to help TypeScript understand
      const dbPlayerArr = dbPlayersCached as DbPlayer[];
      const dbPlayer = dbPlayerArr.find(p => p.id === player.id);
      if (dbPlayer) {
        setPlayerToEdit(dbPlayer);
        setIsEditModalOpen(true);
        return;
      }
    }
    
    // Convert app player to db player
    const dbPlayer = appPlayerToDbPlayer(player);
    setPlayerToEdit(dbPlayer);
    setIsEditModalOpen(true);
  };
  
  // Function to close the edit modal
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setPlayerToEdit(null);
  };
  
  // Handle saving edited player
  const handleSavePlayerEdit = async (updatedDbPlayer: DbPlayer) => {
    try {
      // Make sure image is never null
      const safeImage = updatedDbPlayer.image || '';
      
      if (isAuthenticated && user) {
        // Update in database
        await playersService.updatePlayer(updatedDbPlayer.id, {
          name: updatedDbPlayer.name,
          image: updatedDbPlayer.image
        });
        
        // Update cached DB players if this player exists there
        const newDbPlayersCached = [...dbPlayersCached] as DbPlayer[];
        const dbPlayerIndex = newDbPlayersCached.findIndex(p => p.id === updatedDbPlayer.id);
        if (dbPlayerIndex >= 0) {
          newDbPlayersCached[dbPlayerIndex] = {
            ...newDbPlayersCached[dbPlayerIndex],
            name: updatedDbPlayer.name,
            image: updatedDbPlayer.image
          };
          // Cast to Player[] to satisfy TypeScript
          setDbPlayersCached(newDbPlayersCached as unknown as Player[]);
          
          // Also update the cached player references (without images)
          cachePlayers(newDbPlayersCached as unknown as Player[]);
        }
      } else {
        // Local storage update - without images
        const localPlayers = getRecentPlayersLocally();
        const updatedLocalPlayers = localPlayers.map(p => 
          p.id === updatedDbPlayer.id 
            ? { 
                ...p, 
                name: updatedDbPlayer.name,
                // Store reference only, not the actual image
                image: `avatar_ref_${p.id}|${encodeURIComponent(updatedDbPlayer.name)}`
              } 
            : p
        );
        localStorage.setItem(RECENT_PLAYERS_KEY, JSON.stringify(updatedLocalPlayers));
      }
      
      // Update recent players display - only if player is in recent players
      const newRecentPlayers = [...recentPlayers];
      const recentPlayerIndex = newRecentPlayers.findIndex(p => p.id === updatedDbPlayer.id);
      if (recentPlayerIndex >= 0) {
        newRecentPlayers[recentPlayerIndex] = {
          ...newRecentPlayers[recentPlayerIndex],
          name: updatedDbPlayer.name,
          image: safeImage
        };
        // Make sure to filter the updated recent players
        setRecentPlayers(filterRecentPlayers(newRecentPlayers));
      }
      
      // Update current game players if this player is in the game
      const playerInGame = state.players.find(p => p.id === updatedDbPlayer.id);
      if (playerInGame) {
        dispatch({
          type: 'UPDATE_PLAYER_DETAILS',
          payload: {
            id: updatedDbPlayer.id,
            name: updatedDbPlayer.name,
            image: safeImage
          }
        });
      }
      
      // Close modal
      handleCloseEditModal();
    } catch (error) {
      console.error('Error updating player:', error);
    }
  };
  
  // Helper function to get recent players from local storage
  const getRecentPlayersLocally = (): Player[] => {
    try {
      // For non-authenticated users only
      const stored = localStorage.getItem(RECENT_PLAYERS_KEY);
      if (!stored) return [];
      
      const players = JSON.parse(stored);
      
      // Generate avatars for each player
      return players.map((player: Partial<Player>) => ({
        id: player.id || '',
        name: player.name || '',
        score: player.score || 0,
        image: getAvatarByName(player.name || '').url
      }));
    } catch (error) {
      console.error('Error reading recent players from local storage:', error);
      return [];
    }
  };
  
  // Add handler for removing all players
  const handleRemoveAllPlayers = () => {
    // Get all current players before removing them
    const playersToRemove = [...state.players];
    
    // If we have database cached players, merge them with the current players to ensure we have the correct images
    if (isAuthenticated && user && dbPlayersCached.length > 0) {
      for (let i = 0; i < playersToRemove.length; i++) {
        const player = playersToRemove[i];
        const cachedPlayer = dbPlayersCached.find(p => p.id === player.id);
        if (cachedPlayer && cachedPlayer.image) {
          // Ensure the player has its original image
          playersToRemove[i] = { ...player, image: cachedPlayer.image };
        }
      }
    }
    
    // Remove all players from the game state
    dispatch({ type: 'REMOVE_ALL_PLAYERS' });
    
    // For authenticated users: update timestamps but DON'T reload players
    if (isAuthenticated && user) {
      // Update last_played_at for all removed players in the background
      playersToRemove.forEach(player => 
        playersService.updatePlayer(player.id, {
          last_played_at: new Date().toISOString()
        })
        .catch(error => {
          console.error(`Error updating player ${player.name} timestamp:`, error);
        })
      );
      
      // IMPORTANT: Just update the recent players list with removed players
      // Do NOT trigger a reload which would cause the list to flash and potentially disappear
      setRecentPlayers(prevRecentPlayers => {
        // Combine existing recent players with the just-removed players
        const combinedPlayers = [...playersToRemove, ...prevRecentPlayers];
        
        // Remove any duplicates
        const uniquePlayers = [...new Map(combinedPlayers.map(p => [p.id, p])).values()];
        
        return uniquePlayers;
      });
    } else {
      // For non-authenticated users, update localStorage but DON'T reload
      for (const player of playersToRemove) {
        updateRecentPlayersLocally(player);
      }
      
      // Just update the recent players list with removed players
      setRecentPlayers(prevRecentPlayers => {
        // Combine existing recent players with the just-removed players
        const combinedPlayers = [...playersToRemove, ...prevRecentPlayers];
        
        // Remove any duplicates
        const uniquePlayers = [...new Map(combinedPlayers.map(p => [p.id, p])).values()];
        
        return uniquePlayers;
      });
    }
  };
  
  // Add this effect to load and cache all players on mount
  useEffect(() => {
    // Only run for authenticated users
    if (isAuthenticated && user) {
      const loadAllPlayersForCache = async () => {
        try {
          const validUserId = getValidUserId();
          if (!validUserId) return;
          
          setIsLoadingPlayers(true);
          
          // Fetch all players from the database
          const dbPlayers = await playersService.getPlayers(validUserId);
          if (!dbPlayers || dbPlayers.length === 0) {
            setIsLoadingPlayers(false);
            return;
          }
          
          // Convert to app format
          const formattedPlayers = dbPlayers.map(dbPlayerToAppPlayer);
          
          // Set the cached players
          setDbPlayersCached(formattedPlayers);
          
          // Also cache minimal player data
          cachePlayers(formattedPlayers);
          
          // Set the filtered players to state
          const filteredPlayers = filterRecentPlayers(formattedPlayers);
          setRecentPlayers(filteredPlayers);
          
          // Update last load time
          setLastLoadTime(Date.now());
          
          console.log(`Cached ${formattedPlayers.length} players from database`);
          setIsLoadingPlayers(false);
        } catch (error) {
          console.error('Error pre-loading players for cache:', error);
          setIsLoadingPlayers(false);
        }
      };
      
      // Load all players if the cache is empty
      if (dbPlayersCached.length === 0) {
        loadAllPlayersForCache();
      }
    }
  }, [isAuthenticated, user]);
  
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
              placeholder={t('player.namePlaceholder')}
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
                <PlayerCard 
                  player={player} 
                  showScore={false} 
                  size="sm" 
                  onEdit={(e) => handleEditPlayer(player, e)}
                  showEditButton={!isGameActive}
                  inGame={isGameActive}
                />
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
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300">
            {t('setup.addedPlayers', { count: state.players.length })}
          </h3>
          
          {state.players.length > 0 && (
            <Button
              variant="danger"
              size="sm"
              onClick={handleRemoveAllPlayers}
              className="ml-4"
            >
              {t('setup.removeAllPlayers')}
            </Button>
          )}
        </div>
        
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
                  <PlayerCard 
                    player={player} 
                    showScore={true}  
                    onEdit={(e) => handleEditPlayer(player, e)}
                    showEditButton={!isGameActive}
                    inGame={isGameActive}
                  />
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
  );
};

export default PlayerRegistration;