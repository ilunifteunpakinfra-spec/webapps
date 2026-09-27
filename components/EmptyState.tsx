import Link from 'next/link';
import type { ReactNode } from 'react';

type Props = {
  title: string;
  description?: string;
  /** Optional action — usually a "clear filters" or "create" link. */
  action?: { href: string; label: string };
  icon?: ReactNode;
};

/**
 * Shared empty state. Replaces the ad-hoc "Belum ada …" strings so every list
 * in the app offers a way forward instead of dead-ending the user.
 */
export default function EmptyState({ title, description, action, icon }: Props) {
  return (
    <div className="card text-center" data-testid="empty-state">
      {icon && <div className="mb-3 flex justify-center">{icon}</div>}
      <p className="font-montserrat font-bold text-on-surface">{title}</p>
      {description && (
        <p className="mt-1 text-sm text-on-surface-variant">{description}</p>
      )}
      {action && (
        <Link
          href={action.href}
          className="btn-secondary mt-4 inline-flex"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
