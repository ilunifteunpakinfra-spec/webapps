import { renderRichText } from '@/lib/content/rich-text';

type Props = {
  /** Raw Markdown as stored in the database. */
  markdown: string | null | undefined;
  className?: string;
};

/**
 * Renders user-authored rich text.
 *
 * SERVER COMPONENT — deliberately no 'use client'. `renderRichText` imports
 * the sanitizer, which must never ship to the browser. This is the ONLY place
 * in the app that calls `dangerouslySetInnerHTML`, and the input has already
 * been allowlist-sanitized inside renderRichText(). See
 * PENGUMUMAN_RICH_MEDIA_PROPOSAL.md §2 for the rules this must keep.
 */
export default function RichText({ markdown, className }: Props) {
  const html = renderRichText(markdown);
  if (!html) return null;

  return (
    <div
      className={className ?? 'rich-text'}
      data-testid="rich-text"
      // Safe: renderRichText() allowlist-filters every tag, attribute and
      // URL scheme. Do not pass untrusted HTML here by any other route.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
