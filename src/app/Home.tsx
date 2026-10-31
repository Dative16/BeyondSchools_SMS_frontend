/**
 * What the index route shows, which depends on who is asking.
 *
 * A separate component rather than a redirect, so that "/" is home for
 * everybody. A parent whose bookmark is the bare domain, and a bursar's, both
 * work — and neither has to learn a path.
 */

import { lazy } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';

const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'));
const ParentHomePage = lazy(() => import('@/features/portal/ParentHomePage'));
const ChildPage = lazy(() => import('@/features/portal/ChildPage'));

export default function Home() {
  const { principal } = useAuth();

  if (principal?.role === 'guardian') return <ParentHomePage />;
  // A pupil's home is their own page: the id comes off the token, not the URL.
  if (principal?.role === 'student') return <ChildPage />;
  return <DashboardPage />;
}
