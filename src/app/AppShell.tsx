/**
 * The staff shell: the bar, the nav, and whatever route is showing.
 *
 * It fetches what the chrome needs — the school, the current term, the count of
 * waiting applications — and nothing a page needs. A shell that fetched a
 * page's data would make every screen wait for the slowest thing on any screen.
 *
 * `Suspense` with a lazy `Outlet` is what keeps the shell painted while a route
 * chunk arrives: on a 3G connection the difference between a blank page and the
 * nav already being there is whether the app feels broken.
 *
 * It lives in `src/app/` rather than `src/components/` because it fetches, and
 * a component that fetches is not a primitive. The three pieces it is made of
 * — the bar, the nav, the offline notice — take everything as props and stay
 * where primitives belong.
 */

import { Suspense, useState } from 'react';
import { Outlet } from 'react-router-dom';

import { useCurrentTerm, useSchool, useWaitingApplications } from '@/api/queries/school';
import { useAuth } from '@/features/auth/AuthProvider';

import { OfflineBanner } from '@/components/layout/OfflineBanner';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { visibleNav } from '@/components/layout/nav';

const ROLE_LABELS: Record<string, string> = {
  platform_admin: 'Platform admin',
  school_admin: 'School admin',
  head_of_academics: 'Head of academics',
  bursar: 'Bursar',
  class_teacher: 'Class teacher',
  subject_teacher: 'Subject teacher',
  guardian: 'Parent',
  student: 'Student',
  applicant: 'Applicant',
};

export default function AppShell() {
  const { principal, can, signOut } = useAuth();
  const [navOpen, setNavOpen] = useState(false);

  const school = useSchool();
  const term = useCurrentTerm();
  const groups = visibleNav(can);
  const waiting = useWaitingApplications(can('admission:review'));

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <TopBar
        schoolName={school.data?.name}
        termLabel={term.label}
        userName={principal?.full_name ?? ''}
        roleLabel={ROLE_LABELS[principal?.role ?? ''] ?? ''}
        onOpenNav={() => setNavOpen(true)}
        onSignOut={() => void signOut()}
      />
      <OfflineBanner />

      <div className="flex flex-1 items-stretch">
        <Sidebar
          groups={groups}
          badges={{ admissions: waiting.data }}
          open={navOpen}
          onClose={() => setNavOpen(false)}
          onSignOut={() => void signOut()}
        />
        <main className="min-w-0 flex-1 px-4 pt-6 pb-10 sm:px-7">
          <Suspense fallback={<RouteLoading />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}

function RouteLoading() {
  return (
    <p className="text-sm text-muted" role="status">
      Loading&hellip;
    </p>
  );
}
