import { lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';

import { NotFoundPage } from '@/app/Placeholder';
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
const SetPasswordPage = lazy(() => import('@/features/auth/SetPasswordPage'));
const ForgotPasswordPage = lazy(() => import('@/features/auth/ForgotPasswordPage'));
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'));
const StudentsPage = lazy(() => import('@/features/students/StudentsPage'));
const StudentPage = lazy(() => import('@/features/students/StudentPage'));
const ApplyPage = lazy(() => import('@/features/apply/ApplyPage'));
const FeesPage = lazy(() => import('@/features/fees/FeesPage'));
const InvoicePage = lazy(() => import('@/features/fees/InvoicePage'));
const FeeStructureEditorPage = lazy(() => import('@/features/fees/FeeStructureEditorPage'));
const AdmissionsPage = lazy(() => import('@/features/admissions/AdmissionsPage'));
const ApplicationPage = lazy(() => import('@/features/admissions/ApplicationPage'));
const AdmitByHandPage = lazy(() => import('@/features/admissions/AdmitByHandPage'));
const YearsPage = lazy(() => import('@/features/setup/YearsPage'));
const LevelsPage = lazy(() => import('@/features/setup/LevelsPage'));
const ClassesPage = lazy(() => import('@/features/setup/ClassesPage'));

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
          // Before the :studentId route: "new" is not a student id. This is
          // where the "Admit a child" button on three screens has always
          // pointed, and until now there was nothing here.
          { path: 'students/new', element: <AdmitByHandPage /> },
          { path: 'students/:studentId', element: <StudentPage /> },
          { path: 'admissions', element: <AdmissionsPage /> },
          { path: 'admissions/:applicationId', element: <ApplicationPage /> },
          { path: 'fees', element: <FeesPage /> },
          // Before the invoice route, and it has to stay there: both sit one
          // segment under /fees, and "structures" is not an invoice id.
          { path: 'fees/structures/:structureId', element: <FeeStructureEditorPage /> },
          { path: 'fees/:invoiceId', element: <InvoicePage /> },
          { path: 'setup/years', element: <YearsPage /> },
          { path: 'setup/levels', element: <LevelsPage /> },
          { path: 'setup/classes', element: <ClassesPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
  { path: '/login', element: <LoginPage /> },
  // The two ways in for somebody who has no password: one who never had one,
  // and one who has forgotten it. Both are reached without an account, so
  // they sit outside the guard with the login page.
  { path: '/set-password', element: <SetPasswordPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/apply', element: <ApplyPage /> },
]);
