import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Server-side admin client using the service role key.
// IMPORTANT: This file must only be imported in server-only contexts.
export const adminClient = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
    },
    global: {
      headers: {
        'X-Client-Info': 'social-pulse-admin',
      },
    },
  }
);
