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
      
      const playerData = {
        ...player,
        user_id: validatedUserId
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
      const { data, error } = await supabase
        .from('players')
        .update({
          ...updates,
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
      
      return data;
    } catch (error) {
      console.error('Exception in addChallenge:', error);
      return null;
    }
  },
  
  // Update a challenge
  async updateChallenge(challengeId: string, updates: Partial<Omit<DBChallenge, 'id' | 'created_at'>>) {
    try {
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
        console.error('Error updating challenge:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Exception in updateChallenge:', error);
      return null;
    }
  },
  
  // Delete a challenge
  async deleteChallenge(challengeId: string) {
    try {
      const { error } = await supabase
        .from('challenges')
        .delete()
        .eq('id', challengeId);
        
      if (error) {
        console.error('Error deleting challenge:', error);
        throw error;
      }
      
      return true;
    } catch (error) {
      console.error('Exception in deleteChallenge:', error);
      return false;
    }
  }
};

/**
 * Database helper functions for games
 */
export const gamesService = {
  // Get all games for the current user
  async getGames(userId?: string) {
    try {
      const validatedUserId = ensureUuid(userId);
      
      // Build the query
      let query = supabase
        .from('games')
        .select('*')
        .order('started_at', { ascending: false });
        
      // Apply user_id filter if provided
      if (validatedUserId) {
        query = query.eq('user_id', validatedUserId);
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
  }
};

export default supabase; 