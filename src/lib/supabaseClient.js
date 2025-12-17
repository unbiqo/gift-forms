import { createClient } from '@supabase/supabase-js';

// These environment variables must be set in your .env.local file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase URL or Key. Check your .env.local file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);