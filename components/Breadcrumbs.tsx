import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

type Crumb = {
  label: string;
  href?: string;
};

/** Simple breadcrumb trail. `items` excludes the always-present Beranda root. */
export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-4 flex flex-wrap items-center gap-1 text-sm text-on-surface-variant"
    >
      <Link
        href="/"
        className="inline-flex items-center gap-1 transition-colors hover:text-primary-container"
      >
        <Home className="h-3.5 w-3.5" />
        Beranda
      </Link>
      {items.map((item, index) => (
        <span key={index} className="inline-flex items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          {item.href ? (
            <Link
              href={item.href}
              className="transition-colors hover:text-primary-container"
            >
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-on-surface" aria-current="page">
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
