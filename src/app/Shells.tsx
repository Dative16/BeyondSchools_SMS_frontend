/**
 * Which app a signed-in person actually gets.
 *
 * This is the fix for the hole step F was written to close. Every signed-in
 * route sat under the staff shell, so a guardian who set a password landed on
 * the staff dashboard: a sidebar of screens they may not open, tiles that
 * 403'd, and nothing about their own children anywhere. The server was right
 * throughout — it refused every request — which is exactly why nobody noticed
 * from the API side.
 *
 * Staff get the staff shell. A guardian or a pupil gets the portal. Anything
 * else — an applicant whose session is for the public form — is sent to the
 * form, because the staff app has nothing in it for them either.
 */

import { Navigate } from 'react-router-dom';

import AppShell from '@/app/AppShell';
import { useAuth } from '@/features/auth/AuthProvider';
import PortalShell from '@/features/portal/PortalShell';

export function RoleShell() {
  const { principal } = useAuth();
  const role = principal?.role;

  if (role === 'guardian' || role === 'student') return <PortalShell />;
  if (role === 'applicant') return <Navigate to="/apply" replace />;
  return <AppShell />;
}

/**
 * A route a guardian or pupil must never reach, and the other way round.
 *
 * Not a security boundary — the server checks every request — but a person
 * sent to a screen that will refuse them has been told the app is broken.
 * This sends them home instead, which is where everything they can do is.
 */
export function StaffOnly({ children }: { readonly children: React.ReactNode }) {
  const { principal } = useAuth();
  if (principal?.role === 'guardian' || principal?.role === 'student') {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export function FamilyOnly({ children }: { readonly children: React.ReactNode }) {
  const { principal } = useAuth();
  if (principal && principal.role !== 'guardian' && principal.role !== 'student') {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
