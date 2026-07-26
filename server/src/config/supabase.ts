import { createClient } from '@supabase/supabase-js';

let supabaseUrl = (process.env.SUPABASE_URL || '').trim();
const supabaseServiceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Supabase URL or Service Role Key is missing. Check environment variables.');
}

// Bypasses dashboard link if pasted by mistake in config (similar to frontend helper)
if (supabaseUrl.includes('supabase.com/dashboard/project/')) {
  const parts = supabaseUrl.split('supabase.com/dashboard/project/');
  const projectRef = parts[1]?.split('/')[0];
  if (projectRef) {
    supabaseUrl = `https://${projectRef}.supabase.co`;
  }
}

export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
