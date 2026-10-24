/**
 * The dashboard's number tiles.
 *
 * Two deliberate choices. The big figure is rendered as text the caller has
 * already formatted, because the tile must not decide whether 38,400,000
 * becomes "38.4M" — on a money tile that is a judgement about what reconciles
 * and what does not, and it belongs with the screen.
 *
 * And a tile may carry a `progress` bar but never a sparkline: a trend drawn
 * at 120px wide is decoration, and the Phase 1 API has no series to put in it.
 */

import type { ReactNode } from 'react';

export interface StatTileProps {
  readonly label: string;
  readonly value: ReactNode;
  /** The small print under the figure. Tone it when it is bad news. */
  readonly foot?: ReactNode;
  readonly footTone?: 'muted' | 'ok' | 'warn' | 'bad';
  /** 0–100. Drawn under the figure, as on "Fees collected". */
  readonly progress?: number;
  readonly loading?: boolean;
}

const footTones = {
  muted: 'text-muted',
  ok: 'text-ok-ink',
  warn: 'text-warn-ink',
  bad: 'text-bad-ink',
} as const;

export function StatTile({
  label,
  value,
  foot,
  footTone = 'muted',
  progress,
  loading = false,
}: StatTileProps) {
  return (
    <div className="rounded-card border border-line bg-white p-[16px_17px]">
      <p className="m-0 mb-[7px] text-xs font-medium text-muted">{label}</p>
      {loading ? (
        <div className="mb-[9px] h-9 w-24 animate-pulse rounded bg-line-soft" aria-hidden="true" />
      ) : (
        <p className="m-0 mb-[9px] font-display text-[30px] font-semibold tracking-[-0.02em]">
          {value}
        </p>
      )}
      {progress !== undefined ? (
        <div className="h-1.5 overflow-hidden rounded-[3px] bg-line">
          <div
            className="h-1.5 bg-brand"
            style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
          />
        </div>
      ) : null}
      {foot ? (
        <p className={`m-0 text-xs ${footTones[footTone]} ${progress !== undefined ? 'mt-[7px]' : ''}`}>
          {foot}
        </p>
      ) : null}
    </div>
  );
}

/** The unit after a big number: "38.4" then a small "M TZS". */
export function Unit({ children }: { readonly children: ReactNode }) {
  return <span className="text-[15px] font-medium text-muted">{children}</span>;
}
