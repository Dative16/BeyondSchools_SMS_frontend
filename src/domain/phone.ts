/**
 * Tanzanian mobile numbers. Pure.
 *
 * Lived in `apply.ts` until the sign-in screens needed it too. A phone number
 * is now the credential for every account in the system, so where it is
 * cleaned up matters: three screens send one to the server and all three have
 * to send the same characters, or a parent who typed +255 on Monday and 0 on
 * Tuesday has two different logins as far as the server is concerned.
 */

/**
 * The one form the server stores.
 *
 * People write their own number six ways: 0754118902, +255754118902,
 * 255 754 118 902, 0754 118 902. All of them are the same number, and a form
 * that rejects five of them loses the person rather than fixing the input.
 */
export function normalisePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('255')) return `0${digits.slice(3)}`;
  if (digits.startsWith('0')) return digits;
  if (digits.length === 9) return `0${digits}`;
  return digits;
}

/**
 * Whether it could be a Tanzanian mobile at all.
 *
 * Checked before sending a code, not to be strict but to catch the landline
 * somebody types out of habit — an SMS to one never arrives and the silence
 * looks like the system being broken.
 */
export function looksLikePhone(raw: string): boolean {
  return /^0[67]\d{8}$/.test(normalisePhone(raw));
}

/** "0754 118 902" — how a number is written down, for reading back. */
export function spacedPhone(raw: string): string {
  const digits = normalisePhone(raw);
  return digits.replace(/^(\d{4})(\d{3})(\d{3})$/, '$1 $2 $3');
}
