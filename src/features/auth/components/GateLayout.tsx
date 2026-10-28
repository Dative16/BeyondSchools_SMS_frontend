/**
 * The frame the three ways-in share: sign in, set a first password, reset a
 * forgotten one.
 *
 * A bar with the school's name, a card, and a column of explanation beside it.
 * The explanation is the part that earns its place: everybody who reaches
 * these pages is either stuck or new, and a sentence that says *why* a code
 * can only go to the number already on file does more than another button
 * would.
 *
 * At phone width the explanation moves below the card rather than
 * disappearing. Somebody on a phone is the likeliest person to be stuck.
 */

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function GateLayout({
  schoolName,
  brandColour,
  action,
  children,
  aside,
}: {
  readonly schoolName: string | undefined;
  readonly brandColour?: string;
  /** The one link in the bar — "Back to sign in", usually. */
  readonly action?: { readonly label: string; readonly to: string };
  readonly children: ReactNode;
  readonly aside?: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="flex flex-none flex-wrap items-center gap-4 border-b border-line bg-white px-5 py-4 sm:px-7">
        <div className="flex items-center gap-2.5">
          <span
            className="inline-block h-[11px] w-[11px] rounded-[3px]"
            style={{ background: brandColour ?? '#22c55e' }}
            aria-hidden="true"
          />
          <span className="font-display text-[17px] font-bold tracking-[-0.01em]">
            BeyondSchools
          </span>
        </div>
        <p className="m-0 min-w-0 flex-[1_1_200px] truncate text-[13px] font-medium text-ink-dim">
          {schoolName ?? ' '}
        </p>
        {action ? (
          <Link
            to={action.to}
            className="inline-flex min-h-11 items-center rounded-control border border-line bg-white px-4 text-[13px] font-medium text-ink no-underline hover:bg-canvas"
          >
            {action.label}
          </Link>
        ) : null}
      </header>

      <div className="flex flex-1 flex-wrap items-start justify-center gap-6 px-4 py-8 sm:px-7 sm:py-12">
        <main className="min-w-0 flex-[0_1_430px] rounded-card border border-line bg-white p-6 sm:p-[28px_30px]">
          {children}
        </main>
        {aside ? (
          <aside className="flex min-w-0 flex-[0_1_340px] flex-col gap-4.5">{aside}</aside>
        ) : null}
      </div>

      <footer className="flex-none px-5 pt-4 pb-6 text-center">
        <p className="m-0 text-xs text-faint">
          {schoolName ? `${schoolName} runs on BeyondSchools` : 'BeyondSchools'}
        </p>
      </footer>
    </div>
  );
}

/** One of the explanation cards in the column beside the form. */
export function GateNote({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}) {
  return (
    <section className="rounded-card border border-line bg-white p-[20px_22px]">
      <h2 className="m-0 mb-2.5 font-display text-[15px] font-semibold">{title}</h2>
      <div className="flex flex-col gap-3 text-[12.5px] leading-relaxed text-muted">
        {children}
      </div>
    </section>
  );
}

/** The two-step bar on "set your first password". */
export function Steps({ at, of }: { readonly at: number; readonly of: number }) {
  return (
    <div
      className="mb-5 flex gap-1.5"
      role="progressbar"
      aria-valuenow={at}
      aria-valuemin={1}
      aria-valuemax={of}
      aria-label={`Step ${at} of ${of}`}
    >
      {Array.from({ length: of }, (_, index) => (
        <span
          key={index}
          className={`h-[5px] flex-1 rounded-[3px] ${index < at ? 'bg-brand' : 'bg-line'}`}
        />
      ))}
    </div>
  );
}

/** The tick a finished flow ends on. */
export function DoneMark() {
  return (
    <span
      aria-hidden="true"
      className="mb-4.5 grid h-13 w-13 place-items-center rounded-[13px] border border-ok-bg bg-brand-soft"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9.5" stroke="#166534" strokeWidth="1.6" />
        <path
          d="M7.8 12.3l3 3 5.4-6"
          stroke="#166534"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
