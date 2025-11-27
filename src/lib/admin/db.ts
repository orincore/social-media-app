/**
 * Admin Database Client
 * Untyped client for admin-specific tables that aren't in the main schema
 */

import { createClient } from '@supabase/supabase-js';

// Create an untyped admin client for admin-specific tables
// These tables are created by the admin_schema.sql and aren't in the main types
export const adminDb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
    },
    global: {
      headers: {
        'X-Client-Info': 'admin-panel',
      },
    },
  }
);

// Re-export the typed admin client for regular tables
export { adminClient } from '@/lib/supabase/admin';
