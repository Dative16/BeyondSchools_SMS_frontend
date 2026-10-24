/**
 * The status pill.
 *
 * Tones are named for what they mean, not what colour they are, so an invoice
 * status maps to a tone in one place and changing the palette does not mean
 * finding every green in the app.
 *
 * Each tone differs in lightness as well as hue: a bursar scanning a column of
 * these is reading shape and weight as much as colour, and about one man in
 * twelve cannot tell the red from the green at all.
 */

import type { ReactNode } from 'react';

export type Tone = 'ok' | 'warn' | 'bad' | 'info' | 'neutral';

const tones: Record<Tone, string> = {
  ok: 'bg-ok-bg text-ok-ink',
  warn: 'bg-warn-bg text-warn-ink',
  bad: 'bg-bad-bg text-bad-ink',
  info: 'bg-info-bg text-info-ink',
  neutral: 'bg-line-soft text-ink-dim',
};

export function Pill({
  tone = 'neutral',
  children,
  className = '',
}: {
  readonly tone?: Tone;
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-[11px] py-1.5 text-xs font-semibold ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/** A small round count, as on the Admissions nav item. */
export function CountBadge({ count, label }: { readonly count: number; readonly label: string }) {
  if (count <= 0) return null;
  return (
    <span className="rounded-full bg-brand-strong px-[7px] py-0.5 text-[11px] font-semibold text-white">
      <span className="sr-only">{label}: </span>
      {count > 99 ? '99+' : count}
    </span>
  );
}
