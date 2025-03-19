import supabase from './supabase';
import type { RecentPlayer, RecentChallenge, RecentGame } from '@/types/supabase';

/**
 * Data service for Supabase database operations
 */
export const DataService = {
  /**
   * User Profile Operations
   */
  getUserProfile: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Get user profile error:', error);
      return { success: false, error };
    }
  },

  updateUserProfile: async (userId: string, updates: any) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Update user profile error:', error);
      return { success: false, error };
    }
  },

  /**
   * Recent Players Operations
   */
  getRecentPlayers: async (userId: string, limit: number = 10) => {
    try {
      const { data, error } = await supabase
        .from('recent_players')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Get recent players error:', error);
      return { success: false, error };
    }
  },

  addRecentPlayer: async (playerData: Omit<RecentPlayer, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('recent_players')
        .insert(playerData)
        .select();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Add recent player error:', error);
      return { success: false, error };
    }
  },

  /**
   * Recent Challenges Operations
   */
  getRecentChallenges: async (userId: string, limit: number = 10) => {
    try {
      const { data, error } = await supabase
        .from('recent_challenges')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Get recent challenges error:', error);
      return { success: false, error };
    }
  },

  addRecentChallenge: async (challengeData: Omit<RecentChallenge, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('recent_challenges')
        .insert(challengeData)
        .select();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Add recent challenge error:', error);
      return { success: false, error };
    }
  },

  /**
   * Recent Games Operations
   */
  getRecentGames: async (userId: string, limit: number = 10) => {
    try {
      const { data, error } = await supabase
        .from('recent_games')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Get recent games error:', error);
      return { success: false, error };
    }
  },

  addRecentGame: async (gameData: Omit<RecentGame, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('recent_games')
        .insert(gameData)
        .select();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Add recent game error:', error);
      return { success: false, error };
    }
  },

  /**
   * Spotify Auth Operations
   */
  saveSpotifyAuth: async (
    userId: string,
    accessToken: string,
    refreshToken: string,
    expiresAt: number
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('spotify_auth')
        .upsert({
          user_id: userId,
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: expiresAt,
        });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error saving Spotify auth:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  },

  getSpotifyAuth: async (userId: string): Promise<{
    success: boolean;
    data?: {
      access_token: string;
      refresh_token: string;
      expires_at: number;
    };
    error?: string;
  }> => {
    try {
      const { data, error } = await supabase
        .from('spotify_auth')
        .select('access_token, refresh_token, expires_at')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      if (!data) throw new Error('No Spotify auth data found');

      return {
        success: true,
        data: {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_at: data.expires_at,
        },
      };
    } catch (error) {
      console.error('Error getting Spotify auth:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
};

export default DataService; 