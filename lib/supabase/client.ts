import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Default browser client. It auto-detects a session from the current URL
 * (`detectSessionInUrl`), so it must not be used on pages that handle an auth
 * callback themselves — see {@link createRecoveryClient}.
 */
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

let recoveryClient: SupabaseClient | null = null;

/**
 * Browser client for the password-recovery page, with URL session detection
 * turned OFF.
 *
 * `createBrowserClient` enables `detectSessionInUrl`, which makes the client
 * exchange a `?code=` PKCE code by itself while it initializes. PKCE codes are
 * single-use, so when the page then calls `exchangeCodeForSession(code)` for
 * the same code the second attempt fails with an invalid/expired-token error
 * even though the link was perfectly valid.
 *
 * Disabling auto-detection keeps the exchange under the page's control so it
 * happens exactly once. Passing an options object also opts this client out of
 * the library's module-level singleton, so it never shares state with
 * {@link createClient}; we therefore memoize it here.
 */
export function createRecoveryClient(): SupabaseClient {
  recoveryClient ??= createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: { detectSessionInUrl: false },
  });
  return recoveryClient;
}