/**
 * The gate on the staff shell.
 *
 * It waits while the session is still being worked out, rather than redirecting
 * — a guard that treats "booting" as "signed out" throws a bursar back to the
 * login page on every page reload, which is the sort of thing that makes people
 * stop trusting an app.
 *
 * It is not a security boundary. Every route it protects is also protected by
 * the server, which checks the token and the school on every request. This only
 * decides what to draw.
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from './AuthProvider';

export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'booting') return <Booting />;

  if (status === 'signed-out') {
    // Remember where they were going, so signing in lands them there rather
    // than on the dashboard.
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  return <Outlet />;
}

function Booting() {
  return (
    <div className="grid min-h-dvh place-items-center bg-canvas">
      <p className="text-sm text-muted" role="status">
        Signing you in&hellip;
      </p>
    </div>
  );
}
