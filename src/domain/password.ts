/**
 * Choosing a password. Pure.
 *
 * Three screens now ask somebody to pick one — first sign-in, forgotten
 * password, and changing it from the account page — and all three have to
 * quote the same minimum as the server enforces. A screen that says eight and
 * a server that wants ten is a form that refuses a password it had just
 * called long enough, which is the kind of thing people give up on.
 *
 * The number lives here and the server's lives in `app/domain/identity.py`.
 * They have to agree; a test on each side pins its own, and the server is the
 * one that counts.
 */

export const MIN_PASSWORD_LENGTH = 10;

/**
 * Why this password will not do, or null.
 *
 * Length only. A rule about punctuation and capitals produces "Passw0rd!" and
 * a note on the back of a phone case; length is the one requirement that
 * actually costs an attacker anything, and it is the one somebody can satisfy
 * with three ordinary words.
 */
export function passwordProblem(password: string): string | null {
  if (password.length === 0) return null;
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Too short: ${password.length} of ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return null;
}

/** What to show under the box as somebody types. */
export function passwordHint(password: string): {
  readonly text: string;
  readonly tone: 'muted' | 'ok' | 'warn';
} {
  if (password.length === 0) {
    return { text: `${MIN_PASSWORD_LENGTH} characters or more.`, tone: 'muted' };
  }
  const problem = passwordProblem(password);
  return problem ? { text: problem, tone: 'warn' } : { text: 'Long enough.', tone: 'ok' };
}

/**
 * Whether the two boxes agree. Only once the second has something in it —
 * telling somebody the passwords do not match before they have typed the
 * second one is noise.
 */
export const passwordsMatch = (password: string, again: string): boolean =>
  again.length > 0 && password === again;

export const canSetPassword = (password: string, again: string): boolean =>
  passwordProblem(password) === null &&
  password.length >= MIN_PASSWORD_LENGTH &&
  passwordsMatch(password, again);
