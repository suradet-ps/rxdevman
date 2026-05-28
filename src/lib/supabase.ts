import type { SupabaseClient } from '@supabase/supabase-js';

import { createClient } from '@supabase/supabase-js';

let _supabaseServer: SupabaseClient | null = null;
let _supabasePublic: SupabaseClient | null = null;

export function getSupabaseServer(): SupabaseClient {
  if (!_supabaseServer) {
    _supabaseServer = createClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
    );
  }
  return _supabaseServer;
}

export function getSupabasePublic(): SupabaseClient {
  if (!_supabasePublic) {
    _supabasePublic = createClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    );
  }
  return _supabasePublic;
}
