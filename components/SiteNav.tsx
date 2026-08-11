'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Zap, UserCircle2, ShieldCheck, LogOut, Menu, X, ExternalLink } from 'lucide-react';
import { signOutAction } from '@/app/actions/auth';
import type { User } from '@supabase/supabase-js';

const MANUAL_URL = 'https://ilunifteunpakinfra-spec.github.io/webapps/';

type NavLink = { href: string; label: string; external?: boolean };

const NAV_LINKS: NavLink[] = [
  { href: '/', label: 'Beranda' },
  { href: '/direktori', label: 'Direktori' },
  { href: '/lowongan', label: 'Lowongan' },
  { href: '/mentoring', label: 'Mentoring' },
  { href: '/grup', label: 'Grup' },
  { href: '/polling', label: 'Polling' },
  { href: '/pengumuman', label: 'Pengumuman' },
  { href: '/galeri', label: 'Galeri' },
  { href: '/peringkat', label: 'Peringkat' },
  { href: MANUAL_URL, label: 'Panduan', external: true },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

type Props = {
  user: User | null;
  isAdmin: boolean;
};

export default function SiteNav({ user, isAdmin }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-tech-black bg-white">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-5 md:px-8">
        <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <div className="flex h-9 w-9 items-center justify-center rounded bg-primary-container">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-montserrat text-lg font-bold leading-tight text-on-surface">
              ILUNI FT ELEKTRO
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">
              UNPAK
            </span>
          </div>
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              target={link.external ? '_blank' : undefined}
              rel={link.external ? 'noopener noreferrer' : undefined}
              aria-current={isActive(pathname, link.href) ? 'page' : undefined}
              className={isActive(pathname, link.href) ? 'nav-link-active' : 'nav-link'}
            >
              <span className="inline-flex items-center gap-1">
                {link.label}
                {link.external && (
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                )}
              </span>
            </Link>
          ))}
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

          {/* Hamburger (mobile) */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
            aria-expanded={open}
            aria-controls="mobile-nav"
            className="inline-flex h-11 w-11 items-center justify-center rounded text-on-surface transition-colors hover:bg-surface-container lg:hidden"
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {open && (
        <div
          id="mobile-nav"
          className="border-t border-outline-variant bg-white shadow-lg lg:hidden"
        >
          <div className="mx-auto max-w-[1280px] px-5 py-2 md:px-8">
            {NAV_LINKS.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  target={link.external ? '_blank' : undefined}
                  rel={link.external ? 'noopener noreferrer' : undefined}
                  onClick={() => setOpen(false)}
                  aria-current={active ? 'page' : undefined}
                  className={`block border-l-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? 'border-primary-container bg-surface-container text-primary-container'
                      : 'border-transparent text-on-surface hover:bg-surface-container'
                  }`}
                >
                  <span className="inline-flex items-center gap-1">
                    {link.label}
                    {link.external && (
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}
