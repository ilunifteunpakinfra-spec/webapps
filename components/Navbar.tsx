import Link from 'next/link';
import { Zap, UserCircle2, ShieldCheck, LogOut } from 'lucide-react';
import { getCurrentUser, isAdminUser } from '@/lib/supabase/user';
import { signOutAction } from '@/app/actions/auth';

export default async function Navbar() {
  const user = await getCurrentUser();
  const isAdmin = isAdminUser(user);

  return (
    <nav className="sticky top-0 z-50 border-b border-tech-black bg-white">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-5 md:px-8">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded bg-primary-container">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-montserrat text-lg font-bold leading-tight text-on-surface">
              ILUNI FTE
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">
              UNPAK
            </span>
          </div>
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          <Link href="/" className="nav-link-active">
            Beranda
          </Link>
          <Link href="/direktori" className="nav-link">
            Direktori
          </Link>
          <Link href="/lowongan" className="nav-link">
            Lowongan
          </Link>
          <Link href="/mentoring" className="nav-link">
            Mentoring
          </Link>
          <Link href="/grup" className="nav-link">
            Grup
          </Link>
          <Link href="/polling" className="nav-link">
            Polling
          </Link>
          <Link href="/pengumuman" className="nav-link">
            Pengumuman
          </Link>
          <Link href="/galeri" className="nav-link">
            Galeri
          </Link>
          <Link href="/peringkat" className="nav-link">
            Peringkat
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link href="/profil/edit" className="btn-tertiary">
                <UserCircle2 className="h-4 w-4" />
                <span className="hidden sm:inline">Profil</span>
              </Link>
              {isAdmin && (
                <Link href="/admin" className="btn-tertiary">
                  <ShieldCheck className="h-4 w-4" />
                  <span className="hidden sm:inline">Admin</span>
                </Link>
              )}
              <form action={signOutAction}>
                <button type="submit" className="btn-tertiary">
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Keluar</span>
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-tertiary">
                Masuk
              </Link>
              <Link href="/daftar" className="btn-primary">
                Daftar
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
