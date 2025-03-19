import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if credentials are provided
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials. Check your environment variables.');
}

// Create Supabase client
const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
);

export default supabase; 