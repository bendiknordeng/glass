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
    // Set lower timeout to prevent hanging
    fetch: (url, options) => {
      const requestOptions = {
        ...options,
        timeout: 15000, // 15 seconds timeout
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
  async getPlayers(userId?: string) {
    try {
      const validatedUserId = ensureUuid(userId);
      // Build the query
      let query = supabase
        .from('players')
        .select('*')
        .order('last_played_at', { ascending: false });
      
      // Apply user_id filter if provided
      if (validatedUserId) {
        query = query.eq('user_id', validatedUserId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching players:', error);
        throw error;
      }
    
      return data || [];
    } catch (error) {
      console.error('Exception in getPlayers:', error);
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
  async getChallenges(userId?: string) {
    try {
      const validatedUserId = ensureUuid(userId);
      
      // Build the query
      let query = supabase
        .from('challenges')
        .select('*')
        .order('created_at', { ascending: false });
        
      // Apply user_id filter if provided  
      if (validatedUserId) {
        query = query.eq('user_id', validatedUserId);
      }
      
      const { data, error } = await query;
      
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
  
  // Add a new challenge
  async addChallenge(challenge: Omit<DBChallenge, 'id' | 'created_at' | 'updated_at' | 'times_played'>) {
    try {
      console.log("Supabase: Adding new challenge:", challenge);
      // Ensure user_id is in UUID format
      const validatedUserId = ensureUuid(challenge.user_id);
      if (!validatedUserId) {
        throw new Error('Valid user_id is required');
      }
      
      const challengeData = {
        ...challenge,
        user_id: validatedUserId
      };

      // Set a timeout for the request
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out')), 5000);
      });
      
      // Actual database request
      const dbPromise = supabase
        .from('challenges')
        .insert(challengeData)
        .select()
        .single();
      
      // Race the DB request against the timeout
      const { data, error } = await Promise.race([
        dbPromise,
        timeoutPromise.then(() => { throw new Error('Database request timed out'); })
      ]) as any;
        
      if (error) {
        console.error('Error adding challenge to Supabase:', error);
        throw error;
      }
      
      console.log("Supabase: Challenge successfully added with ID:", data.id);
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
        .select('id, user_id, game_mode, status, started_at, completed_at, players, scores, winner_id, settings')
        .order('started_at', { ascending: false });
        
      // Apply user_id filter if provided
      if (validatedUserId) {
        query = query.eq('user_id', validatedUserId);
      }
      
      // Apply limit if provided (default to 10 for better performance)
      if (limit !== undefined) {
        query = query.limit(limit);
      } else {
        query = query.limit(10); // Default limit to prevent loading too many games
      }
      
      const { data, error } = await query;
      
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
  
  // Get active game for the current user
  async getActiveGame(userId?: string) {
    try {
      // Build the query
      let query = supabase
        .from('games')
        .select('*')
        .eq('status', 'active')
        .order('started_at', { ascending: false })
        .limit(1);
      
      // Apply user_id filter if provided
      if (userId) {
        query = query.eq('user_id', userId);
      }
      
      const { data, error } = await query.single();
      
      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          return null;
        }
        console.error('Error fetching active game:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Exception in getActiveGame:', error);
      return null;
    }
  },
  
  // Create a new game
  async createGame(game: Omit<Game, 'id' | 'started_at' | 'updated_at'>) {
    try {
      const { data, error } = await supabase
        .from('games')
        .insert(game)
        .select()
        .single();
        
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
      const { data, error } = await supabase
        .from('games')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', gameId)
        .select()
        .single();
        
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
      const { data, error } = await supabase
        .from('games')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          winner_id: winnerId,
          updated_at: new Date().toISOString()
        })
        .eq('id', gameId)
        .select()
        .single();
        
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
      const { error, data } = await supabase
        .from('games')
        .delete()
        .eq('id', gameId)
        .select();
        
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