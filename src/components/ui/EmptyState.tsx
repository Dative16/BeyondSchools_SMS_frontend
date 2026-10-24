/**
 * What a screen shows when there is nothing on it, and when something broke.
 *
 * These are separate components on purpose. "No invoices for this term yet" and
 * "we could not reach the server" are different facts, and showing an empty
 * list for the second one is how a bursar concludes that a term run did nothing
 * when really the request failed.
 */

import type { ReactNode } from 'react';

import { Button } from './Button';

export function EmptyState({
  title,
  note,
  action,
}: {
  readonly title: string;
  readonly note?: string;
  readonly action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      <p className="m-0 font-display text-[15px] font-semibold">{title}</p>
      {note ? <p className="m-0 max-w-sm text-[13px] leading-relaxed text-muted">{note}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = 'That did not load',
  detail,
  onRetry,
}: {
  readonly title?: string;
  readonly detail?: string;
  readonly onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center" role="alert">
      <p className="m-0 font-display text-[15px] font-semibold">{title}</p>
      <p className="m-0 max-w-sm text-[13px] leading-relaxed text-muted">
        {detail ?? 'The server did not answer. Nothing was changed.'}
      </p>
      {onRetry ? (
        <Button variant="secondary" size="sm" className="mt-2" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

/** An inline message at the top of a form or a card. */
export function Notice({
  tone = 'bad',
  children,
}: {
  readonly tone?: 'bad' | 'warn' | 'info' | 'ok';
  readonly children: ReactNode;
}) {
  const tones = {
    bad: 'bg-bad-bg text-bad-ink',
    warn: 'bg-warn-bg text-warn-ink',
    info: 'bg-info-bg text-info-ink',
    ok: 'bg-ok-bg text-ok-ink',
  } as const;
  return (
    <p
      role={tone === 'bad' ? 'alert' : 'status'}
      className={`m-0 rounded-control px-3.5 py-2.5 text-[13px] leading-relaxed ${tones[tone]}`}
    >
      {children}
    </p>
  );
}
