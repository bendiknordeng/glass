import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "@/contexts/GameContext";
import { Challenge, PrebuiltChallengeType, ChallengeType, QuizSettings, SpotifyMusicQuizSettings } from "@/types/Challenge";
import Button from "@/components/common/Button";
import CustomChallengeForm from "@/components/game/CustomChallengeForm";
import PrebuiltChallengeMenu from "@/components/prebuilt/PrebuiltChallengeMenu";
import SpotifyMusicQuizForm from "../prebuilt/SpotifyMusicQuizForm";
import { challengesService } from "@/services/supabase";
import { useValidatedAuth } from "@/utils/auth-helpers";
import { DBChallenge } from "@/types/supabase";
import QuizForm from "@/components/prebuilt/QuizForm";

// Maximum number of recent custom challenges to store
const MAX_RECENT_CHALLENGES = 10;
const RECENT_CHALLENGES_KEY = "recentCustomChallenges";

// Helper function to update recent challenges in local storage
const updateRecentChallenges = (newChallenge: Challenge, isSelected = false) => {
  try {
    console.log(`updateRecentChallenges: Updating challenge "${newChallenge.title}" with isSelected=${isSelected}`);
    
    const recentChallenges = JSON.parse(
      localStorage.getItem(RECENT_CHALLENGES_KEY) || "[]"
    );

    // Remove any existing challenge with the same ID or title
    const filteredChallenges = recentChallenges.filter(
      (challenge: Challenge) =>
        challenge.id !== newChallenge.id &&
        challenge.title.toLowerCase() !== newChallenge.title.toLowerCase()
    );

    // Ensure we preserve all prebuilt properties
    const challengeToStore = {
      ...newChallenge,
      // Explicitly preserve these crucial properties
      isPrebuilt: newChallenge.isPrebuilt,
      prebuiltType: newChallenge.prebuiltType,
      prebuiltSettings: newChallenge.prebuiltSettings,
      // Store whether this challenge is currently selected in the game
      isSelected: isSelected,
    };

    // Add new challenge to the beginning
    const updatedChallenges = [challengeToStore, ...filteredChallenges].slice(
      0,
      MAX_RECENT_CHALLENGES
    );

    localStorage.setItem(
      RECENT_CHALLENGES_KEY,
      JSON.stringify(updatedChallenges)
    );
    
    console.log(`updateRecentChallenges: Stored ${updatedChallenges.length} challenges in localStorage`);
    
    return updatedChallenges;
  } catch (error) {
    console.error("Error updating recent challenges:", error);
    return [];
  }
};

// Helper function to ensure prebuilt properties are preserved
const ensurePrebuiltPropertiesPreserved = (challenge: Challenge): Challenge => {
  // Create a new challenge object with preserved properties
  const challengeWithPreservedProps = {
    ...challenge,
    // Explicitly preserve these crucial properties
    isPrebuilt: challenge.isPrebuilt ?? false,
    prebuiltType: challenge.prebuiltType,
    prebuiltSettings: challenge.prebuiltSettings,
  };
  
  // Log if this is a prebuilt challenge with details
  if (challengeWithPreservedProps.isPrebuilt) {
    console.log('GameSettings: Preserving prebuilt properties for challenge:', {
      id: challengeWithPreservedProps.id,
      title: challengeWithPreservedProps.title,
      isPrebuilt: challengeWithPreservedProps.isPrebuilt,
      prebuiltType: challengeWithPreservedProps.prebuiltType,
      hasPrebuiltSettings: !!challengeWithPreservedProps.prebuiltSettings,
      prebuiltSettingsType: challengeWithPreservedProps.prebuiltSettings ? typeof challengeWithPreservedProps.prebuiltSettings : 'none'
    });
    
    // Additional check for Quiz challenges
    if (challengeWithPreservedProps.prebuiltType === PrebuiltChallengeType.QUIZ && challengeWithPreservedProps.prebuiltSettings) {
      const quizSettings = challengeWithPreservedProps.prebuiltSettings as QuizSettings;
      console.log('Quiz settings details:', {
        hasQuestions: quizSettings.questions?.length > 0,
        questionCount: quizSettings.questions?.length || 0
      });
    }
    // Additional check for Spotify challenges
    else if (challengeWithPreservedProps.prebuiltType === PrebuiltChallengeType.SPOTIFY_MUSIC_QUIZ && challengeWithPreservedProps.prebuiltSettings) {
      const spotifySettings = challengeWithPreservedProps.prebuiltSettings as SpotifyMusicQuizSettings;
      console.log('Spotify Quiz settings details:', {
        hasPlaylistUrl: !!spotifySettings.playlistUrl,
        playlistName: spotifySettings.playlistName || 'none',
        songCount: spotifySettings.numberOfSongs || 0
      });
    }
  }
  
  return challengeWithPreservedProps;
};

/**
 * Utility function to safely determine if a challenge is a prebuilt challenge of a specific type
 * This helps with proper form selection when editing challenges
 * 
 * @param challenge The challenge to check
 * @param type Optional specific prebuilt type to check for
 * @returns Boolean indicating if the challenge is a prebuilt of the specified type
 */
const isPrebuiltChallenge = (challenge: Challenge, type?: PrebuiltChallengeType): boolean => {
  // First check that isPrebuilt is explicitly true (not undefined or false)
  if (challenge.isPrebuilt !== true) {
    return false;
  }
  
  // Then check that it has a valid prebuilt type
  if (!challenge.prebuiltType) {
    console.warn('Challenge marked as prebuilt but has no prebuiltType:', challenge);
    return false;
  }
  
  // If a specific type was requested, check for that type
  if (type && challenge.prebuiltType !== type) {
    return false;
  }
  
  // Finally check that it has prebuilt settings
  if (!challenge.prebuiltSettings) {
    console.warn('Challenge marked as prebuilt but has no prebuiltSettings:', challenge);
    return false;
  }
  
  return true;
};

const GameSettings: React.FC = () => {
  const { t } = useTranslation();
  const { state, dispatch } = useGame();
  const { user, isAuthenticated, getValidUserId } = useValidatedAuth();
  const [durationType, setDurationType] = useState(state.gameDuration.type);
  const [durationValue, setDurationValue] = useState(state.gameDuration.value);
  const [showCustomChallengeForm, setShowCustomChallengeForm] = useState(false);
  const [showSpotifyMusicQuizForm, setShowSpotifyMusicQuizForm] = useState(false);
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<
    Challenge | undefined
  >(undefined);
  const [recentChallenges, setRecentChallenges] = useState<Challenge[]>([]);
  const [isLoadingChallenges, setIsLoadingChallenges] = useState(false);
  const [dbChallenges, setDbChallenges] = useState<Challenge[]>([]);
  
  // Animation state
  const [recentlyRemovedChallenge, setRecentlyRemovedChallenge] = useState<string | null>(null);
  
  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [challengeToDelete, setChallengeToDelete] = useState<Challenge | null>(null);
  const [deleteFromCurrentGame, setDeleteFromCurrentGame] = useState(false);

  // Keep track of challenges count to detect removals
  const [prevChallengesCount, setPrevChallengesCount] = useState(state.customChallenges.length);
  
  // Monitor changes to the custom challenges array
  React.useEffect(() => {
    // If challenges were removed from the game, we need to refresh the recent challenges list
    // to potentially show them again (only if they're still in localStorage)
    if (state.customChallenges.length < prevChallengesCount || state.customChallenges.length === 0 || deleteFromCurrentGame) {
      console.log('Challenges count changed, refreshing UI');
      
      // Reset the deleteFromCurrentGame flag after processing
      if (deleteFromCurrentGame) {
        // Use setTimeout to avoid state update during render
        setTimeout(() => {
          setDeleteFromCurrentGame(false);
        }, 0);
      }
      
      // Sync challenges with localStorage first
      syncChallengesWithLocalStorage();
      
      // Update recent challenges
      setRecentChallenges(getRecentChallenges());
    }
    
    // Update the previous count
    setPrevChallengesCount(state.customChallenges.length);
  }, [state.customChallenges, state.customChallenges.length, prevChallengesCount, deleteFromCurrentGame]);

  // Track standard challenges for updates
  const [prevStandardChallengesCount, setPrevStandardChallengesCount] = useState(state.challenges.length);
  
  // Monitor changes to the standard challenges array
  React.useEffect(() => {
    // Check if challenges were added
    if (state.challenges.length > prevStandardChallengesCount) {
      console.log('Standard challenges changed, refreshing UI');
      // Sync challenges with localStorage
      syncChallengesWithLocalStorage();
      
      // Update recent challenges
      setRecentChallenges(getRecentChallenges());
    }
    
    // Update the previous count
    setPrevStandardChallengesCount(state.challenges.length);
  }, [state.challenges.length, prevStandardChallengesCount]);

  // Load challenges on mount
  React.useEffect(() => {
    // Load challenges from localStorage initially
    const localChallenges = getRecentChallenges();
    setRecentChallenges(localChallenges);
    
    // Then load database challenges (only once on mount)
    loadChallengesFromDB();
  }, []); // Empty dependency array - only run on mount

  // Auto-save when duration type or value changes
  useEffect(() => {
    dispatch({
      type: "SET_GAME_DURATION",
      payload: {
        type: durationType,
        value: durationValue,
      },
    });
  }, [durationType, durationValue, dispatch]);

  // Helper function to get recent challenges from local storage
  const getRecentChallenges = (): Challenge[] => {
    try {
      const stored = localStorage.getItem(RECENT_CHALLENGES_KEY);
      if (!stored) return [];

      // Parse stored challenges
      const parsedChallenges = JSON.parse(stored);
      console.log(`getRecentChallenges: Found ${parsedChallenges.length} challenges in localStorage`);
      
      // Get the current challenges in the game for filtering
      const currentGameChallengeIds = state.customChallenges.map(c => c.id);
      const currentGameChallengeTitles = state.customChallenges.map(c => 
        c.title.toLowerCase()
      );
      
      // Construct updated challenges array
      const updatedChallenges: Challenge[] = [];
      
      // Process each challenge in localStorage
      for (const storedChallenge of parsedChallenges) {
        // Check if this challenge is currently in the game
        const isInGame = currentGameChallengeIds.includes(storedChallenge.id) || 
                        currentGameChallengeTitles.includes(storedChallenge.title.toLowerCase());
        
        // If challenge selection state is out of sync with game state, update it
        if (isInGame !== (storedChallenge.isSelected || false)) {
          console.log(`getRecentChallenges: Updating selection state for ${storedChallenge.title} to ${isInGame}`);
          updateRecentChallenges({
            ...storedChallenge,
            // Preserve prebuilt properties
            isPrebuilt: storedChallenge.isPrebuilt,
            prebuiltType: storedChallenge.prebuiltType,
            prebuiltSettings: storedChallenge.prebuiltSettings
          }, isInGame);
        }
        
        // Only add to return array if it's not in the current game
        if (!isInGame) {
          updatedChallenges.push({
            ...storedChallenge,
            // Preserve prebuilt properties
            isPrebuilt: storedChallenge.isPrebuilt,
            prebuiltType: storedChallenge.prebuiltType,
            prebuiltSettings: storedChallenge.prebuiltSettings
          });
        }
      }
      
      console.log(`getRecentChallenges: Returning ${updatedChallenges.length} challenges that are not in the current game`);
      return updatedChallenges;
    } catch (error) {
      console.error("Error reading recent challenges:", error);
      return [];
    }
  };

  /**
   * Load challenges from the database
   */
  const loadChallengesFromDB = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      setIsLoadingChallenges(true);
      const userId = getValidUserId();
      if (!userId) return;
      
      // Start loading challenges in the background immediately
      const challengesPromise = challengesService.getChallenges(userId);
      
      // Load local challenges while waiting for DB response
      const localChallenges = getRecentChallenges();
      
      // Wait for DB challenges to load
      const challenges = await challengesPromise;
      
      if (challenges && challenges.length > 0) {
        // Convert DB challenges to Challenge type
        const convertedChallenges: Challenge[] = challenges.map((dbChallenge: DBChallenge) => ({
          id: dbChallenge.id,
          title: dbChallenge.title,
          description: dbChallenge.description || "",
          type: dbChallenge.type as ChallengeType,
          canReuse: dbChallenge.can_reuse,
          maxReuseCount: dbChallenge.max_reuse_count || undefined,
          points: dbChallenge.points,
          createdBy: dbChallenge.user_id,
        }));
        
        // Store database challenges
        setDbChallenges(convertedChallenges);
        console.log(`Loaded ${convertedChallenges.length} challenges from database`);
        
        // Combine all challenges (database overrides local with same ID)
        const allChallenges = [...localChallenges];
        
        // Use a Map for faster ID-based lookups
        const existingChallengeMap = new Map(
          allChallenges.map(challenge => [challenge.id, challenge])
        );
        
        // Get a set of challenge IDs already in the game for faster lookups
        const gameChallengeTitlesLower = new Set(
          state.customChallenges.map(c => c.title.toLowerCase())
        );
        const gameChallengeIds = new Set(
          state.customChallenges.map(c => c.id)
        );
        
        // Process all DB challenges at once and collect new/updated challenges
        const updatedChallenges: Challenge[] = [];
        
        convertedChallenges.forEach(dbChallenge => {
          // Check if this challenge is already in the game
          const alreadyInGame = 
            gameChallengeIds.has(dbChallenge.id) || 
            gameChallengeTitlesLower.has(dbChallenge.title.toLowerCase());
          
          // Only add if not already in the game
          if (!alreadyInGame) {
            // Check if already in our collection (by ID)
            if (existingChallengeMap.has(dbChallenge.id)) {
              // Replace with database version
              existingChallengeMap.set(dbChallenge.id, dbChallenge);
            } else {
              // New challenge to add
              updatedChallenges.push(dbChallenge);
            }
          }
        });
        
        // Merge existing and new challenges
        const mergedChallenges = [
          ...Array.from(existingChallengeMap.values()),
          ...updatedChallenges
        ];
        
        // Update recent challenges
        setRecentChallenges(mergedChallenges);
      }
    } catch (error) {
      console.error("Error in loadChallengesFromDB:", error);
    } finally {
      setIsLoadingChallenges(false);
    }
  }, [isAuthenticated, getValidUserId, state.customChallenges]);

  /**
   * Synchronize the game state with localStorage.
   * This ensures that all challenges in the game are marked as selected in localStorage,
   * and all challenges not in the game are marked as unselected.
   */
  const syncChallengesWithLocalStorage = () => {
    try {
      // Get all challenges from localStorage
      const stored = localStorage.getItem(RECENT_CHALLENGES_KEY);
      if (!stored) return;
      
      const storedChallenges = JSON.parse(stored) as Challenge[];
      
      // Get IDs and lowercase titles of challenges in the current game
      const gameIds = state.customChallenges.map(c => c.id);
      const gameTitles = state.customChallenges.map(c => c.title.toLowerCase());
      
      // Update each challenge in localStorage with correct selection state
      const updatedChallenges = storedChallenges.map(challenge => {
        const isInGame = gameIds.includes(challenge.id) || 
                        gameTitles.includes((challenge.title || '').toLowerCase());
        
        // Only update if the selection state is different
        if (isInGame !== (challenge.isSelected || false)) {
          return {
            ...challenge,
            isSelected: isInGame,
            // Ensure prebuilt properties are preserved
            isPrebuilt: challenge.isPrebuilt,
            prebuiltType: challenge.prebuiltType,
            prebuiltSettings: challenge.prebuiltSettings
          };
        }
        
        // Return unchanged if selection state is already correct
        return challenge;
      });
      
      // Check for challenges in the game that might not be in localStorage yet
      // This can happen when adding a challenge directly without going through the recent list
      state.customChallenges.forEach(gameChallenge => {
        const existsInStorage = updatedChallenges.some(
          storedChallenge => 
            storedChallenge.id === gameChallenge.id || 
            storedChallenge.title.toLowerCase() === gameChallenge.title.toLowerCase()
        );
        
        // If it's not in localStorage, add it
        if (!existsInStorage) {
          // Make sure to preserve prebuilt properties
          const challengeToAdd = ensurePrebuiltPropertiesPreserved({
            ...gameChallenge,
            isSelected: true
          });
          
          updatedChallenges.push(challengeToAdd);
        }
      });
      
      // Save updated challenges back to localStorage
      localStorage.setItem(RECENT_CHALLENGES_KEY, JSON.stringify(updatedChallenges));
      
      console.log(`Synchronized ${updatedChallenges.length} challenges with localStorage`);
    } catch (error) {
      console.error("Error syncing challenges with localStorage:", error);
    }
  };

  // Add a recent challenge to current game
  const handleAddRecentChallenge = (challenge: Challenge) => {
    // Use the utility function to ensure prebuilt properties are preserved
    const preservedChallenge = ensurePrebuiltPropertiesPreserved(challenge);
    
    // Log prebuilt challenge details
    if (preservedChallenge.isPrebuilt) {
      console.log('Adding prebuilt challenge from recent challenges:', {
        id: preservedChallenge.id,
        title: preservedChallenge.title,
        isPrebuilt: preservedChallenge.isPrebuilt,
        prebuiltType: preservedChallenge.prebuiltType,
        hasPrebuiltSettings: !!preservedChallenge.prebuiltSettings
      });
    }
    
    // First update recent challenges list in localStorage - mark as selected
    updateRecentChallenges(preservedChallenge, true);
    
    // Add the challenge to the game's custom challenges
    dispatch({
      type: "ADD_CUSTOM_CHALLENGE",
      payload: preservedChallenge,
    });
    
    // Manually update the recent challenges state to filter out the one just added
    setRecentChallenges(prevRecentChallenges => 
      prevRecentChallenges.filter(recentChallenge => 
        recentChallenge.id !== preservedChallenge.id && 
        recentChallenge.title.toLowerCase() !== preservedChallenge.title.toLowerCase()
      )
    );
  };

  /**
   * Delete a recent challenge
   * @param challengeId The ID of the challenge to delete
   */
  const handleDeleteRecentChallenge = async (challengeId: string) => {
    console.log("Deleting recent challenge with ID:", challengeId);
    
    // Get recent challenges from localStorage
    const storedChallenges = localStorage.getItem(RECENT_CHALLENGES_KEY);
    if (!storedChallenges) return;
    
    // Parse stored challenges
    const challenges = JSON.parse(storedChallenges) as Challenge[];
    
    // Find the challenge to delete for logging
    const challengeToDelete = challenges.find(c => c.id === challengeId);
    console.log("Challenge to delete:", challengeToDelete);
    
    // Find and delete the challenge with the given ID
    const updatedChallenges = challenges.filter((c) => c.id !== challengeId);
    
    // Update localStorage
    localStorage.setItem(RECENT_CHALLENGES_KEY, JSON.stringify(updatedChallenges));
    
    // Update state
    setRecentChallenges(updatedChallenges);
    
    // Also delete from database if authenticated
    if (isAuthenticated) {
      console.log("Deleting challenge from Supabase DB with ID:", challengeId);
      try {
        const result = await challengesService.deleteChallenge(challengeId);
        if (result) {
          console.log(`Challenge ${challengeId} deleted from database`);
          // Refresh database challenges
          loadChallengesFromDB();
        } else {
          console.error(`Failed to delete challenge ${challengeId} from database`);
        }
      } catch (error) {
        console.error("Error deleting challenge from database:", error);
      }
    } else {
      console.log("Not deleting from Supabase - not authenticated");
    }
  };

  // Initiate challenge deletion (shows confirmation modal)
  const initiateDeleteChallenge = (challenge: Challenge, fromCurrentGame = false) => {
    setChallengeToDelete(challenge);
    setDeleteFromCurrentGame(fromCurrentGame);
    setShowDeleteConfirm(true);
  };
  
  /**
   * Handle cancel delete of a challenge
   */
  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setChallengeToDelete(null);
    setDeleteFromCurrentGame(false);
  };

  /**
   * Handle confirm delete of a challenge
   */
  const handleConfirmDelete = async () => {
    if (!challengeToDelete) return;
    
    // Check if we're deleting all recent challenges
    if (challengeToDelete.id === 'all') {
      await handleDeleteAllRecentChallenges();
    } 
    // Check if we're deleting from current game challenges
    else if (deleteFromCurrentGame) {
      // First update the challenge in localStorage to mark as unselected
      // Get the challenge from localStorage first
      try {
        const stored = localStorage.getItem(RECENT_CHALLENGES_KEY);
        if (stored) {
          const challenges = JSON.parse(stored);
          const storedChallenge = challenges.find((c: Challenge) => 
            c.id === challengeToDelete.id || 
            c.title.toLowerCase() === challengeToDelete.title.toLowerCase()
          );
          
          if (storedChallenge) {
            // Update in localStorage - mark as unselected
            updateRecentChallenges({
              ...storedChallenge,
              isPrebuilt: storedChallenge.isPrebuilt,
              prebuiltType: storedChallenge.prebuiltType,
              prebuiltSettings: storedChallenge.prebuiltSettings
            }, false);
          }
        }
      } catch (error) {
        console.error("Error updating localStorage during delete:", error);
      }
      
      // Remove from current game
      dispatch({
        type: "REMOVE_CUSTOM_CHALLENGE",
        payload: challengeToDelete.id
      });
      
      // Refresh recent challenges after deletion
      // This will happen through the effect that watches for deleteFromCurrentGame
    } 
    // Otherwise, delete from recent challenges
    else {
      await handleDeleteRecentChallenge(challengeToDelete.id);
    }
    
    // Clear the modal
    setShowDeleteConfirm(false);
    setChallengeToDelete(null);
    // Don't reset deleteFromCurrentGame here as the effect needs it to know to refresh
  };

  /**
   * Delete all recent challenges
   */
  const handleDeleteAllRecentChallenges = async () => {
    try {
      // Get the current list of recent challenges before clearing
      const currentRecentChallenges = [...recentChallenges];
      
      // Clear from localStorage
      localStorage.removeItem(RECENT_CHALLENGES_KEY);
      setRecentChallenges([]);
      
      // Also delete from database if authenticated, but only the ones in the recent list
      if (isAuthenticated) {
        const userId = getValidUserId();
        if (!userId) return;
        
        // Get the IDs of recent challenges
        const recentChallengeIds = currentRecentChallenges.map(challenge => challenge.id);
        
        // Only delete challenges that are in the recent list
        if (recentChallengeIds.length > 0) {
          console.log(`Deleting ${recentChallengeIds.length} recent challenges from database`);
          
          const deletionPromises = recentChallengeIds.map(challengeId => 
            challengesService.deleteChallenge(challengeId)
          );
          
          await Promise.all(deletionPromises);
          console.log(`Deleted ${recentChallengeIds.length} recent challenges from database`);
          
          // Update dbChallenges state by removing the deleted challenges
          setDbChallenges(prev => prev.filter(challenge => !recentChallengeIds.includes(challenge.id)));
        }
      }
    } catch (error) {
      console.error("Error deleting all recent challenges:", error);
    }
  };

  /**
   * Initiate deletion of all recent challenges (with confirmation)
   */
  const initiateDeleteAllRecentChallenges = () => {
    // Create a dummy challenge to represent all recent challenges
    const allChallenges: Challenge = {
      id: "all",
      title: t("game.allRecentChallenges"),
      description: "",
      type: ChallengeType.INDIVIDUAL,
      canReuse: true,
      points: 0
    };
    
    // Set up the confirmation modal
    setChallengeToDelete(allChallenges);
    setDeleteFromCurrentGame(false);
    setShowDeleteConfirm(true);
  };

  // Helper to open the appropriate edit form based on challenge type
  const openEditForm = (challenge: Challenge) => {
    // Use utility function to ensure prebuilt properties are preserved
    const preservedChallenge = ensurePrebuiltPropertiesPreserved(challenge);
    
    // Set the challenge being edited
    setEditingChallenge(preservedChallenge);
    
    // Log the challenge properties to help with debugging
    console.log('Opening edit form for challenge:', {
      id: preservedChallenge.id,
      title: preservedChallenge.title,
      isPrebuilt: preservedChallenge.isPrebuilt,
      prebuiltType: preservedChallenge.prebuiltType,
      hasPrebuiltSettings: !!preservedChallenge.prebuiltSettings
    });
    
    // Make sure to close any other open forms first
    setShowCustomChallengeForm(false);
    setShowSpotifyMusicQuizForm(false);
    setShowQuizForm(false);
    
    // Use our utility function to determine if it's a prebuilt challenge
    if (isPrebuiltChallenge(preservedChallenge)) {
      console.log(`Opening edit form for prebuilt challenge type: ${preservedChallenge.prebuiltType}`);
      
      // Open the appropriate form based on the prebuilt type
      if (isPrebuiltChallenge(preservedChallenge, PrebuiltChallengeType.SPOTIFY_MUSIC_QUIZ)) {
        console.log('Opening Spotify Music Quiz Form');
        setShowSpotifyMusicQuizForm(true);
      } 
      else if (isPrebuiltChallenge(preservedChallenge, PrebuiltChallengeType.QUIZ)) {
        console.log('Opening Quiz Form');
        setShowQuizForm(true);
      }
      else {
        // Fallback to custom challenge form for unknown prebuilt types
        console.log('Unknown prebuilt type, falling back to Custom Challenge Form');
        setShowCustomChallengeForm(true);
      }
    } else {
      // Regular custom challenge
      console.log('Opening Custom Challenge Form for regular challenge');
      setShowCustomChallengeForm(true);
    }
    
    // Add to recent challenges when edited and mark as selected
    updateRecentChallenges(preservedChallenge, true);
  };

  // Handle challenge updated from prebuilt forms
  const handleChallengeUpdated = (updatedChallenge: Challenge) => {
    // Log updated challenge
    console.log('Handling updated challenge:', {
      id: updatedChallenge.id,
      title: updatedChallenge.title,
      isPrebuilt: updatedChallenge.isPrebuilt,
      hasPrebuiltType: !!updatedChallenge.prebuiltType,
      prebuiltType: updatedChallenge.prebuiltType,
      hasPrebuiltSettings: !!updatedChallenge.prebuiltSettings
    });
    
    if (updatedChallenge.isPrebuilt) {
      console.log('Handling updated prebuilt challenge:', {
        id: updatedChallenge.id,
        title: updatedChallenge.title,
        isPrebuilt: updatedChallenge.isPrebuilt,
        prebuiltType: updatedChallenge.prebuiltType,
        hasPrebuiltSettings: !!updatedChallenge.prebuiltSettings
      });
      
      // Log more detailed info based on the type
      if (updatedChallenge.prebuiltType === PrebuiltChallengeType.QUIZ && updatedChallenge.prebuiltSettings) {
        const quizSettings = updatedChallenge.prebuiltSettings as QuizSettings;
        console.log('Updated Quiz challenge details:', {
          questionCount: quizSettings.questions?.length || 0
        });
      } else if (updatedChallenge.prebuiltType === PrebuiltChallengeType.SPOTIFY_MUSIC_QUIZ && updatedChallenge.prebuiltSettings) {
        const spotifySettings = updatedChallenge.prebuiltSettings as SpotifyMusicQuizSettings;
        console.log('Updated Spotify Quiz challenge details:', {
          playlistName: spotifySettings.playlistName || 'unnamed playlist',
          songCount: spotifySettings.numberOfSongs || 0
        });
      }
    }
    
    // Ensure prebuilt properties are preserved
    const challengeToUpdate = {
      ...updatedChallenge,
      // Explicitly preserve prebuilt properties
      isPrebuilt: updatedChallenge.isPrebuilt === true, // Convert to boolean
      prebuiltType: updatedChallenge.prebuiltType,
      prebuiltSettings: updatedChallenge.prebuiltSettings,
    };
    
    // Update in localStorage as selected
    updateRecentChallenges(challengeToUpdate, true);
    
    // For new challenges, add to standard challenges pool first
    if (!editingChallenge) {
      dispatch({
        type: "ADD_STANDARD_CHALLENGE",
        payload: challengeToUpdate,
      });
      
      // Also add to the current game's custom challenges
      dispatch({
        type: "ADD_CUSTOM_CHALLENGE",
        payload: challengeToUpdate,
      });
    } else {
      // Update in the game state for existing challenges
      dispatch({
        type: "UPDATE_CUSTOM_CHALLENGE",
        payload: challengeToUpdate,
      });
    }

    // Close all forms
    setShowCustomChallengeForm(false);
    setShowSpotifyMusicQuizForm(false);
    setShowQuizForm(false);
    setEditingChallenge(undefined);
    
    // Refresh recent challenges to reflect changes
    syncChallengesWithLocalStorage();
    setRecentChallenges(getRecentChallenges());
  };

  // Function to initiate deleting a challenge from the current game
  const initiateDeleteCurrentGameChallenge = (challenge: Challenge) => {
    initiateDeleteChallenge(challenge, true);
  };

  // Function to add a standard challenge to the game
  const handleAddStandardChallenge = (challenge: Challenge) => {
    // Use the utility function to ensure prebuilt properties are preserved
    const preservedChallenge = ensurePrebuiltPropertiesPreserved(challenge);
    
    // Log if this is a prebuilt challenge
    if (preservedChallenge.isPrebuilt) {
      console.log('Adding prebuilt standard challenge to game:', {
        id: preservedChallenge.id,
        title: preservedChallenge.title,
        isPrebuilt: preservedChallenge.isPrebuilt,
        prebuiltType: preservedChallenge.prebuiltType,
        hasSettings: !!preservedChallenge.prebuiltSettings
      });
    }
    
    // Add to the challenges array in state
    dispatch({
      type: "ADD_STANDARD_CHALLENGE",
      payload: preservedChallenge
    });
  };

  /**
   * Remove a challenge directly from the current game and update recent challenges
   * This is for the direct "delete" button click without showing the confirmation dialog
   */
  const handleDirectRemoveChallenge = (challenge: Challenge) => {
    // Get the challenge from the game
    const gameChallenge = state.customChallenges.find(c => c.id === challenge.id);
    
    if (gameChallenge) {
      console.log(`Removing challenge from game: ${challenge.id} - ${challenge.title}`);
      
      // Track this challenge as recently removed for animation
      setRecentlyRemovedChallenge(challenge.id);
      
      // Clear the animation tracking after animation completes
      setTimeout(() => {
        setRecentlyRemovedChallenge(null);
      }, 800); // Slightly longer than the animation duration
      
      // Create a preserved copy of the challenge to add to recent challenges
      const challengeCopy = ensurePrebuiltPropertiesPreserved({
        ...gameChallenge,
        isSelected: false
      });
      
      // First, update the challenge in localStorage to mark as unselected
      updateRecentChallenges(challengeCopy, false);
      
      // Then remove it from the game
      dispatch({
        type: "REMOVE_CUSTOM_CHALLENGE",
        payload: challenge.id
      });
      
      // Force immediate synchronization with localStorage
      syncChallengesWithLocalStorage();
      
      // Add the challenge directly to the recentChallenges state
      setRecentChallenges(prevChallenges => {
        // Check if it already exists in the list
        const exists = prevChallenges.some(
          c => c.id === challengeCopy.id || 
               c.title.toLowerCase() === challengeCopy.title.toLowerCase()
        );
        
        // If it already exists, don't add it again
        if (exists) {
          console.log(`Challenge ${challengeCopy.title} already exists in recent challenges, not adding again`);
          return prevChallenges;
        }
        
        console.log(`Adding challenge ${challengeCopy.title} to recent challenges list`);
        return [challengeCopy, ...prevChallenges];
      });
    } else {
      console.error('Failed to find challenge in game:', challenge.id);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white text-center">
        {t("setup.gameSettings")}
      </h2>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
        {/* Game Duration */}
        <div className="mb-8">
          <h3 className="text-lg font-medium mb-4 text-gray-700 dark:text-gray-300">
            {t("setup.gameDuration")}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
            {/* Duration Type */}
            <div>
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <button
                  className={`
                    flex-1 py-2 px-4 rounded-md transition-colors font-medium
                    ${
                      durationType === "challenges"
                        ? "bg-game-secondary text-white"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                    }
                  `}
                  onClick={() => setDurationType("challenges")}
                >
                  {t("setup.byChallenges")}
                </button>

                <button
                  className={`
                    flex-1 py-2 px-4 rounded-md transition-colors font-medium
                    ${
                      durationType === "time"
                        ? "bg-game-secondary text-white"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                    }
                  `}
                  onClick={() => setDurationType("time")}
                >
                  {t("setup.byTime")}
                </button>
              </div>

              {durationType === "challenges" ? (
                <div>
                  <label
                    htmlFor="challengeCount"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    {t("setup.numberOfChallenges")}
                  </label>
                  
                  <div className="mb-4">
                    <div className="flex flex-col sm:flex-row gap-4 items-center">
                      <input
                        type="range"
                        id="challengeCountSlider"
                        min="1"
                        max="50"
                        step="1"
                        value={durationValue}
                        onChange={(e) => setDurationValue(parseInt(e.target.value))}
                        className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-200 dark:bg-gray-700 accent-game-primary"
                      />
                      <div className="relative w-full sm:w-20 flex-shrink-0 mt-4 sm:mt-0">
                        <input
                          id="challengeCount"
                          type="number"
                          min="1"
                          value={durationValue}
                          onChange={(e) => setDurationValue(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full py-2 px-3 text-center rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-game-primary focus:ring focus:ring-game-primary focus:ring-opacity-50 dark:bg-gray-700 dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex flex-wrap gap-2 justify-center sm:justify-start">
                    <button
                      type="button"
                      onClick={() => setDurationValue(5)}
                      className={`rounded-full py-1 px-3 text-xs font-medium ${
                        durationValue === 5 
                          ? 'bg-game-secondary text-white' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      5
                    </button>
                    <button
                      type="button"
                      onClick={() => setDurationValue(10)}
                      className={`rounded-full py-1 px-3 text-xs font-medium ${
                        durationValue === 10 
                          ? 'bg-game-secondary text-white' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      10
                    </button>
                    <button
                      type="button"
                      onClick={() => setDurationValue(15)}
                      className={`rounded-full py-1 px-3 text-xs font-medium ${
                        durationValue === 15 
                          ? 'bg-game-secondary text-white' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      15
                    </button>
                    <button
                      type="button"
                      onClick={() => setDurationValue(20)}
                      className={`rounded-full py-1 px-3 text-xs font-medium ${
                        durationValue === 20 
                          ? 'bg-game-secondary text-white' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      20
                    </button>
                    <button
                      type="button"
                      onClick={() => setDurationValue(30)}
                      className={`rounded-full py-1 px-3 text-xs font-medium ${
                        durationValue === 30 
                          ? 'bg-game-secondary text-white' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      30
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <label
                    htmlFor="timeLimit"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    {t("setup.timeLimit")} ({t("setup.minutes")})
                  </label>
                  
                  <div className="mb-4">
                    <div className="flex flex-col sm:flex-row gap-4 items-center">
                      <input
                        type="range"
                        id="timeLimitSlider"
                        min="1"
                        max="180"
                        step="1"
                        value={durationValue}
                        onChange={(e) => setDurationValue(parseInt(e.target.value))}
                        className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-200 dark:bg-gray-700 accent-game-primary"
                      />
                      <div className="relative w-full sm:w-20 flex-shrink-0 mt-4 sm:mt-0">
                        <input
                          id="timeLimit"
                          type="number"
                          min="1"
                          value={durationValue}
                          onChange={(e) => setDurationValue(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full py-2 px-3 text-center rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-game-primary focus:ring focus:ring-game-primary focus:ring-opacity-50 dark:bg-gray-700 dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex flex-wrap gap-2 justify-center sm:justify-start">
                    <button
                      type="button"
                      onClick={() => setDurationValue(15)}
                      className={`rounded-full py-1 px-3 text-xs font-medium ${
                        durationValue === 15 
                          ? 'bg-game-secondary text-white' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      15
                    </button>
                    <button
                      type="button"
                      onClick={() => setDurationValue(30)}
                      className={`rounded-full py-1 px-3 text-xs font-medium ${
                        durationValue === 30 
                          ? 'bg-game-secondary text-white' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      30
                    </button>
                    <button
                      type="button"
                      onClick={() => setDurationValue(45)}
                      className={`rounded-full py-1 px-3 text-xs font-medium ${
                        durationValue === 45 
                          ? 'bg-game-secondary text-white' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      45
                    </button>
                    <button
                      type="button"
                      onClick={() => setDurationValue(60)}
                      className={`rounded-full py-1 px-3 text-xs font-medium ${
                        durationValue === 60 
                          ? 'bg-game-secondary text-white' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      60
                    </button>
                    <button
                      type="button"
                      onClick={() => setDurationValue(90)}
                      className={`rounded-full py-1 px-3 text-xs font-medium ${
                        durationValue === 90 
                          ? 'bg-game-secondary text-white' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      90
                    </button>
                    <button
                      type="button"
                      onClick={() => setDurationValue(120)}
                      className={`rounded-full py-1 px-3 text-xs font-medium ${
                        durationValue === 120 
                          ? 'bg-game-secondary text-white' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      120
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Prebuilt Challenges Section */}
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-100 dark:border-gray-700">
          <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              {t("prebuilt.prebuiltChallenges")}
            </h3>
          </div>
          
          <PrebuiltChallengeMenu
            onChallengeCreated={(challenge) => {
              console.log("GameSettings: PrebuiltChallengeMenu created a challenge:", challenge);
              
              // Ensure prebuilt properties are preserved
              const preservedChallenge = ensurePrebuiltPropertiesPreserved(challenge);
              
              // Add to standard challenges pool
              dispatch({
                type: "ADD_STANDARD_CHALLENGE",
                payload: preservedChallenge
              });
              
              // Also add to current game's custom challenges (selected list)
              dispatch({
                type: "ADD_CUSTOM_CHALLENGE",
                payload: preservedChallenge
              });
              
              // Also add to recent challenges, but mark as selected
              console.log("GameSettings: Adding challenge to recent challenges");
              updateRecentChallenges(preservedChallenge, true);
              console.log("GameSettings: Challenge handling complete");
            }}
          />
        </div>

        {/* Custom Challenges Section */}
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-100 dark:border-gray-700">
          <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              {t("challenges.customChallenges")}
            </h3>
          </div>

          {/* Custom Challenges List */}
          <div className="mb-6">
            {state.customChallenges.length > 0 ? (
              <div className="space-y-4">
                <AnimatePresence>
                {state.customChallenges.map((challenge) => (
                  <motion.div
                    key={challenge.id}
                    className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600 group"
                    layoutId={`challenge-${challenge.id}`}
                    initial={{ opacity: 1, scale: 1 }}
                    exit={{
                      opacity: 0,
                      scale: 0.8,
                      x: 300,
                      transition: { duration: 0.3 }
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-800 dark:text-white">
                          {challenge.title}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                          {challenge.description}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-game-secondary/10 text-game-secondary">
                            {challenge.type === "individual"
                              ? t("game.challengeTypes.individual")
                              : challenge.type === "oneOnOne"
                              ? t("game.challengeTypes.oneOnOne")
                              : challenge.type === "allVsAll"
                              ? t("game.challengeTypes.allVsAll")
                              : t("game.challengeTypes.team")}
                          </span>
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-game-accent/10 text-game-accent">
                            {challenge.points}{" "}
                            {challenge.points === 1
                              ? t("common.point")
                              : t("common.points")}
                          </span>
                          {challenge.category && (
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300">
                              {challenge.category}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditForm(challenge)}
                          className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 p-1"
                          title={t("common.edit")}
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDirectRemoveChallenge(challenge)}
                          className="text-amber-500 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300 p-1"
                          title={t("challenges.removeFromGame")}
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            initiateDeleteChallenge(challenge);
                          }}
                          className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          title={t("challenges.deletePermanently")}
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-8 border border-dashed border-gray-300 dark:border-gray-600 text-center">
                <svg 
                  className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={1.5} 
                    d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                  />
                </svg>
                <h4 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t("challenges.noChallenges")}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                  {t("challenges.createCustomChallengesDesc")}
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-center mt-6">
            <Button
              variant="primary"
              size="lg"
              onClick={() => {
                setEditingChallenge(undefined);
                setShowCustomChallengeForm(true);
              }}
              leftIcon={
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              }
            >
              {t("challenges.createCustomChallenge")}
            </Button>
          </div>
        </div>

        {/* Recent Custom Challenges */}
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              {t("challenges.recentCustomChallenges")}
            </h3>
            {recentChallenges.length > 0 && (
              <button
                onClick={initiateDeleteAllRecentChallenges}
                className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium flex items-center gap-1 px-3 py-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                title={t("challenges.deleteAllRecent")}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                {t("challenges.clearAllRecent")}
              </button>
            )}
          </div>

          <div className="mt-6">
            {isLoadingChallenges && (
              <div className="flex justify-center items-center p-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2"></div>
                <span className="ml-4 text-gray-900 dark:text-gray-100">{t("common.loading")}</span>
              </div>
            )}
            
            {!isLoadingChallenges && recentChallenges.length === 0 && (
              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-8 border border-dashed border-gray-300 dark:border-gray-600 text-center">
                <svg 
                  className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={1.5} 
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h4 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t("challenges.noRecentChallenges")}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                  {t("challenges.recentChallengesDesc")}
                </p>
              </div>
            )}
            
            {!isLoadingChallenges && recentChallenges.length > 0 && (
              <div className="space-y-3">
                <AnimatePresence>
                {recentChallenges.map((challenge) => (
                  <motion.div
                    key={challenge.id}
                    className={`bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg p-3 border ${
                      recentlyRemovedChallenge === challenge.id 
                        ? 'border-game-accent border-2' 
                        : 'border-gray-200 dark:border-gray-600'
                    } transition-colors relative group`}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    layoutId={`challenge-${challenge.id}`}
                    initial={recentlyRemovedChallenge === challenge.id ? { 
                      opacity: 0, 
                      scale: 0.8,
                      x: -300
                    } : { opacity: 1, scale: 1 }}
                    animate={recentlyRemovedChallenge === challenge.id ? {
                      opacity: 1,
                      scale: [1, 1.05, 1],
                      x: 0,
                      boxShadow: [
                        '0 0 0 rgba(0, 0, 0, 0)',
                        '0 0 8px rgba(234, 88, 12, 0.5)',
                        '0 0 0 rgba(0, 0, 0, 0)',
                      ],
                      transition: {
                        duration: 0.6,
                        ease: "easeInOut"
                      }
                    } : { 
                      opacity: 1, 
                      scale: 1, 
                      x: 0, 
                      transition: { 
                        type: "spring", 
                        stiffness: 500, 
                        damping: 30 
                      } 
                    }}
                  >
                    <div
                      onClick={() => handleAddRecentChallenge(challenge)}
                      className="cursor-pointer"
                    >
                      <h4 className="font-medium text-gray-800 dark:text-white pr-8">
                        {challenge.title}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-1">
                        {challenge.description}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-game-secondary/10 text-game-secondary">
                          {challenge.type === "individual"
                            ? t("game.challengeTypes.individual")
                            : challenge.type === "oneOnOne"
                            ? t("game.challengeTypes.oneOnOne")
                            : challenge.type === "allVsAll"
                            ? t("game.challengeTypes.allVsAll")
                            : t("game.challengeTypes.team")}
                        </span>
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-game-accent/10 text-game-accent">
                          {challenge.points}{" "}
                          {challenge.points === 1
                            ? t("common.point")
                            : t("common.points")}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        initiateDeleteChallenge(challenge);
                      }}
                      className="absolute top-3 right-3 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      title={t("challenges.deletePermanently")}
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </motion.div>
                ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Custom Challenge Form Modal */}
      <CustomChallengeForm
        isOpen={showCustomChallengeForm}
        onClose={() => {
          setShowCustomChallengeForm(false);
          setEditingChallenge(undefined);
          setRecentChallenges(getRecentChallenges());
        }}
        editChallenge={editingChallenge}
        onChallengeCreated={(challenge) => {
          console.log("GameSettings: CustomChallengeForm created a challenge:", challenge);
          
          // Ensure prebuilt properties are preserved
          const preservedChallenge = ensurePrebuiltPropertiesPreserved(challenge);
          
          // If not already in the custom challenges list (for new challenges), 
          // update the localStorage as selected and add to the game
          if (!editingChallenge) {
            console.log("GameSettings: Adding new challenge to game:", preservedChallenge.title);
            
            // Mark as selected in localStorage
            updateRecentChallenges(preservedChallenge, true);
            
            // For brand new challenges, we need to explicitly add them to the game state
            // since the dispatch in CustomChallengeForm might not be reflected in this component
            dispatch({
              type: "ADD_CUSTOM_CHALLENGE",
              payload: preservedChallenge
            });
          }
          
          // Refresh recent challenges list to reflect changes
          setRecentChallenges(getRecentChallenges());
        }}
      />

      {/* Spotify Music Quiz Form Modal */}
      {showSpotifyMusicQuizForm && (
        <SpotifyMusicQuizForm
          isOpen={showSpotifyMusicQuizForm}
          onClose={() => {
            setShowSpotifyMusicQuizForm(false);
            setEditingChallenge(undefined);
            setRecentChallenges(getRecentChallenges());
          }}
          onChallengeCreated={handleChallengeUpdated}
          editChallenge={editingChallenge}
        />
      )}

      {/* Add the Quiz Form */}
      {showQuizForm && (
        <QuizForm
          isOpen={showQuizForm}
          onClose={() => {
            setShowQuizForm(false);
            setEditingChallenge(undefined);
            setRecentChallenges(getRecentChallenges());
          }}
          onChallengeCreated={handleChallengeUpdated}
          editChallenge={editingChallenge}
        />
      )}

      {/* Challenge delete confirmation modal */}
      {showDeleteConfirm && challengeToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-lg">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
              {t("common.confirmDelete")}
            </h3>
            <p className="mb-6 text-gray-900 dark:text-gray-300">
              {t("game.confirmDeleteChallenge", { item: challengeToDelete.title })}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancelDelete}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md"
              >
                {t("common.delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameSettings;
