/**
 * Who is signed in, for the whole app.
 *
 * The access token is never in this state and never in localStorage: it lives
 * in a module variable inside the API client, because that token is also what
 * carries a pupil across to the AI platform, and anything in localStorage is
 * readable by every script that ever gets onto the page. What is here is the
 * principal — a name, a role, a list of permissions — which is safe to hold and
 * is what the UI actually needs in order to decide what to draw.
 *
 * `status` has three values rather than two. A booting app is not a signed-out
 * app: the refresh cookie may well produce a session, and a guard that treats
 * "not yet known" as "no" bounces a bursar to the login page on every reload.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import * as auth from './api';
import type { Principal, Session } from './api';
import type { Permission } from '@/types/domain';

type Status = 'booting' | 'signed-in' | 'signed-out';

interface AuthValue {
  readonly status: Status;
  readonly principal: Principal | null;
  readonly signIn: (identifier: string, password: string) => Promise<void>;
  readonly signInWithCode: (phone: string, code: string) => Promise<void>;
  readonly signOut: () => Promise<void>;
  /** Whether this account may do something, as the server told us at sign-in.
   *  Typed off the server's own enum, so a permission that no longer exists
   *  fails the build rather than silently hiding a nav item. */
  readonly can: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthValue | null>(null);

/** Refresh this far before the token expires, so no request races the clock. */
const RENEW_MARGIN_MS = 60_000;

export function AuthProvider({ children }: { readonly children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<Status>('booting');
  const queryClient = useQueryClient();
  const timer = useRef<number | undefined>(undefined);

  const adopt = useCallback((next: Session | null) => {
    setSession(next);
    setStatus(next ? 'signed-in' : 'signed-out');
  }, []);

  // Cold start: trade the refresh cookie for a session. Failing is the normal
  // case for a visitor who is not signed in, so it is not surfaced.
  useEffect(() => {
    let cancelled = false;
    void auth.restore().then((restored) => {
      if (!cancelled) adopt(restored);
    });
    return () => {
      cancelled = true;
    };
  }, [adopt]);

  // Renew a minute before expiry. Without this a bursar part-way through
  // entering receipts gets a 401 on the next save; the client would recover it,
  // but the save would have already looked like it failed.
  useEffect(() => {
    window.clearTimeout(timer.current);
    if (!session) return;

    const delay = Math.max(session.expiresAt - Date.now() - RENEW_MARGIN_MS, 5_000);
    timer.current = window.setTimeout(() => {
      void auth.restore().then(adopt);
    }, delay);

    return () => window.clearTimeout(timer.current);
  }, [session, adopt]);

  const signOut = useCallback(async () => {
    await auth.logout();
    adopt(null);
    // Everything cached was read as somebody. Drop it, or the next person to
    // sign in on a shared office machine sees the last one's roll.
    queryClient.clear();
  }, [adopt, queryClient]);

  const value = useMemo<AuthValue>(() => {
    const permissions = new Set(session?.principal.permissions ?? []);
    return {
      status,
      principal: session?.principal ?? null,
      signIn: async (identifier, password) => {
        adopt(await auth.login(identifier, password));
      },
      signInWithCode: async (phone, code) => {
        adopt(await auth.loginWithOtp(phone, code));
      },
      signOut,
      can: (permission) => permissions.has(permission),
    };
  }, [status, session, adopt, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth was called outside AuthProvider');
  return value;
}
