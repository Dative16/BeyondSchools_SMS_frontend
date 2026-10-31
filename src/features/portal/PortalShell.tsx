/**
 * The shell a guardian or a pupil sees.
 *
 * Separate from the staff shell, and not because of styling. The staff shell
 * fetches the application queue and draws a sidebar of screens a parent may
 * not open; a guardian who signed in got all of it, every route in it 403'd,
 * and the dashboard underneath showed almost nothing. That was the hole this
 * step closes.
 *
 * No navigation. There are three destinations — home, a child's page, my
 * account — and they are reachable from the content. A nav bar of three items
 * on a 360px screen is a nav bar that costs a sixth of the viewport to say
 * what the page already says.
 */

import { Suspense } from 'react';
import { Link, Outlet } from 'react-router-dom';

import { useCurrentTerm, useSchool } from '@/api/queries/school';
import { OfflineBanner } from '@/components/layout/OfflineBanner';
import { initials } from '@/domain/portal';
import { useAuth } from '@/features/auth/AuthProvider';

export default function PortalShell() {
  const { principal } = useAuth();
  const school = useSchool();
  const term = useCurrentTerm();

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-3 px-4 py-3 sm:px-7">
          <Link to="/" className="flex min-w-0 items-center gap-2 no-underline">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 flex-none rounded-sm bg-brand-strong"
            />
            <span className="font-display text-[15px] font-bold tracking-[-0.01em] text-ink">
              BeyondSchools
            </span>
          </Link>

          <p className="m-0 hidden min-w-0 flex-1 truncate text-[13px] font-medium text-ink-dim sm:block">
            {school.data?.name}
            {term.label ? ` · ${term.label}` : null}
          </p>

          <Link
            to="/me"
            className="ml-auto flex flex-none items-center gap-2.5 no-underline"
            aria-label="My account"
          >
            <span className="hidden text-[13px] font-medium text-ink-dim sm:inline">
              {principal?.full_name}
            </span>
            <span
              aria-hidden="true"
              className="grid h-9 w-9 place-items-center rounded-full bg-ink text-xs font-semibold text-white"
            >
              {initials(principal?.full_name)}
            </span>
          </Link>
        </div>
        <p className="m-0 px-4 pb-2.5 text-[12.5px] text-muted sm:hidden">
          {school.data?.name}
          {term.label ? ` · ${term.label}` : null}
        </p>
      </header>

      <OfflineBanner />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-5 pb-10 sm:px-7">
        <Suspense
          fallback={
            <p className="text-sm text-muted" role="status">
              Loading&hellip;
            </p>
          }
        >
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
