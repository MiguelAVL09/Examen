import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (typeof import.meta.env.VITE_SUPABASE_URL === 'string'
  ? import.meta.env.VITE_SUPABASE_URL.trim()
  : '');

const supabaseAnonKey = (typeof import.meta.env.VITE_SUPABASE_ANON_KEY === 'string'
  ? import.meta.env.VITE_SUPABASE_ANON_KEY.trim()
  : '');

export const isSupabaseConfigured = (): boolean => {
  return (
    supabaseUrl !== '' &&
    supabaseUrl.startsWith('https://') &&
    !supabaseUrl.includes('placeholder') &&
    supabaseAnonKey !== '' &&
    supabaseAnonKey.length > 20 &&
    !supabaseAnonKey.includes('placeholder')
  );
};

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;
