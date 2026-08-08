import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_ROLES, SUPER_ADMIN_ROLES } from '@/lib/constants';

/** Routes only administrators can access. */
const ADMIN_PREFIXES = ['/admin'];

/** Routes only the super admin can access. */
const SUPER_ADMIN_PREFIXES = ['/admin/users', '/admin/audit'];

/** Routes that require an authenticated session. */
const PROTECTED_PREFIXES = [
  '/profil/edit',
  '/lowongan/baru',
  '/mentoring/daftar-mentor',
  '/referral/baru',
  '/grup/baru',
  '/polling/baru',
  '/pengumuman/baru',
];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do not run code between createServerClient and supabase.auth.getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAdminRoute = ADMIN_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isProtectedRoute = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (isAdminRoute || isProtectedRoute) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.search = `next=${encodeURIComponent(pathname)}`;
      return NextResponse.redirect(url);
    }

    if (isAdminRoute) {
      // Role claims live in app_metadata (server-managed); user_metadata is
      // client-editable and never trusted for authorization.
      const role = user.app_metadata?.role as string | undefined;
      if (!ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number])) {
        const url = request.nextUrl.clone();
        url.pathname = '/';
        return NextResponse.redirect(url);
      }

      const isSuperAdminPrefix = SUPER_ADMIN_PREFIXES.some((prefix) =>
        pathname.startsWith(prefix)
      );
      if (
        isSuperAdminPrefix &&
        !SUPER_ADMIN_ROLES.includes(role as (typeof SUPER_ADMIN_ROLES)[number])
      ) {
        const url = request.nextUrl.clone();
        url.pathname = '/admin';
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}

export default async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets, images, and
     * favicon files.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
