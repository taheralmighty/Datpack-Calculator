import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

let supabase = null;

if (supabaseUrl && supabaseAnonKey) {
  let role;
  try { role = JSON.parse(atob(supabaseAnonKey.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role; }
  catch { role = null; }
  if (role === 'service_role' || supabaseAnonKey.startsWith('sb_secret_')) {
    throw new Error('Privileged Supabase credentials must never be included in the frontend. Configure a public key and an internal API boundary.');
  }
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export { supabase };
export const hasSupabase = !!supabase;
