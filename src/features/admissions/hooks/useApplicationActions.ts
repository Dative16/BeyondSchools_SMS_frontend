/**
 * What the action cards need that they may not reach themselves.
 *
 * A feature's components cannot import `@/api/client` — a component that
 * fetches can only be tested by rendering it. The mutations live in
 * `@/api/queries/admissions` and are re-exported here so each card has one
 * import; the two helpers below are what is actually written here, and they
 * are the part worth testing without a DOM.
 */

import { ApiError } from '@/api/client';

export {
  useDecline,
  useEnrol,
  useOffer,
  useRecordDeposit,
  useScreen,
} from '@/api/queries/admissions';

/**
 * What to put on screen when a step is refused.
 *
 * The server's own sentence when it gave one. "still needed: guardian_phone"
 * tells a registrar what to go and fix; "that failed" sends them to ring
 * somebody. The fallback covers a network that simply went away.
 */
export const messageOf = (caught: unknown, fallback: string): string =>
  caught instanceof ApiError ? caught.detail : fallback;

/** One field out of a form, trimmed, with empty meaning "not set". */
export function fieldOf(form: FormData, key: string): string | null {
  const raw = form.get(key);
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed === '' ? null : trimmed;
}
