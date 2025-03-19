import { createClient } from '@supabase/supabase-js';
import type { RecentPlayer, RecentChallenge, RecentGame, UserProfile } from '@/types/supabase';

// Initialize the Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create client with public anon key
export const supabase = createClient<{
  public: {
    Tables: {
      users: {
        Row: UserProfile;
        Insert: Omit<UserProfile, 'id' | 'created_at'>;
        Update: Partial<Omit<UserProfile, 'id' | 'created_at'>>;
      };
      recent_players: {
        Row: RecentPlayer;
        Insert: Omit<RecentPlayer, 'id' | 'created_at'>;
        Update: Partial<Omit<RecentPlayer, 'id' | 'created_at'>>;
      };
      recent_challenges: {
        Row: RecentChallenge;
        Insert: Omit<RecentChallenge, 'id' | 'created_at'>;
        Update: Partial<Omit<RecentChallenge, 'id' | 'created_at'>>;
      };
      recent_games: {
        Row: RecentGame;
        Insert: Omit<RecentGame, 'id' | 'created_at'>;
        Update: Partial<Omit<RecentGame, 'id' | 'created_at'>>;
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
}>(supabaseUrl, supabaseKey);

// Handle session state changes
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && session) {
    console.log('User signed in: ', session.user);
  } else if (event === 'SIGNED_OUT') {
    console.log('User signed out');
  }
});

export default supabase; 