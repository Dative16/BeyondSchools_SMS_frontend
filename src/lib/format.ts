/** Formatting the whole app shares. Money and dates are the ones people notice. */

const TZS = new Intl.NumberFormat('en-TZ', {
  style: 'currency',
  currency: 'TZS',
  maximumFractionDigits: 0,
});

const TZS_PLAIN = new Intl.NumberFormat('en-TZ', { maximumFractionDigits: 0 });

/** "TZS 320,000" — for totals a parent or bursar reads once. */
export const money = (amount: number): string => TZS.format(amount);

/** "320,000" — for table columns where the header already says TZS. */
export const amount = (value: number): string => TZS_PLAIN.format(value);

/** "38.4M" — for stat tiles only; never for anything that must reconcile. */
export function compactMoney(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${Math.round(value / 1_000)}K`;
  return TZS_PLAIN.format(value);
}

const DATE = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Africa/Dar_es_Salaam',
});

export const longDate = (iso: string): string => DATE.format(new Date(iso));

/** Tanzanian mobile numbers, displayed the way people write them: 0754 118 902 */
export function msisdn(raw: string): string {
  const digits = raw.replace(/\D/g, '').replace(/^255/, '0');
  return digits.replace(/^(\d{4})(\d{3})(\d{3})$/, '$1 $2 $3');
}
