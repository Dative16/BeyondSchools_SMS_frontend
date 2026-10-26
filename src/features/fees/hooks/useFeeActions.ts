/**
 * What the invoice screen's dialogs need that they may not reach themselves.
 *
 * A feature's components may not import `@/api/client` — a component that
 * fetches can only be tested by rendering it. The mutations live in
 * `@/api/queries/fees` and are re-exported here so the dialogs have one import
 * each; what is actually written here is the pair of helpers, which are the
 * part worth testing without a DOM.
 */

import { ApiError } from '@/api/client';

export {
  useCreditNote,
  useMatchSuspense,
  useRecordPayment,
  useTermRun,
  useVoidInvoice,
} from '@/api/queries/fees';

/**
 * What to put on screen when a mutation fails.
 *
 * The server's own sentence when it gave one. "Money has been paid against
 * this invoice; write a credit note instead" tells a bursar what to do next,
 * and a generic "that failed" does not. The fallback covers a network that
 * simply went away, which is the only case the server has no opinion about.
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
