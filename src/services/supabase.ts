import { createClient } from '@supabase/supabase-js';
import type { UserProfile, Player, DBChallenge, Game } from '@/types/supabase';

// Initialize the Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Verify environment variables are present
if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase environment variables are not defined!');
  console.error('Please make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are defined in your .env file');
}

// Ensure the user ID is a valid UUID if present
const isValidUuid = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

// Generate a consistent UUID for a given string
const generateConsistentUuid = (inputString: string): string => {
  // This is a simple function to generate a UUID-like string
  // In production, you would want a more robust approach
  const hash = Array.from(inputString).reduce(
    (acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0
  );
  
  // Format as UUID (this is not cryptographically secure but works for demos)
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `${hex.slice(0, 8)}-${hex.slice(0, 4)}-4${hex.slice(1, 4)}-8${hex.slice(1, 4)}-${hex.slice(0, 12)}`;
};

// Create client with public anon key and improved options
export const supabase = createClient<{
  public: {
    Tables: {
      users: {
        Row: UserProfile;
        Insert: Omit<UserProfile, 'id' | 'created_at'>;
        Update: Partial<Omit<UserProfile, 'id' | 'created_at'>>;
      };
      // New tables
      players: {
        Row: Player;
        Insert: Omit<Player, 'id' | 'created_at' | 'updated_at' | 'total_games' | 'wins'>;
        Update: Partial<Omit<Player, 'id' | 'created_at'>>;
      };
      challenges: {
        Row: DBChallenge;
        Insert: Omit<DBChallenge, 'id' | 'created_at' | 'updated_at' | 'times_played'>;
        Update: Partial<Omit<DBChallenge, 'id' | 'created_at'>>;
      };
      games: {
        Row: Game;
        Insert: Omit<Game, 'id' | 'started_at' | 'updated_at'>;
        Update: Partial<Omit<Game, 'id' | 'started_at'>>;
      };
      spotify_auth: {
        Row: {
          id: string;
          user_id: string;
          access_token: string;
          refresh_token: string;
          expires_at: number;
          created_at: string;
        };
        Insert: Omit<{
          id: string;
          user_id: string;
          access_token: string;
          refresh_token: string;
          expires_at: number;
          created_at: string;
        }, 'id' | 'created_at'>;
        Update: Partial<Omit<{
          id: string;
          user_id: string;
          access_token: string;
          refresh_token: string;
          expires_at: number;
          created_at: string;
        }, 'id' | 'created_at'>>;
      };
    };
  };
}>(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    storageKey: 'glass-auth-storage-key',
    detectSessionInUrl: true,
    autoRefreshToken: true,
  },
  global: {
    // Set higher timeout to prevent hanging
    fetch: (url, options) => {
      const requestOptions = {
        ...options,
        timeout: 30000, // Increased to 30 seconds timeout globally
      };
      return fetch(url, requestOptions as RequestInit);
    },
  },
});

// Check if connection is valid and log the result
(async () => {
  try {
    const { data, error } = await supabase.from('players').select('count').limit(1);
    if (error) {
      console.error('Supabase connection check failed:', error);
    }
  } catch (e) {
    console.error('Supabase initialization error:', e);
  }
})();

// Handle session state changes
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && session) {
    console.log('User signed in: ', session.user);
  } else if (event === 'SIGNED_OUT') {
    console.log('User signed out');
  } else if (event === 'TOKEN_REFRESHED') {
    console.log('Auth token refreshed');
  } else if (event === 'USER_UPDATED') {
    console.log('User profile updated');
  }
});

// Helper function to validate and format UUIDs
const ensureUuid = (id: string | undefined): string | undefined => {
  if (!id) return undefined;
  
  // Check if already a valid UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(id)) {
    return id;
  }
  
  console.warn(`ID "${id}" is not in UUID format. This may cause database errors.`);
  return id; // Return as is, the database will reject if invalid
};

// Helper function to process images before storage
const processImageForStorage = async (imageDataUrl: string): Promise<string> => {
  // Check if the image is already small enough
  if (!imageDataUrl || imageDataUrl.length < 1000000) { // Less than ~1MB
    return imageDataUrl;
  }
  
  // If this is a default avatar or already processed, return as is
  if (!imageDataUrl.startsWith('data:image/')) {
    return imageDataUrl;
  }
  
  console.log('Processing large image for storage');
  
  try {
    // Create an image element to load the data URL
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        // Create a canvas to resize the image
        const canvas = document.createElement('canvas');
        
        // Calculate new dimensions (max 500px width or height)
        const MAX_SIZE = 500;
        let width = img.width;
        let height = img.height;
        
        if (width > height && width > MAX_SIZE) {
          height = Math.round((height * MAX_SIZE) / width);
          width = MAX_SIZE;
        } else if (height > MAX_SIZE) {
          width = Math.round((width * MAX_SIZE) / height);
          height = MAX_SIZE;
        }
        
        // Set canvas dimensions and draw resized image
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          console.error('Could not get canvas context for image processing');
          resolve(imageDataUrl); // Fallback to original
          return;
        }
        
        // Draw with smooth scaling
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to data URL with reduced quality
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
        
        console.log(`Image compressed from ${imageDataUrl.length} to ${compressedDataUrl.length} bytes`);
        
        // If still too large, reduce further or return a default
        if (compressedDataUrl.length > 1500000) { // If still > 1.5MB
          console.warn('Image still too large after compression, reducing quality further');
          const furtherCompressed = canvas.toDataURL('image/jpeg', 0.4);
          
          if (furtherCompressed.length > 1500000) {
            console.error('Image too large for storage even after significant compression');
            // At this point, we could return a default image or a placeholder
            resolve('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiM2NjY2NjYiLz48dGV4dCB4PSI1MCIgeT0iNTAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNHB4IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIHRvbzxicj5sYXJnZTwvdGV4dD48L3N2Zz4=');
          } else {
            resolve(furtherCompressed);
          }
        } else {
          resolve(compressedDataUrl);
        }
      };
      
      img.onerror = () => {
        console.error('Error loading image for processing');
        resolve(imageDataUrl); // Fallback to original
      };
      
      img.src = imageDataUrl;
    });
  } catch (error) {
    console.error('Error processing image:', error);
    return imageDataUrl; // Return original on error
  }
};

/**
 * Database helper functions for players
 */
export const playersService = {
  // Get all players for the current user
  async getPlayers(userId?: string, limit?: number) {
    try {
      const validatedUserId = ensureUuid(userId);
      // Build the query with only essential fields by default
      let query = supabase
        .from('players')
        .select('id, name, last_played_at, favorite') // Minimal fields for listing
        .order('last_played_at', { ascending: false });
      
      // Apply user_id filter if provided
      if (validatedUserId) {
        query = query.eq('user_id', validatedUserId);
      }
      
      // Apply limit if provided (default to 20 for better performance)
      if (limit !== undefined) {
        query = query.limit(limit);
      } else {
        query = query.limit(20); // Default limit to prevent loading too many
      }
      
      // Set a timeout for the request
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out')), 10000); // 10 seconds timeout
      });
      
      // Actual database request
      const dbPromise = query;
      
      // Race the DB request against the timeout
      const { data, error } = await Promise.race([
        dbPromise,
        timeoutPromise.then(() => { throw new Error('Database request timed out'); })
      ]) as any;
      
      if (error) {
        console.error('Error fetching players:', error);
        throw error;
      }
      
      // If we need images for these players, get them in a separate batch
      if (data && data.length > 0) {
        return this.enrichPlayersWithImages(data, validatedUserId);
      }
    
      return data || [];
    } catch (error) {
      console.error('Exception in getPlayers:', error);
      return [];
    }
  },
  
  // Helper to get images for players in a separate efficient request
  async enrichPlayersWithImages(players: any[], userId?: string) {
    if (!players || players.length === 0) return players;
    
    try {
      // Get player IDs
      const playerIds = players.map(p => p.id);
      
      // Fetch only the id and image fields in a separate query
      const { data: imageData, error } = await supabase
        .from('players')
        .select('id, image')
        .in('id', playerIds)
        .eq('user_id', userId || '');
      
      if (error) {
        console.error('Error fetching player images:', error);
        return players; // Return players without images on error
      }
      
      // Create a map of id -> image
      const imageMap = new Map();
      if (imageData) {
        imageData.forEach((item: {id: string, image?: string}) => {
          if (item.image) {
            imageMap.set(item.id, item.image);
          }
        });
      }
      
      // Add images to original players data
      return players.map((player: {id: string, [key: string]: any}) => ({
        ...player,
        image: imageMap.get(player.id) || ''
      }));
    } catch (error) {
      console.error('Error enriching players with images:', error);
      return players; // Return original players without images on error
    }
  },
  
  // Get player details including all fields
  async getPlayerDetails(playerId: string) {
    try {
      if (!playerId) return null;
      
      // Set a timeout for the request
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out')), 10000); // 10 seconds timeout
      });
      
      // Actual database request
      const dbPromise = supabase
        .from('players')
        .select('*')
        .eq('id', playerId)
        .single();
      
      // Race the DB request against the timeout
      const { data, error } = await Promise.race([
        dbPromise,
        timeoutPromise.then(() => { throw new Error('Database request timed out'); })
      ]) as any;
      
      if (error) {
        console.error('Error fetching player details:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Exception in getPlayerDetails:', error);
      return null;
    }
  },
  
  // Get multiple players by their IDs (batch operation)
  async getPlayersByIds(playerIds: string[]) {
    try {
      if (!playerIds || playerIds.length === 0) return [];
      
      // Split into smaller batches if there are many IDs to fetch
      if (playerIds.length > 15) {
        console.log(`Fetching ${playerIds.length} players in batches for better performance`);
        
        // Process in batches of 15
        const batchSize = 15;
        const batches = [];
        
        for (let i = 0; i < playerIds.length; i += batchSize) {
          batches.push(playerIds.slice(i, i + batchSize));
        }
        
        // Process each batch sequentially to avoid overloading the connection
        let allResults: any[] = [];
        for (const batch of batches) {
          const batchResults = await this._getPlayersByIdsBatch(batch);
          allResults = [...allResults, ...batchResults];
        }
        
        return allResults;
      }
      
      // For smaller sets, use the direct batch function
      return await this._getPlayersByIdsBatch(playerIds);
    } catch (error) {
      console.error('Exception in getPlayersByIds:', error);
      return [];
    }
  },
  
  // Helper method to fetch a batch of players by IDs
  async _getPlayersByIdsBatch(playerIds: string[]) {
    try {
      if (!playerIds || playerIds.length === 0) return [];
      
      // Set a timeout for the request
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out')), 10000); // 10 seconds timeout
      });
      
      // First fetch essential data without images
      const dbPromise = supabase
        .from('players')
        .select('id, name, score, last_played_at')
        .in('id', playerIds);
      
      // Race the DB request against the timeout
      const { data, error } = await Promise.race([
        dbPromise,
        timeoutPromise.then(() => { throw new Error('Database request timed out'); })
      ]) as any;
      
      if (error) {
        console.error('Error fetching players by IDs batch:', error);
        throw error;
      }
      
      // If we have data, fetch images separately
      if (data && data.length > 0) {
        try {
          // Fetch only the id and image fields in a separate query
          const { data: imageData, error: imageError } = await supabase
            .from('players')
            .select('id, image')
            .in('id', playerIds);
          
          if (!imageError && imageData) {
            // Create a map of id -> image
            const imageMap = new Map();
            imageData.forEach((item: {id: string, image?: string}) => {
              if (item.image) {
                imageMap.set(item.id, item.image);
              }
            });
            
            // Add images to original data
            return data.map((player: {id: string, [key: string]: any}) => ({
              ...player,
              image: imageMap.get(player.id) || ''
            }));
          }
        } catch (imageError) {
          console.error('Error fetching player images:', imageError);
        }
      }
      
      return data || [];
    } catch (error) {
      console.error('Exception in _getPlayersByIdsBatch:', error);
      return [];
    }
  },

  // Add a new player
  async addPlayer(player: Omit<Player, 'id' | 'created_at' | 'updated_at' | 'total_games' | 'wins'>) {
    try {
      // Ensure user_id is in UUID format
      const validatedUserId = ensureUuid(player.user_id);
      if (!validatedUserId) {
        throw new Error('Valid user_id is required');
      }
      
      // Process the image if present to make it smaller
      let processedImage = player.image;
      if (player.image) {
        try {
          processedImage = await processImageForStorage(player.image);
        } catch (imageError) {
          console.error('Error processing image, using original:', imageError);
        }
      }
      
      const playerData = {
        ...player,
        user_id: validatedUserId,
        image: processedImage
      };
      
      // Set a timeout for the request
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out')), 5000);
      });
      
      // Actual database request
      const dbPromise = supabase
        .from('players')
        .insert(playerData)
        .select()
        .single();
      
      // Race the DB request against the timeout
      const { data, error } = await Promise.race([
        dbPromise,
        timeoutPromise.then(() => { throw new Error('Database request timed out'); })
      ]) as any;
        
      if (error) {
        console.error('Error adding player to Supabase:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Exception in addPlayer:', error);
      return null;
    }
  },
  
  // Update a player
  async updatePlayer(playerId: string, updates: Partial<Omit<Player, 'id' | 'created_at'>>) {
    try {
      // Process the image if present to make it smaller
      let processedUpdates = { ...updates };
      if (updates.image) {
        try {
          processedUpdates.image = await processImageForStorage(updates.image);
        } catch (imageError) {
          console.error('Error processing image for update, using original:', imageError);
        }
      }
      
      const { data, error } = await supabase
        .from('players')
        .update({
          ...processedUpdates,
          updated_at: new Date().toISOString()
        })
        .eq('id', playerId)
        .select()
        .single();
        
      if (error) {
        console.error('Error updating player:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Exception in updatePlayer:', error);
      return null;
    }
  },

  // Delete a player
  async deletePlayer(playerId: string) {
    try {
      const { error, data } = await supabase
        .from('players')
        .delete()
        .eq('id', playerId)
        .select();
        
      if (error) {
        console.error('Error deleting player:', error);
        throw error;
      }
      
      return data && data.length > 0 ? true : false;
    } catch (error) {
      console.error('Exception in deletePlayer:', error);
      return false;
    }
  }
};

/**
 * Database helper functions for challenges
 */
export const challengesService = {
  // Get all challenges for the current user
  async getChallenges(userId?: string, limit?: number) {
    try {
      const validatedUserId = ensureUuid(userId);
      
      // Build the query with only necessary fields for better performance
      let query = supabase
        .from('challenges')
        .select('id, title, description, type, user_id, can_reuse, max_reuse_count, points, created_at, is_prebuilt, prebuilt_type, prebuilt_settings, punishment')
        .order('created_at', { ascending: false });
        
      // Apply user_id filter if provided  
      if (validatedUserId) {
        query = query.eq('user_id', validatedUserId);
      }
      
      // Add limit to prevent loading too many challenges
      if (limit !== undefined) {
        query = query.limit(limit);
      } else {
        query = query.limit(25); // Default limit for better performance
      }
      
      // Set a timeout for the request
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out')), 10000); // 10 seconds timeout
      });
      
      // Actual database request
      const dbPromise = query;
      
      // Race the DB request against the timeout
      const { data, error } = await Promise.race([
        dbPromise,
        timeoutPromise.then(() => { throw new Error('Database request timed out'); })
      ]) as any;
      
      if (error) {
        console.error('Error fetching challenges:', error);
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Exception in getChallenges:', error);
      return [];
    }
  },
  
  // Get challenge details including description (separate call to optimize initial loading)
  async getChallengeDetails(challengeId: string) {
    try {
      if (!challengeId) return null;
      
      // Set a timeout for the request
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out')), 10000); // 10 seconds timeout
      });
      
      // Actual database request
      const dbPromise = supabase
        .from('challenges')
        .select('*')
        .eq('id', challengeId)
        .single();
      
      // Race the DB request against the timeout
      const { data, error } = await Promise.race([
        dbPromise,
        timeoutPromise.then(() => { throw new Error('Database request timed out'); })
      ]) as any;
      
      if (error) {
        console.error('Error fetching challenge details:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Exception in getChallengeDetails:', error);
      return null;
    }
  },
  
  // Get challenges by their IDs (batch operation)
  async getChallengesByIds(challengeIds: string[]) {
    try {
      if (!challengeIds || challengeIds.length === 0) return [];
      
      // Split into smaller batches if there are many IDs to fetch
      if (challengeIds.length > 15) {
        console.log(`Fetching ${challengeIds.length} challenges in batches for better performance`);
        
        // Process in batches of 15
        const batchSize = 15;
        const batches = [];
        
        for (let i = 0; i < challengeIds.length; i += batchSize) {
          batches.push(challengeIds.slice(i, i + batchSize));
        }
        
        // Process each batch sequentially to avoid overloading the connection
        let allResults: any[] = [];
        for (const batch of batches) {
          const batchResults = await this._getChallengesByIdsBatch(batch);
          allResults = [...allResults, ...batchResults];
        }
        
        return allResults;
      }
      
      // For smaller sets, use the direct batch function
      return await this._getChallengesByIdsBatch(challengeIds);
    } catch (error) {
      console.error('Exception in getChallengesByIds:', error);
      return [];
    }
  },
  
  // Helper method to fetch a batch of challenges by IDs
  async _getChallengesByIdsBatch(challengeIds: string[]) {
    try {
      if (!challengeIds || challengeIds.length === 0) return [];
      
      // Set a timeout for the request
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out')), 10000); // 10 seconds timeout
      });
      
      // Actual database request - select only essential fields
      const dbPromise = supabase
        .from('challenges')
        .select('id, title, description, type, user_id, can_reuse, max_reuse_count, points, is_prebuilt, prebuilt_type, prebuilt_settings, punishment')
        .in('id', challengeIds);
      
      // Race the DB request against the timeout
      const { data, error } = await Promise.race([
        dbPromise,
        timeoutPromise.then(() => { throw new Error('Database request timed out'); })
      ]) as any;
      
      if (error) {
        console.error('Error fetching challenges by IDs batch:', error);
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Exception in getChallengesByIdsBatch:', error);
      return [];
    }
  },
  
  // Add a new challenge
  async addChallenge(challenge: Omit<DBChallenge, "id" | "created_at" | "updated_at" | "times_played">) {
    try {
      // Set a timeout for the request
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out')), 5000);
      });
      
      // Actual database request
      const dbPromise = supabase
        .from('challenges')
        .insert(challenge)
        .select()
        .single();
      
      // Race the DB request against the timeout
      const { data, error } = await Promise.race([
        dbPromise,
        timeoutPromise.then(() => { throw new Error('Database request timed out'); })
      ]) as any;
      
      if (error) {
        console.error('Error adding challenge:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Exception in addChallenge:', error);
      return null;
    }
  },
  
  // Update a challenge
  async updateChallenge(challengeId: string, updates: Partial<Omit<DBChallenge, 'id' | 'created_at'>>) {
    try {
      console.log("Supabase: Updating challenge with ID:", challengeId, "Updates:", updates);
      // First check if the challenge exists and belongs to the current user
      const { data: existingChallenge, error: checkError } = await supabase
        .from('challenges')
        .select('id, user_id')
        .eq('id', challengeId)
        .single();
      
      if (checkError) {
        console.error(`Error checking challenge existence: ${JSON.stringify(checkError)}`);
        
        // If row not found, give more specific error message
        if (checkError.code === 'PGRST116') {
          console.error(`Challenge with ID ${challengeId} not found. This could be due to:
            1. The challenge doesn't exist in the database
            2. The challenge belongs to a different user (RLS restriction)
            3. The user doesn't have permission to access this challenge`);
        }
        
        throw checkError;
      }
      
      console.log(`Found existing challenge: ${JSON.stringify(existingChallenge)}`);
      
      // Now proceed with the update
      const { data, error } = await supabase
        .from('challenges')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', challengeId)
        .select()
        .single();
        
      if (error) {
        console.error(`Error updating challenge: ${JSON.stringify(error)}`);
        throw error;
      }
      
      console.log("Supabase: Challenge successfully updated:", data);
      return data;
    } catch (error) {
      console.error(`Exception in updateChallenge: ${JSON.stringify(error)}`);
      return null;
    }
  },
  
  // Delete a challenge
  async deleteChallenge(challengeId: string) {
    try {
      console.log("Supabase: Attempting to delete challenge with ID:", challengeId);
      // First check if the challenge exists and belongs to the current user
      const { data: existingChallenge, error: checkError } = await supabase
        .from('challenges')
        .select('id, user_id')
        .eq('id', challengeId)
        .single();
      
      if (checkError) {
        console.error(`Error checking challenge existence for deletion: ${JSON.stringify(checkError)}`);
        
        // If row not found, give more specific error message
        if (checkError.code === 'PGRST116') {
          console.error(`Challenge with ID ${challengeId} not found for deletion. This could be due to:
            1. The challenge doesn't exist in the database
            2. The challenge belongs to a different user (RLS restriction)
            3. The user doesn't have permission to access this challenge`);
        }
        
        // Since we're deleting, if the challenge doesn't exist, that's fine
        if (checkError.code === 'PGRST116') {
          console.log(`Challenge ${challengeId} already doesn't exist in database, considering delete successful`);
          return true; // Consider it deleted if it doesn't exist
        }
        
        throw checkError;
      }
      
      console.log(`Found existing challenge for deletion: ${JSON.stringify(existingChallenge)}`);
      
      // Now proceed with the delete
      const { error } = await supabase
        .from('challenges')
        .delete()
        .eq('id', challengeId);
        
      if (error) {
        console.error(`Error deleting challenge: ${JSON.stringify(error)}`);
        throw error;
      }
      
      console.log(`Supabase: Successfully deleted challenge ${challengeId}`);
      return true;
    } catch (error) {
      console.error(`Exception in deleteChallenge: ${JSON.stringify(error)}`);
      return false;
    }
  }
};

/**
 * Database helper functions for games
 */
export const gamesService = {
  // Get all games for the current user
  async getGames(userId?: string, limit?: number) {
    try {
      const validatedUserId = ensureUuid(userId);
      
      // Build the query with only necessary fields for improved performance
      let query = supabase
        .from('games')
        .select('id, user_id, game_mode, status, started_at, completed_at, winner_id')  // Further reduce selected fields
        .order('started_at', { ascending: false });
        
      // Apply user_id filter if provided
      if (validatedUserId) {
        query = query.eq('user_id', validatedUserId);
      }
      
      // Apply limit if provided (default to 5 for better performance)
      if (limit !== undefined) {
        query = query.limit(limit);
      } else {
        query = query.limit(5); // Reduced default limit for improved performance
      }
      
      // Increase timeout for this operation since it's problematic
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out')), 10000); // 10 seconds timeout
      });
      
      // Actual database request
      const dbPromise = query;
      
      // Race the DB request against the timeout
      const { data, error } = await Promise.race([
        dbPromise, 
        timeoutPromise.then(() => { throw new Error('Database request timed out'); })
      ]) as any;
      
      if (error) {
        console.error('Error fetching games:', error);
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Exception in getGames:', error);
      return [];
    }
  },
  
  // Get additional details for a specific game - use this for loading full game data
  async getGameDetails(gameId: string) {
    try {
      if (!gameId) return null;
      
      // Set a timeout for the request
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out')), 10000); // 10 seconds timeout
      });
      
      // Actual database request
      const dbPromise = supabase
        .from('games')
        .select('*')  // Select all fields for a single game
        .eq('id', gameId)
        .single();
      
      // Race the DB request against the timeout
      const { data, error } = await Promise.race([
        dbPromise,
        timeoutPromise.then(() => { throw new Error('Database request timed out'); })
      ]) as any;
      
      if (error) {
        console.error('Error fetching game details:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Exception in getGameDetails:', error);
      return null;
    }
  },
  
  // Get a specific game by ID
  async getGameById(gameId: string) {
    try {
      if (!gameId) return null;
      
      // Set a timeout for the request
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out')), 10000); // 10 seconds timeout
      });
      
      // Actual database request - select only essential fields
      const dbPromise = supabase
        .from('games')
        .select('id, user_id, game_mode, status, started_at, completed_at, winner_id')
        .eq('id', gameId)
        .single();
      
      // Race the DB request against the timeout
      const { data, error } = await Promise.race([
        dbPromise,
        timeoutPromise.then(() => { throw new Error('Database request timed out'); })
      ]) as any;
      
      if (error) {
        console.error('Error fetching game by ID:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Exception in getGameById:', error);
      return null;
    }
  },
  
  // Load multiple games by IDs in a single batch request
  async getGamesByIds(gameIds: string[]) {
    try {
      if (!gameIds || gameIds.length === 0) return [];
      
      // Split into smaller batches if there are many IDs to fetch
      if (gameIds.length > 10) {
        console.log(`Fetching ${gameIds.length} games in batches for better performance`);
        
        // Process in batches of 10
        const batchSize = 10;
        const batches = [];
        
        for (let i = 0; i < gameIds.length; i += batchSize) {
          batches.push(gameIds.slice(i, i + batchSize));
        }
        
        // Process each batch sequentially to avoid overloading the connection
        let allResults: any[] = [];
        for (const batch of batches) {
          const batchResults = await this._getGamesByIdsBatch(batch);
          allResults = [...allResults, ...batchResults];
        }
        
        return allResults;
      }
      
      // For smaller sets, use the direct batch function
      return await this._getGamesByIdsBatch(gameIds);
    } catch (error) {
      console.error('Exception in getGamesByIds:', error);
      return [];
    }
  },
  
  // Helper method to fetch a batch of games by IDs
  async _getGamesByIdsBatch(gameIds: string[]) {
    try {
      if (!gameIds || gameIds.length === 0) return [];
      
      // Set a timeout for the request
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out')), 10000); // 10 seconds timeout
      });
      
      // Actual database request - select only essential fields
      const dbPromise = supabase
        .from('games')
        .select('id, user_id, game_mode, status, started_at, completed_at, winner_id')
        .in('id', gameIds);
      
      // Race the DB request against the timeout
      const { data, error } = await Promise.race([
        dbPromise,
        timeoutPromise.then(() => { throw new Error('Database request timed out'); })
      ]) as any;
      
      if (error) {
        console.error('Error fetching games by IDs batch:', error);
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Exception in getGamesByIdsBatch:', error);
      return [];
    }
  },
  
  // Get active game for the current user
  async getActiveGame(userId?: string) {
    try {
      const validatedUserId = ensureUuid(userId);
      if (!validatedUserId) {
        console.warn('No valid user ID provided for getActiveGame');
        return null;
      }
      
      // Build the query with limited fields for better performance
      let query = supabase
        .from('games')
        .select('id, user_id, game_mode, status, started_at')
        .eq('status', 'active')
        .eq('user_id', validatedUserId)
        .order('started_at', { ascending: false })
        .limit(1);
      
      // Set a longer timeout for this operation
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out')), 10000); // 10 seconds timeout
      });
      
      // Actual database request
      const dbPromise = query;
      
      // Race the DB request against the timeout
      const { data, error } = await Promise.race([
        dbPromise, 
        timeoutPromise.then(() => { throw new Error('Database request timed out'); })
      ]) as any;
      
      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          return null;
        }
        console.error('Error fetching active game:', error);
        throw error;
      }
      
      // If we need full game details, fetch them separately using getGameDetails
      if (data && data.id) {
        return data;
      }
      
      return null;
    } catch (error) {
      console.error('Exception in getActiveGame:', error);
      return null;
    }
  },
  
  // Create a new game
  async createGame(game: Omit<Game, 'id' | 'started_at' | 'updated_at'>) {
    try {
      // Set a timeout for the request
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out')), 10000); // 10 seconds timeout
      });
      
      // Actual database request
      const dbPromise = supabase
        .from('games')
        .insert(game)
        .select('id, user_id, game_mode, status, started_at') // Only select essential fields
        .single();
      
      // Race the DB request against the timeout
      const { data, error } = await Promise.race([
        dbPromise, 
        timeoutPromise.then(() => { throw new Error('Database request timed out'); })
      ]) as any;
      
      if (error) {
        console.error('Error creating game:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Exception in createGame:', error);
      return null;
    }
  },
  
  // Update a game
  async updateGame(gameId: string, updates: Partial<Omit<Game, 'id' | 'started_at'>>) {
    try {
      // Set a timeout for the request
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out')), 10000); // 10 seconds timeout
      });
      
      // Actual database request
      const dbPromise = supabase
        .from('games')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', gameId)
        .select('id, status, updated_at') // Only select essential fields for confirmation
        .single();
      
      // Race the DB request against the timeout
      const { data, error } = await Promise.race([
        dbPromise, 
        timeoutPromise.then(() => { throw new Error('Database request timed out'); })
      ]) as any;
      
      if (error) {
        console.error('Error updating game:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Exception in updateGame:', error);
      return null;
    }
  },
  
  // Complete a game
  async completeGame(gameId: string, winnerId: string | null) {
    try {
      // Set a timeout for the request
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out')), 10000); // 10 seconds timeout
      });
      
      // Actual database request
      const dbPromise = supabase
        .from('games')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          winner_id: winnerId,
          updated_at: new Date().toISOString()
        })
        .eq('id', gameId)
        .select('id, status, completed_at, winner_id') // Only select essential fields for confirmation
        .single();
      
      // Race the DB request against the timeout
      const { data, error } = await Promise.race([
        dbPromise, 
        timeoutPromise.then(() => { throw new Error('Database request timed out'); })
      ]) as any;
      
      if (error) {
        console.error('Error completing game:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Exception in completeGame:', error);
      return null;
    }
  },
  
  // Delete a game
  async deleteGame(gameId: string) {
    try {
      // Set a timeout for the request
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out')), 10000); // 10 seconds timeout
      });
      
      // Actual database request
      const dbPromise = supabase
        .from('games')
        .delete()
        .eq('id', gameId)
        .select('id');
      
      // Race the DB request against the timeout
      const { data, error } = await Promise.race([
        dbPromise, 
        timeoutPromise.then(() => { throw new Error('Database request timed out'); })
      ]) as any;
      
      if (error) {
        console.error('Error deleting game:', error);
        throw error;
      }
      
      return data && data.length > 0 ? true : false;
    } catch (error) {
      console.error('Exception in deleteGame:', error);
      return false;
    }
  }
};

export default supabase; 