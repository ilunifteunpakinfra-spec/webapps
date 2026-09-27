'use client';

import {
  useCallback,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { Bold, Italic, List, ListOrdered, Quote, Code, Link2 } from 'lucide-react';
import { RICH_TEXT_MAX_LENGTH } from '@/lib/content/rich-text';

type Action = {
  key: string;
  label: string;
  icon: ReactNode;
  /** Wrap the selection, e.g. ['**','**'] */
  wrap?: [string, string];
  /** Prefix every selected line, e.g. '- ' */
  prefix?: string;
  /** Replace the selection outright, e.g. a link template. */
  template?: (selected: string) => string;
};

const ACTIONS: Action[] = [
  { key: 'bold', label: 'Tebal (Ctrl+B)', icon: <Bold className="h-4 w-4" />, wrap: ['**', '**'] },
  { key: 'italic', label: 'Miring (Ctrl+I)', icon: <Italic className="h-4 w-4" />, wrap: ['*', '*'] },
  { key: 'ul', label: 'Daftar poin', icon: <List className="h-4 w-4" />, prefix: '- ' },
  { key: 'ol', label: 'Daftar angka', icon: <ListOrdered className="h-4 w-4" />, prefix: '1. ' },
  { key: 'quote', label: 'Kutipan', icon: <Quote className="h-4 w-4" />, prefix: '> ' },
  { key: 'code', label: 'Kode', icon: <Code className="h-4 w-4" />, wrap: ['`', '`'] },
  {
    key: 'link',
    label: 'Tautan (Ctrl+K)',
    icon: <Link2 className="h-4 w-4" />,
    template: (s) => `[${s || 'teks tautan'}](https://)`,
  },
];

type Props = {
  name: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
  rows?: number;
  showCounter?: boolean;
};

/**
 * Markdown editor with a formatting toolbar.
 *
 * Deliberately a plain <textarea>, not a WYSIWYG library: no extra
 * dependencies, full keyboard access, and the stored format stays plain
 * Markdown (portable, and the sanitizer has one narrow input to defend).
 *
 * No live preview by design — previewing would require the sanitizer in the
 * browser, where it is both bloat and bypassable. The rendered page is the
 * preview.
 */
export default function RichTextEditor({
  name,
  label,
  defaultValue = '',
  placeholder,
  rows = 10,
  showCounter = true,
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [length, setLength] = useState(defaultValue.length);

  /** Apply an action to the current selection, then restore the caret. */
  const apply = useCallback((action: Action) => {
    const el = ref.current;
    if (!el) return;

    const { selectionStart: start, selectionEnd: end, value } = el;
    const selected = value.slice(start, end);

    let next: string;
    let caret: number;

    if (action.wrap) {
      const [open, close] = action.wrap;
      next = value.slice(0, start) + open + selected + close + value.slice(end);
      // Caret inside the markers so the user can keep typing.
      caret = selected
        ? start + open.length + selected.length + close.length
        : start + open.length;
    } else if (action.prefix) {
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const nl = value.indexOf('\n', end);
      const lineEnd = nl === -1 ? value.length : nl;
      const block = value.slice(lineStart, lineEnd);
      const prefixed = block
        .split('\n')
        .map((line) =>
          action.prefix === '1. '
            ? `1. ${line.replace(/^\d+\.\s*/, '')}`
            : `${action.prefix}${line}`
        )
        .join('\n');
      next = value.slice(0, lineStart) + prefixed + value.slice(lineEnd);
      caret = lineStart + prefixed.length;
    } else if (action.template) {
      const inserted = action.template(selected);
      next = value.slice(0, start) + inserted + value.slice(end);
      caret = start + inserted.length;
    } else {
      return;
    }

    // Refuse edits past the hard cap rather than silently truncating.
    if (next.length > RICH_TEXT_MAX_LENGTH) {
      el.setSelectionRange(start, end);
      return;
    }

    el.value = next;
    setLength(next.length);
    el.focus();
    el.setSelectionRange(caret, caret);
  }, []);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (!(e.metaKey || e.ctrlKey)) return;
    const map: Record<string, Action> = {
      b: ACTIONS[0],
      i: ACTIONS[1],
      k: ACTIONS[5],
    };
    const action = map[e.key.toLowerCase()];
    if (!action) return;
    e.preventDefault();
    apply(action);
  }

  const pct = Math.round((length / RICH_TEXT_MAX_LENGTH) * 100);
  const nearLimit = pct >= 90;
  const overLimit = length > RICH_TEXT_MAX_LENGTH;

  return (
    <div>
      <label className="label-mono mb-1 block" htmlFor={`${name}-editor`}>
        {label}
      </label>

      <div
        className="flex flex-wrap items-center gap-0.5 rounded-t border border-b-0 border-wire-gray bg-surface-container px-1.5 py-1"
        role="toolbar"
        aria-label="Alat format teks"
      >
        {ACTIONS.map((action) => (
          <button
            key={action.key}
            type="button"
            title={action.label}
            aria-label={action.label}
            onClick={() => apply(action)}
            className="rounded p-1.5 text-on-surface transition-colors hover:bg-surface-container-highest hover:text-tech-black"
          >
            {action.icon}
          </button>
        ))}
      </div>

      <textarea
        id={`${name}-editor`}
        ref={ref}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        rows={rows}
        maxLength={RICH_TEXT_MAX_LENGTH}
        onChange={(e) => setLength(e.target.value.length)}
        onKeyDown={handleKeyDown}
        className="input-field rounded-t-none font-mono text-sm leading-relaxed"
        aria-describedby={`${name}-help ${name}-counter`}
      />

      <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-on-surface-variant">
        <p id={`${name}-help`}>
          Format: Markdown. <kbd>Ctrl+B</kbd> tebal · <kbd>Ctrl+I</kbd> miring ·{' '}
          <kbd>Ctrl+K</kbd> tautan
        </p>
        {showCounter && (
          <p
            id={`${name}-counter`}
            className={
              overLimit || nearLimit
                ? 'font-mono font-semibold text-error'
                : 'font-mono'
            }
            aria-live="polite"
          >
            {length.toLocaleString('id-ID')} /{' '}
            {RICH_TEXT_MAX_LENGTH.toLocaleString('id-ID')}
          </p>
        )}
      </div>
    </div>
  );
}

