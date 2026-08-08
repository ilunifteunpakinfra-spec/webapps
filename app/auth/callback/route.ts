import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { ensureAlumniProfile } from '@/app/actions/alumni';
import { safePath } from '@/lib/utils';

/**
 * Handles Supabase redirects after email confirmation (and future
 * OAuth providers): exchanges the `code` for a session, ensures the
 * alumni profile row exists, then redirects to the requested page.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = safePath(searchParams.get('next') ?? undefined, '/');

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      await ensureAlumniProfile(data.user);
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=verifikasi`);
}
