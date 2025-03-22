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
  
  // For Quiz challenges that are missing prebuiltSettings, create default settings
  if (challengeWithPreservedProps.prebuiltType === PrebuiltChallengeType.QUIZ && 
      !challengeWithPreservedProps.prebuiltSettings) {
    console.log('Creating default prebuiltSettings for Quiz challenge');
    challengeWithPreservedProps.prebuiltSettings = {
      questions: [],
      currentQuestionIndex: 0
    } as QuizSettings;
  }
  
  // For Spotify Music Quiz challenges that are missing prebuiltSettings, create default settings
  if (challengeWithPreservedProps.prebuiltType === PrebuiltChallengeType.SPOTIFY_MUSIC_QUIZ && 
      !challengeWithPreservedProps.prebuiltSettings) {
    console.log('Creating default prebuiltSettings for Spotify Music Quiz challenge');
    challengeWithPreservedProps.prebuiltSettings = {
      playlistUrl: '',
      playlistName: '',
      numberOfSongs: 5,
      playDurationSeconds: 10,
      songs: []
    } as SpotifyMusicQuizSettings;
  }
  
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

// Helper function to check if a challenge is in the current game
const isChallengeInGame = (challenge: Challenge, currentChallenges: Challenge[]): boolean => {
  if (!challenge || !currentChallenges || currentChallenges.length === 0) {
    return false;
  }
  
  // Check by ID first (most reliable)
  if (challenge.id && currentChallenges.some(c => c.id === challenge.id)) {
    return true;
  }
  
  // Then check by title (case insensitive)
  if (challenge.title && currentChallenges.some(c => 
    c.title && c.title.toLowerCase() === challenge.title.toLowerCase()
  )) {
    return true;
  }
  
  return false;
};

// Helper to get a unique identifier for a challenge, considering both ID and title
const getChallengeUniqueIdentifier = (challenge: Challenge): string => {
  if (!challenge) return '';
  return `${challenge.id || ''}-${(challenge.title || '').toLowerCase()}`;
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

  // Add an effect to refresh the recent challenges whenever relevant state changes
  React.useEffect(() => {
    // Reset the deleteFromCurrentGame flag if it's set
    if (deleteFromCurrentGame) {
      // Use setTimeout to avoid state update during render
      setTimeout(() => {
        setDeleteFromCurrentGame(false);
      }, 0);
      return; // Don't perform other updates when we're deleting
    }

    // Don't run this effect during initial mount - the other useEffect handles that
    if (prevChallengesCount === 0 && state.customChallenges.length === 0) {
      return;
    }

    // Only refresh if the customChallenges count has changed, which indicates
    // something was added or removed, or if challenges list changed
    const challengesChanged = prevChallengesCount !== state.customChallenges.length;
    const standardChallengesChanged = prevStandardChallengesCount !== state.challenges.length;
    
    if (challengesChanged || standardChallengesChanged) {
      console.log('Challenges changed - refreshing recent challenges list');
      
      // Sync localStorage first to ensure it's up to date
      syncChallengesWithLocalStorage();
      
      // Then get fresh recent challenges
      const freshRecentChallenges = getRecentChallenges();
      
      console.log(`Setting recent challenges to ${freshRecentChallenges.length} challenges after game state change`);
      
      // Update the state in a single update
      setRecentChallenges(freshRecentChallenges);
      
      // Update the previous counts
      setPrevChallengesCount(state.customChallenges.length);
      setPrevStandardChallengesCount(state.challenges.length);
    }
  }, [
    state.customChallenges.length, 
    state.challenges.length,
    deleteFromCurrentGame,
    prevChallengesCount,
    prevStandardChallengesCount
  ]);

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
      const currentGameChallenges = state.customChallenges;
      console.log(`getRecentChallenges: Current game has ${currentGameChallenges.length} challenges`);
      
      // Create a map of game challenge IDs and titles for faster lookups
      const gameChallengeLookup = new Map();
      currentGameChallenges.forEach(gc => {
        if (gc.id) gameChallengeLookup.set(gc.id, true);
        if (gc.title) gameChallengeLookup.set(gc.title.toLowerCase(), true);
      });
      
      // Construct updated challenges array - only including challenges NOT in the current game
      const updatedChallenges: Challenge[] = [];
      
      // Process each challenge in localStorage
      for (const storedChallenge of parsedChallenges) {
        // Debug logging for prebuilt challenges
        if (storedChallenge.isPrebuilt) {
          console.log(`getRecentChallenges: Found prebuilt challenge "${storedChallenge.title}" with type: ${storedChallenge.prebuiltType}`);
        }
        
        // Check if this challenge is currently in the game using our lookup map
        // This is faster than calling isChallengeInGame for each challenge
        const isInGame = 
          (storedChallenge.id && gameChallengeLookup.has(storedChallenge.id)) ||
          (storedChallenge.title && gameChallengeLookup.has(storedChallenge.title.toLowerCase()));
        
        // If challenge selection state is out of sync with game state, update it in localStorage
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
        } else {
          console.log(`getRecentChallenges: Skipping challenge "${storedChallenge.title}" because it's already in the game`);
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
      
      // Check if we have saved selection states from Setup.tsx
      let savedSelectionStates: {id: string, isSelected: boolean}[] = [];
      try {
        const savedSelectionData = localStorage.getItem('selectedCustomChallengeIds');
        if (savedSelectionData) {
          savedSelectionStates = JSON.parse(savedSelectionData);
          console.log(`Found ${savedSelectionStates.length} saved challenge selection states`);
          // Clear it after reading to avoid reusing old data
          localStorage.removeItem('selectedCustomChallengeIds');
        }
      } catch (err) {
        console.error("Error reading saved challenge selection states:", err);
      }
      
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
          // Add prebuilt properties
          isPrebuilt: dbChallenge.is_prebuilt || false,
          prebuiltType: dbChallenge.prebuilt_type || undefined,
          prebuiltSettings: dbChallenge.prebuilt_settings || undefined,
          punishment: dbChallenge.punishment || undefined
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
        
        // Get the current challenges in the game for filtering
        const currentGameChallenges = state.customChallenges;
        
        // Process all DB challenges at once and collect new/updated challenges
        const updatedChallenges: Challenge[] = [];
        
        convertedChallenges.forEach(dbChallenge => {
          // Check if this challenge is already in the game
          let isInGame = isChallengeInGame(dbChallenge, currentGameChallenges);
          
          // Apply saved selection state if available
          const savedSelectionState = savedSelectionStates.find(s => s.id === dbChallenge.id);
          if (savedSelectionState && savedSelectionState.isSelected && !isInGame) {
            console.log(`Restoring selection state for challenge: ${dbChallenge.title}`);
            
            // Add to game (dispatch ADD_CUSTOM_CHALLENGE)
            const challengeToAdd = ensurePrebuiltPropertiesPreserved({
              ...dbChallenge,
              isSelected: true
            });
            
            dispatch({
              type: 'ADD_CUSTOM_CHALLENGE',
              payload: challengeToAdd
            });
            
            // Mark as already in game to prevent adding to updatedChallenges
            // which would make it available in "recent challenges" list
            isInGame = true;
          }
          
          // Only add if not already in the game
          if (!isInGame) {
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
        
        // Update recent challenges - make sure to filter out any that might be in the game
        setRecentChallenges(mergedChallenges.filter(challenge => 
          !isChallengeInGame(challenge, currentGameChallenges)
        ));
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
      console.log(`syncChallengesWithLocalStorage: Processing ${storedChallenges.length} stored challenges`);
      
      // Get the current challenges in the game for comparison
      const currentGameChallenges = state.customChallenges;
      console.log(`syncChallengesWithLocalStorage: Current game has ${currentGameChallenges.length} challenges`);
      
      // Create a map for faster lookups
      const gameChallengeLookup = new Map();
      currentGameChallenges.forEach(gc => {
        if (gc.id) gameChallengeLookup.set(gc.id, true);
        if (gc.title) gameChallengeLookup.set(gc.title.toLowerCase(), true);
      });
      
      // Count how many challenges are updated
      let updatedCount = 0;
      
      // Update each challenge in localStorage with correct selection state
      const updatedChallenges = storedChallenges.map(challenge => {
        // Check if this challenge is currently in the game
        const isInGame = 
          (challenge.id && gameChallengeLookup.has(challenge.id)) ||
          (challenge.title && gameChallengeLookup.has(challenge.title.toLowerCase()));
        
        // Only update if the selection state is different
        if (isInGame !== (challenge.isSelected || false)) {
          updatedCount++;
          
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
      
      console.log(`syncChallengesWithLocalStorage: Updated selection state for ${updatedCount} challenges`);
      
      // Check for challenges in the game that might not be in localStorage yet
      // This can happen when adding a challenge directly without going through the recent list
      let newChallengesAdded = 0;
      
      state.customChallenges.forEach(gameChallenge => {
        // Check if the challenge exists in the updated list (by ID or title)
        const existsInStorage = updatedChallenges.some(storedChallenge => 
          (gameChallenge.id && storedChallenge.id === gameChallenge.id) ||
          (gameChallenge.title && storedChallenge.title && 
           storedChallenge.title.toLowerCase() === gameChallenge.title.toLowerCase())
        );
        
        // If it's not in localStorage, add it
        if (!existsInStorage) {
          // Make sure to preserve prebuilt properties
          const challengeToAdd = ensurePrebuiltPropertiesPreserved({
            ...gameChallenge,
            isSelected: true
          });
          
          updatedChallenges.push(challengeToAdd);
          newChallengesAdded++;
        }
      });
      
      if (newChallengesAdded > 0) {
        console.log(`syncChallengesWithLocalStorage: Added ${newChallengesAdded} new challenges from game to localStorage`);
      }
      
      // Save updated challenges back to localStorage
      localStorage.setItem(RECENT_CHALLENGES_KEY, JSON.stringify(updatedChallenges));
      
      console.log(`syncChallengesWithLocalStorage: Synchronized ${updatedChallenges.length} challenges with localStorage`);
    } catch (error) {
      console.error("Error syncing challenges with localStorage:", error);
    }
  };

  // Add a recent challenge to current game
  const handleAddRecentChallenge = (challenge: Challenge) => {
    // Store the challenge ID and title for logging
    const challengeId = challenge.id;
    const challengeTitle = challenge.title;
    
    console.log(`Adding challenge to game: ${challengeId} - ${challengeTitle}`);
    
    // Check if the challenge is already in the game to avoid duplicates
    if (isChallengeInGame(challenge, state.customChallenges)) {
      console.log(`Challenge ${challengeTitle} is already in the current game, not adding again`);
      return;
    }
    
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
    
    // Block the UI while we're making changes to prevent multiple clicks/race conditions
    setIsLoadingChallenges(true);
    
    // 1. Add the challenge to the game first
    dispatch({
      type: "ADD_CUSTOM_CHALLENGE",
      payload: {
        ...preservedChallenge,
        isSelected: true
      },
    });
    
    // 2. Mark the challenge as selected in localStorage
    updateRecentChallenges(preservedChallenge, true);
    
    // 3. Force a sync with localStorage to ensure everything is up to date
    syncChallengesWithLocalStorage();
    
    // 4. Use setTimeout with a more generous timeout to ensure the state has time to update
    // This ensures we handle the local state update after the dispatch has been processed
    setTimeout(() => {
      // Get fresh recent challenges with the latest game state taken into account
      const freshRecentChallenges = getRecentChallenges();
      
      console.log(`Setting recent challenges list to ${freshRecentChallenges.length} challenges`);
      
      // Set the recent challenges in a single state update
      setRecentChallenges(freshRecentChallenges);
      
      // Unblock the UI
      setIsLoadingChallenges(false);
    }, 150); // Increased from 50ms to 150ms for more stability
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
    console.log(`Opening edit form for challenge: ${challenge.title}`);
    
    // Ensure prebuilt properties are preserved
    const preservedChallenge = ensurePrebuiltPropertiesPreserved(challenge);
    
    // Set the challenge to edit first
    setEditingChallenge(preservedChallenge);
    
    // Log the challenge properties for debugging
    console.log('Challenge properties for form selection:', {
      id: preservedChallenge.id,
      title: preservedChallenge.title,
      isPrebuilt: preservedChallenge.isPrebuilt,
      prebuiltType: preservedChallenge.prebuiltType
    });
    
    // First check if it's a quiz challenge directly by prebuiltType
    if (preservedChallenge.prebuiltType === PrebuiltChallengeType.QUIZ) {
      console.log('Opening Quiz Form based on prebuiltType');
      setShowQuizForm(true);
      // Add to recent challenges when edited and mark as selected
      updateRecentChallenges(preservedChallenge, true);
      return;
    }
    
    // Check for Spotify Music Quiz challenge directly
    if (preservedChallenge.prebuiltType === PrebuiltChallengeType.SPOTIFY_MUSIC_QUIZ) {
      console.log('Opening Spotify Music Quiz Form based on prebuiltType');
      setShowSpotifyMusicQuizForm(true);
      // Add to recent challenges when edited and mark as selected
      updateRecentChallenges(preservedChallenge, true);
      return;
    }
    
    // Use our utility function as a fallback
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
        payload: {
          ...challengeToUpdate,
          isSelected: true
        },
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
      payload: {
        ...preservedChallenge,
        isSelected: true
      }
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
      
      // Block the UI while we're making changes to prevent multiple clicks/race conditions
      setIsLoadingChallenges(true);
      
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
      
      // 1. Update the challenge in localStorage to mark as unselected
      updateRecentChallenges(challengeCopy, false);
      
      // 2. Remove it from the game
      dispatch({
        type: "REMOVE_CUSTOM_CHALLENGE",
        payload: challenge.id
      });
      
      // 3. Force immediate synchronization with localStorage
      syncChallengesWithLocalStorage();
      
      // 4. Update the recent challenges list after a more generous delay to ensure state is updated
      setTimeout(() => {
        // Get fresh challenges after the state has updated
        const freshRecentChallenges = getRecentChallenges();
        
        // Check if the removed challenge is already in the list
        const isChallengeInList = freshRecentChallenges.some(
          c => c.id === challengeCopy.id || 
               c.title.toLowerCase() === challengeCopy.title.toLowerCase()
        );
        
        // If not in the list, add it at the beginning
        if (!isChallengeInList) {
          console.log(`Adding challenge ${challengeCopy.title} to recent challenges list`);
          setRecentChallenges([challengeCopy, ...freshRecentChallenges]);
        } else {
          // Otherwise just use the fresh list
          console.log(`Challenge ${challengeCopy.title} is already in recent list, using fresh list`);
          setRecentChallenges(freshRecentChallenges);
        }
        
        // Unblock the UI
        setIsLoadingChallenges(false);
      }, 150); // Increased from 50ms to 150ms for more stability
    } else {
      console.error('Failed to find challenge in game:', challenge.id);
    }
  };

  /**
   * Add all recent challenges to the current game
   */
  const handleAddAllRecentChallenges = () => {
    if (recentChallenges.length === 0) {
      console.log('No recent challenges to add');
      return;
    }
    
    console.log(`Adding all ${recentChallenges.length} recent challenges to the game`);
    
    // Block the UI while we're making changes
    setIsLoadingChallenges(true);
    
    // Create a copy of the challenges to add
    const challengesToAdd = [...recentChallenges];
    
    // Process each challenge
    challengesToAdd.forEach(challenge => {
      // Skip if it's already in the game
      if (isChallengeInGame(challenge, state.customChallenges)) {
        console.log(`Challenge ${challenge.title} is already in the game, skipping`);
        return;
      }
      
      const preservedChallenge = ensurePrebuiltPropertiesPreserved(challenge);
      
      // Mark as selected in localStorage
      updateRecentChallenges(preservedChallenge, true);
      
      // Add to the game
      dispatch({
        type: "ADD_CUSTOM_CHALLENGE",
        payload: {
          ...preservedChallenge,
          isSelected: true
        },
      });
    });
    
    // Sync with localStorage
    syncChallengesWithLocalStorage();
    
    // Update recent challenges list after a delay
    setTimeout(() => {
      // Get fresh recent challenges
      const freshRecentChallenges = getRecentChallenges();
      
      // Update the state
      setRecentChallenges(freshRecentChallenges);
      
      // Unblock the UI
      setIsLoadingChallenges(false);
    }, 200);
  };

  /**
   * Remove all selected challenges from the current game
   */
  const handleRemoveAllSelectedChallenges = () => {
    if (state.customChallenges.length === 0) {
      console.log('No selected challenges to remove');
      return;
    }
    
    console.log(`Removing all ${state.customChallenges.length} challenges from the game`);
    
    // Block the UI while we're making changes
    setIsLoadingChallenges(true);
    
    // Create a copy of the challenges to remove
    const challengesToRemove = [...state.customChallenges];
    
    // Process each challenge
    challengesToRemove.forEach(challenge => {
      const preservedChallenge = ensurePrebuiltPropertiesPreserved({
        ...challenge,
        isSelected: false
      });
      
      // Update in localStorage to mark as unselected
      updateRecentChallenges(preservedChallenge, false);
      
      // Remove from the game
      dispatch({
        type: "REMOVE_CUSTOM_CHALLENGE",
        payload: challenge.id
      });
    });
    
    // Sync with localStorage
    syncChallengesWithLocalStorage();
    
    // Update recent challenges list after a delay
    setTimeout(() => {
      // Get fresh recent challenges
      const freshRecentChallenges = getRecentChallenges();
      
      // Update the state
      setRecentChallenges(freshRecentChallenges);
      
      // Unblock the UI
      setIsLoadingChallenges(false);
    }, 200);
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
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-md font-medium text-gray-700 dark:text-gray-300">
                    {t("challenges.customChallenges")} ({state.customChallenges.length})
                  </h4>
                  <button
                    onClick={handleRemoveAllSelectedChallenges}
                    className="text-amber-500 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300 text-sm font-medium flex items-center gap-1 px-3 py-1 rounded-md hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                    title={t("challenges.removeAllFromGame")}
                    disabled={isLoadingChallenges}
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
                        d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {t("challenges.removeAllFromGame")}
                  </button>
                </div>
                <div className="space-y-4">
                  <AnimatePresence>
                  {state.customChallenges.map((challenge) => (
                    <motion.div
                      key={`selected-challenge-${challenge.id}`}
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
            <div className="flex gap-2">
              {recentChallenges.length > 0 && (
                <>
                  <button
                    onClick={handleAddAllRecentChallenges}
                    className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium flex items-center gap-1 px-3 py-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    title={t("challenges.addAllToGame")}
                    disabled={isLoadingChallenges}
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
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                    {t("challenges.addAllToGame")}
                  </button>
                  <button
                    onClick={initiateDeleteAllRecentChallenges}
                    className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium flex items-center gap-1 px-3 py-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title={t("challenges.deleteAllRecent")}
                    disabled={isLoadingChallenges}
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
                </>
              )}
            </div>
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
                    key={`recent-challenge-${challenge.id || challenge.title}`}
                    className={`bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg p-3 border ${
                      recentlyRemovedChallenge === challenge.id 
                        ? 'border-game-accent border-2' 
                        : 'border-gray-200 dark:border-gray-600'
                    } transition-colors relative group`}
                    layout="position"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ 
                      opacity: 1, 
                      y: 0,
                      transition: { 
                        duration: 0.2,
                        ease: "easeOut" 
                      }
                    }}
                    exit={{ 
                      opacity: 0, 
                      scale: 0.95,
                      transition: { 
                        duration: 0.15,
                        ease: "easeIn"
                      }
                    }}
                    transition={{
                      layout: { duration: 0.2, ease: "easeInOut" }
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
              payload: {
                ...preservedChallenge,
                isSelected: true
              },
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
