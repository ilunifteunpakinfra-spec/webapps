'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ScrollText, ShieldCheck, Users } from 'lucide-react';

type Props = {
  isSuperAdmin: boolean;
};

/** Shared sub-navigation for the /admin section. */
export default function AdminNav({ isSuperAdmin }: Props) {
  const pathname = usePathname();

  const links = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, superOnly: false },
    { href: '/admin/moderation', label: 'Moderasi', icon: ShieldCheck, superOnly: false },
    { href: '/admin/users', label: 'Pengguna', icon: Users, superOnly: true },
    { href: '/admin/audit', label: 'Audit', icon: ScrollText, superOnly: true },
  ];

  return (
    <nav className="flex flex-wrap gap-1 border-b border-outline-variant pb-2">
      {links
        .filter((link) => !link.superOnly || isSuperAdmin)
        .map((link) => {
          const active =
            link.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? 'bg-primary-container text-white'
                  : 'text-on-surface hover:bg-surface-container'
              }`}
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
    </nav>
  );
}
