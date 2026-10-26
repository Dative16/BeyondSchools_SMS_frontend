import { lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';

import { NotFoundPage, PlaceholderPage } from '@/app/Placeholder';
import { RequireAuth } from '@/features/auth/RequireAuth';

/**
 * Two shells, deliberately separate.
 *
 * The staff shell is behind auth and shows the sidebar. The public shell is the
 * self-registration form a parent reaches with no account at all — it must load
 * fast on a weak connection, so it shares no layout chrome with the staff app.
 *
 * The shell and the login page are split apart on purpose: the bundle somebody
 * downloads on a phone in order to sign in should not also contain the fees
 * screens. The placeholders below are replaced one at a time as each screen
 * lands; the routes exist now so the nav, the guard and the lazy boundaries are
 * real rather than theoretical.
 */
const AppShell = lazy(() => import('@/app/AppShell'));
const LoginPage = lazy(() => import('@/features/auth/LoginPage'));
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'));
const StudentsPage = lazy(() => import('@/features/students/StudentsPage'));
const StudentPage = lazy(() => import('@/features/students/StudentPage'));
const ApplyPage = lazy(() => import('@/features/apply/ApplyPage'));
const FeesPage = lazy(() => import('@/features/fees/FeesPage'));
const InvoicePage = lazy(() => import('@/features/fees/InvoicePage'));

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'students', element: <StudentsPage /> },
          { path: 'students/:studentId', element: <StudentPage /> },
          {
            path: 'admissions',
            element: (
              <PlaceholderPage title="Admissions" note="The review queue and the funnel." />
            ),
          },
          { path: 'fees', element: <FeesPage /> },
          { path: 'fees/:invoiceId', element: <InvoicePage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  { path: '/apply', element: <ApplyPage /> },
]);
