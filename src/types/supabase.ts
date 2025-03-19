/**
 * Type definitions for Supabase database tables
 */

export interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string | null;
  spotify_connected: boolean;
  facebook_connected: boolean;
  google_connected: boolean;
}

export interface RecentPlayer {
  id: string;
  user_id: string;
  player_name: string;
  avatar_url: string | null;
  score: number;
  created_at: string;
}

export interface RecentChallenge {
  id: string;
  user_id: string;
  challenge_id: string;
  challenge_name: string;
  difficulty: string;
  created_at: string;
  metadata: Record<string, any> | null;
}

export interface RecentGame {
  id: string;
  user_id: string;
  game_mode: string;
  players: string[];
  winner: string | null;
  score: number;
  duration: number; // in seconds
  created_at: string;
  challenge_id: string | null;
  tracks: Array<{
    id: string;
    name: string;
    artist: string;
    album: string | null;
    image_url: string | null;
  }> | null;
}