/**
 * The bar across the top.
 *
 * It carries three live facts, not decoration: which school you are in, which
 * term the school thinks it is, and who you are signed in as. The term pill in
 * particular is load-bearing — every figure on every screen below is scoped to
 * a term, and a bursar reading Term 1 numbers believing they are Term 2's is
 * the kind of mistake that is only caught at the end of a month.
 *
 * At phone width the school name and the term drop to a second row rather than
 * being truncated to nothing, and the nav collapses behind the one button on
 * the left.
 */

import { Link } from 'react-router-dom';

import { BellIcon, LogoutIcon, MenuIcon } from '@/components/icons';
import { Pill } from '@/components/ui';

interface Props {
  readonly schoolName: string | undefined;
  readonly termLabel: string | undefined;
  readonly userName: string;
  readonly roleLabel: string;
  readonly onOpenNav: () => void;
  readonly onSignOut: () => void;
}

export function TopBar({
  schoolName,
  termLabel,
  userName,
  roleLabel,
  onOpenNav,
  onSignOut,
}: Props) {
  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-line bg-white px-4 py-3.5 sm:px-7">
      <button
        type="button"
        aria-label="Open the menu"
        onClick={onOpenNav}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-control border border-line text-ink-dim lg:hidden"
      >
        <MenuIcon />
      </button>

      <Link to="/" className="flex shrink-0 items-center gap-2.5 no-underline">
        <span className="inline-block h-[11px] w-[11px] rounded-[3px] bg-brand" aria-hidden="true" />
        <span className="font-display text-[17px] font-bold tracking-[-0.01em] text-ink">
          BeyondSchools
        </span>
        <span className="hidden rounded border border-line px-1.5 py-0.5 text-[11px] font-semibold tracking-[0.07em] text-muted sm:inline">
          SMS
        </span>
      </Link>

      <div className="order-last flex w-full min-w-0 items-center gap-2.5 sm:order-none sm:w-auto sm:flex-1">
        <span className="min-w-0 truncate text-sm font-medium text-ink">
          {schoolName ?? <span className="text-muted">Loading&hellip;</span>}
        </span>
        {termLabel ? (
          <Pill tone="ok" className="shrink-0">
            {termLabel}
          </Pill>
        ) : null}
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
        <button
          type="button"
          aria-label="Notifications"
          className="grid h-11 w-11 place-items-center rounded-control border border-line text-ink-dim hover:bg-canvas"
        >
          <BellIcon width={17} height={17} />
        </button>
        <div className="flex items-center gap-2.5">
          <span
            className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-ink text-[13px] font-semibold text-white"
            aria-hidden="true"
          >
            {initials(userName)}
          </span>
          <span className="hidden text-[13px] font-medium text-ink-dim md:inline">{roleLabel}</span>
          <span className="sr-only">Signed in as {userName}</span>
        </div>
        {/* Below `sm` this does not fit beside the wordmark, and the bar wraps
            to a third row. It lives at the foot of the nav drawer there, which
            is where a phone user looks for it anyway. */}
        <button
          type="button"
          aria-label="Sign out"
          onClick={onSignOut}
          className="hidden h-11 w-11 place-items-center rounded-control border border-line text-ink-dim hover:bg-canvas sm:grid"
        >
          <LogoutIcon width={17} height={17} />
        </button>
      </div>
    </header>
  );
}

/** "Datius Mwakalebela" becomes DM. One name becomes its first two letters. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return (parts[0] ?? '').slice(0, 2).toUpperCase();
  return `${parts[0]?.[0] ?? ''}${parts.at(-1)?.[0] ?? ''}`.toUpperCase();
}
