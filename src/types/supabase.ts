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

// New interfaces for updated database schema
export interface Player {
  id: string;
  user_id: string;
  name: string;
  image: string | null;
  score: number;
  created_at: string;
  updated_at: string;
  last_played_at: string | null;
  total_games: number;
  wins: number;
  favorite: boolean;
}

export interface DBChallenge {
  id: string;
  user_id: string;
  title: string;
  description: string;
  type: string; // 'INDIVIDUAL', 'ONE_ON_ONE', 'TEAM', 'ALL_VS_ALL'
  points: number;
  can_reuse: boolean;
  max_reuse_count: number | null; // Maximum number of times this challenge can be reused
  category: string | null;
  is_prebuilt: boolean;
  prebuilt_type: string | null;
  prebuilt_settings: Record<string, any> | null;
  punishment: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  times_played: number;
  is_favorite: boolean;
}

export interface Game {
  id: string;
  user_id: string;
  game_mode: string;
  status: 'active' | 'completed' | 'abandoned';
  started_at: string;
  completed_at: string | null;
  players: Record<string, any>;
  teams: Record<string, any> | null;
  current_challenge: string | null;
  completed_challenges: Record<string, any>[];
  scores: Record<string, any>;
  winner_id: string | null;
  settings: Record<string, any> | null;
  updated_at: string;
}