import { describe, it, expect } from 'vitest';
import { renderRichText, richTextExcerpt, RICH_TEXT_MAX_LENGTH } from '@/lib/content/rich-text';

/**
 * MANDATORY security suite (proposal §8). If sanitize-html's rules are ever
 * loosened, these fail. They are the regression net for the XSS boundary.
 */
describe('renderRichText — XSS', () => {
  it('strips <script> tags', () => {
    const html = renderRichText('Halo <script>alert(1)</script> dunia');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('alert(1)');
  });

  it('strips inline event handlers', () => {
    const html = renderRichText('<img src=x onerror=alert(1)>');
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('<img');
  });

  it('strips javascript: hrefs', () => {
    const html = renderRichText('[klik](javascript:alert(1))');
    expect(html.toLowerCase()).not.toContain('javascript:');
  });

  it('strips data: hrefs', () => {
    const html = renderRichText('[klik](data:text/html;base64,PHNjcmlwdD4=)');
    expect(html.toLowerCase()).not.toContain('data:text/html');
  });

  it('strips vbscript: hrefs', () => {
    const html = renderRichText('[klik](vbscript:msgbox(1))');
    expect(html.toLowerCase()).not.toContain('vbscript:');
  });

  it('strips <iframe>, <object> and <form>', () => {
    const html = renderRichText(
      '<iframe src="https://evil.test"></iframe><object></object><form></form>'
    );
    expect(html).not.toContain('<iframe');
    expect(html).not.toContain('<object');
    expect(html).not.toContain('<form');
  });

  it('strips <style> and inline style attributes', () => {
    const html = renderRichText('<style>body{display:none}</style>teks');
    expect(html.toLowerCase()).not.toContain('<style');
    expect(html).not.toContain('display:none');
  });

  it('drops the href but keeps the text for a bad scheme', () => {
    // discard mode keeps prose, so the sentence must survive.
    const html = renderRichText('[klik sini](javascript:alert(1))');
    expect(html).toContain('klik sini');
  });

  it('forces rel=noopener on surviving links', () => {
    const html = renderRichText('[ situs](https://example.test)');
    expect(html).toContain('rel="noopener noreferrer nofollow"');
    expect(html).toContain('target="_blank"');
  });
});

describe('renderRichText — legitimate Markdown survives', () => {
  it('keeps bold and italic', () => {
    const html = renderRichText('**tebal** dan *miring*');
    expect(html).toContain('<strong>tebal</strong>');
    expect(html).toContain('<em>miring</em>');
  });

  it('keeps unordered and ordered lists', () => {
    const html = renderRichText('- satu\n- dua');
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>satu</li>');
  });

  it('keeps headings at h3+ (h1/h2 belong to the page chrome)', () => {
    const html = renderRichText('### Judul Bagian');
    expect(html).toContain('<h3>');
  });

  it('keeps blockquotes and tables', () => {
    expect(renderRichText('> kutipan')).toContain('<blockquote>');
    expect(renderRichText('| a | b |\n|---|---|\n| 1 | 2 |')).toContain('<table>');
  });

  it('keeps fenced code and adds safe language classes', () => {
    const html = renderRichText('```ts\nconst x = 1;\n```');
    expect(html).toContain('<pre>');
    expect(html).toContain('<code');
  });

  it('returns an empty string for null/empty input', () => {
    expect(renderRichText(null)).toBe('');
    expect(renderRichText(undefined)).toBe('');
    expect(renderRichText('')).toBe('');
  });

  it('truncates input beyond the hard cap', () => {
    const huge = 'a'.repeat(RICH_TEXT_MAX_LENGTH + 5_000);
    expect(renderRichText(huge).length).toBeLessThan(RICH_TEXT_MAX_LENGTH * 2);
  });

  it('sanitizes on EVERY call (not cached at write time)', () => {
    // Same renderer, repeated invocation — no memo that could skip filtering.
    expect(renderRichText('<script>a()</script>')).not.toContain('script');
    expect(renderRichText('<script>b()</script>')).not.toContain('script');
  });
});

describe('richTextExcerpt', () => {
  it('strips markdown syntax', () => {
    expect(richTextExcerpt('**tebal** dan [tautan](https://x.test)')).toBe(
      'tebal dan tautan'
    );
  });

  it('drops images entirely', () => {
    expect(richTextExcerpt('lihat ![alt](https://x.test/a.jpg) di sini')).toBe(
      'lihat di sini'
    );
  });

  it('collapses whitespace and newlines', () => {
    expect(richTextExcerpt('baris  satu\n\nbaris   dua')).toBe('baris satu baris dua');
  });

  it('truncates with an ellipsis', () => {
    const out = richTextExcerpt('x'.repeat(300), 50);
    expect(out).toHaveLength(51);
    expect(out.endsWith('…')).toBe(true);
  });

  it('handles null input', () => {
    expect(richTextExcerpt(null)).toBe('');
  });
});
