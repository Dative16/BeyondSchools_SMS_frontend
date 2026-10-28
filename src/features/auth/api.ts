/**
 * The auth calls, typed off the server's own OpenAPI schema.
 *
 * Nothing here holds a rule. Whether a password is good enough, whether an
 * account is locked, how long a code lasts — all of that is the server's, and
 * a copy of it here would be a second opinion that can disagree.
 */

import { api, setAccessToken } from '@/api/client';
import type { components } from '@/api/schema';

export type Principal = components['schemas']['PrincipalResponse'];
export type SchoolBrand = components['schemas']['SchoolBrandResponse'];
type TokenResponse = components['schemas']['TokenResponse'];
export type OtpSent = components['schemas']['OtpSentResponse'];

export interface Session {
  readonly principal: Principal;
  /** Epoch milliseconds. Used to refresh ahead of expiry, not to trust the token. */
  readonly expiresAt: number;
}

const sessionFrom = (token: TokenResponse): Session => {
  setAccessToken(token.access_token);
  return {
    principal: token.principal,
    expiresAt: Date.parse(token.expires_at),
  };
};

/** The school on this subdomain, for the login page. No account needed. */
export const fetchBranding = (): Promise<SchoolBrand> => api<SchoolBrand>('/auth/school');

/**
 * `remember` is the "keep me signed in" box, and unticked is the ordinary case
 * on a handset a family shares: the server gives a working day instead of a
 * fortnight.
 */
export async function login(
  identifier: string,
  password: string,
  remember = true,
): Promise<Session> {
  return sessionFrom(
    await api<TokenResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password, remember }),
    }),
  );
}

/**
 * A guardian signs in with a code by SMS rather than a password they would
 * forget. The answer is the same for a number the school holds and a
 * stranger's, so there is nothing here to tell them apart by.
 */
export const startOtp = (phone: string): Promise<OtpSent> =>
  api<OtpSent>('/auth/otp/start', {
    method: 'POST',
    body: JSON.stringify({ phone, purpose: 'login' }),
  });

export async function loginWithOtp(phone: string, code: string): Promise<Session> {
  return sessionFrom(
    await api<TokenResponse>('/auth/otp/login', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    }),
  );
}

/**
 * Ask for a code to set or reset a password.
 *
 * Answers the same way whether or not the number belongs to anybody at the
 * school. A different answer would make this page a way to ask which families
 * a school has.
 */
export const startPasswordReset = (phone: string): Promise<OtpSent> =>
  api<OtpSent>('/auth/otp/start', {
    method: 'POST',
    body: JSON.stringify({ phone, purpose: 'password_reset' }),
  });

/**
 * Set a password by proving the phone instead of knowing the old one.
 *
 * Serves both screens that need it: somebody who has forgotten a password
 * cannot supply the current one, and somebody setting their first never had
 * one. Nothing comes back — the caller signs in with what it just set, which
 * is the step that catches a password typed wrong twice.
 */
export const setPasswordWithCode = (
  phone: string,
  code: string,
  newPassword: string,
): Promise<void> =>
  api<void>('/auth/password/reset', {
    method: 'POST',
    body: JSON.stringify({ phone, code, new_password: newPassword }),
  });

/**
 * Trade the refresh cookie for a session on a cold start.
 *
 * This is what makes a reload survive: the access token lives in memory and is
 * gone, but the httpOnly refresh cookie is not, so the app can come back
 * without asking for a password again. A failure here is the ordinary case for
 * a signed-out visitor, not an error worth showing.
 */
export async function restore(): Promise<Session | null> {
  try {
    return sessionFrom(await api<TokenResponse>('/auth/refresh', { method: 'POST' }));
  } catch {
    setAccessToken(null);
    return null;
  }
}

export async function logout(): Promise<void> {
  try {
    await api<void>('/auth/logout', { method: 'POST' });
  } finally {
    // Whatever the server said, this device is signed out.
    setAccessToken(null);
  }
}

export const fetchMe = (): Promise<Principal> => api<Principal>('/auth/me');
