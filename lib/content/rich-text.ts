// ============================================
// ILUNI FTE WebApps - Rich Text Renderer (SHARED)
// ============================================
// THE SECURITY BOUNDARY for all user-authored rich content
// (announcement bodies today; job descriptions next).
//
// Rules that must hold — see PENGUMUMAN_RICH_MEDIA_PROPOSAL.md §2:
//   1. This is the ONLY way rich text reaches the page.
//   2. Must be called from a SERVER component. The consuming component must
//      NOT be 'use client'.
//   3. `dangerouslySetInnerHTML` appears in exactly ONE component
//      (components/content/RichText.tsx), and only with output from here.
//   4. sanitize-html ALWAYS runs after marked. No code path skips it.
//   5. Sanitizing happens on EVERY render, never once at write time —
//      content already in the database is re-filtered on read.
//
// Server-only: never import this from a client component. Doing so would ship
// the sanitizer to the browser, where it is both bloat and bypassable.
// ============================================

import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

/**
 * Allowlist of tags a poster may produce. Anything else is discarded —
 * notably `script`, `iframe`, `object`, `form`, `style`, and `img`
 * (images are handled by the announcement_images table, not inline HTML).
 */
const ALLOWED_TAGS = [
  'p', 'br', 'hr',
  'strong', 'em', 'del', 's',
  'code', 'pre',
  'blockquote',
  'ul', 'ol', 'li',
  'a',
  'h3', 'h4', 'h5', 'h6',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
  'span', 'div', 'sup', 'sub',
];

/** Only these URL schemes. Blocks `javascript:`, `data:`, `vbscript:`. */
const ALLOWED_SCHEMES = ['http', 'https', 'mailto'];

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    // `rel` and `target` are set by transformTags below, so both must be
    // declared here or the allowlist strips them again on the way out.
    a: ['href', 'title', 'rel', 'target'],
    // `class` is permitted only for the `lang-*` markers marked emits on
    // fenced code blocks; everything else is dropped.
    '*': ['class'],
  },
  allowedClasses: {
    '*': ['lang-*'],
  },
  allowedSchemes: ALLOWED_SCHEMES,
  allowedSchemesByTag: { a: ALLOWED_SCHEMES },
  // `discard` drops the tag but keeps its text, so a stripped <script> leaves
  // the prose intact instead of swallowing the paragraph.
  disallowedTagsMode: 'discard',
  // NOTE: transformTags runs BEFORE the allowlist filter, so attributes added
  // here must themselves be listed in `allowedAttributes.allowedAttributes`
  // or they are stripped on the way out. Both `rel` and `target` are declared
  // there for exactly this reason.
  transformTags: {
    a: (_tagName, attribs) => ({
      tagName: 'a',
      attribs: {
        ...attribs,
        // Force-safe external links: noopener blocks tabnabbing,
        // noreferrer avoids leaking the referrer, nofollow stops
        // user-supplied links from conferring SEO juice.
        rel: 'noopener noreferrer nofollow',
        target: '_blank',
      },
    }),
  },
};

/** Hard cap on stored source length (mirrors the DB CHECK). */
export const RICH_TEXT_MAX_LENGTH = 20_000;

/**
 * Render user Markdown to sanitized HTML.
 * Always returns sanitized output — never trust the input.
 */
export function renderRichText(markdown: string | null | undefined): string {
  if (!markdown) return '';
  const source = markdown.slice(0, RICH_TEXT_MAX_LENGTH);
  const raw = marked.parse(source, {
    async: false,
    gfm: true,
    // Single newline becomes <br> — matches how posters already expect the
    // plain-text field to behave, and avoids a silent behaviour change.
    breaks: true,
  });
  return sanitizeHtml(raw, SANITIZE_OPTIONS);
}

/**
 * A short, plain-text excerpt for list cards. Strips Markdown syntax and
 * collapses whitespace so a teaser never shows raw `**` or `[a](b)`.
 */
export function richTextExcerpt(
  markdown: string | null | undefined,
  maxLength = 180
): string {
  if (!markdown) return '';
  const plain = markdown
    // Images / links first, then the remaining inline markers.
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/(\*\*|__|\*|_|~~)/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (plain.length <= maxLength) return plain;
  return `${plain.slice(0, maxLength).trimEnd()}…`;
}
