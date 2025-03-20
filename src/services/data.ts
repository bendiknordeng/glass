import supabase from './supabase';

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
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
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
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
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
      // Validate user ID
      if (!userId || userId.trim() === '') {
        throw new Error('User ID is required');
      }
      
      // Check if we already have an entry for this user
      const { data: existingData, error: checkError } = await supabase
        .from('spotify_auth')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
        
      if (checkError) {
        console.warn('Error checking existing Spotify auth:', checkError);
      }
      
      // Use upsert with returning to verify success
      const { data, error } = await supabase
        .from('spotify_auth')
        .upsert(
          {
            // If we have existing data, include the ID
            ...(existingData?.id ? { id: existingData.id } : {}),
            user_id: userId,
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_at: expiresAt,
          },
          { onConflict: 'user_id' }
        )
        .select()
        .single();

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
      // Ensure user ID is in UUID format
      if (!userId || userId.trim() === '') {
        throw new Error('User ID is required');
      }
      
      // Use maybeSingle() instead of single() to handle "no rows" case without error
      const { data, error } = await supabase
        .from('spotify_auth')
        .select('access_token, refresh_token, expires_at')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      
      // If no data found, return success: false with a clear message
      if (!data) {
        return {
          success: false,
          error: 'No Spotify authentication data found',
        };
      }

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