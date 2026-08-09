'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  GraduationCap,
  LayoutDashboard,
  ScrollText,
  ShieldCheck,
  Users,
} from 'lucide-react';

type Props = {
  isSuperAdmin: boolean;
  /** Whether the Alumni section is visible (manage_alumni capability). */
  showAlumni?: boolean;
};

/** Shared sub-navigation for the /admin section. */
export default function AdminNav({ isSuperAdmin, showAlumni = true }: Props) {
  const pathname = usePathname();

  const links = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, superOnly: false, visible: true },
    { href: '/admin/moderation', label: 'Moderasi', icon: ShieldCheck, superOnly: false, visible: true },
    { href: '/admin/alumni', label: 'Alumni', icon: GraduationCap, superOnly: false, visible: showAlumni },
    { href: '/admin/users', label: 'Pengguna', icon: Users, superOnly: true, visible: true },
    { href: '/admin/audit', label: 'Audit', icon: ScrollText, superOnly: true, visible: true },
  ];

  return (
    <nav className="flex flex-wrap gap-1 border-b border-outline-variant pb-2">
      {links
        .filter((link) => link.visible && (!link.superOnly || isSuperAdmin))
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
