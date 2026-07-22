import { createClient } from '@supabase/supabase-js'

// Untyped admin client — bypasses RLS with service role key.
// We use 'any' casts in admin operations to avoid Supabase v2 generic inference issues.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
