/**
 * Reading a roll row and a queue card. Pure.
 *
 * Two things here that are worth not deciding inside a component.
 *
 * A fee pill is a reading of a balance against a due date, and the roll sends
 * no due date — only totals. So `feePillFrom` is honest about what it can and
 * cannot say: with a balance and no date it can distinguish "owes nothing"
 * from "owes something", and it will not claim arrears it has not been told
 * about. The server's `fee_status` filter is what knows the difference; this
 * only labels what came back.
 *
 * And a queue flag is the registrar's first glance at an application. It says
 * what to do next, not what state a machine thinks it is in.
 */

export type FeeLabel = 'Settled' | 'Part paid' | 'In arrears' | 'Not billed';
export type FeeTone = 'ok' | 'warn' | 'bad' | 'neutral';

export interface FeePill {
  readonly label: FeeLabel;
  readonly tone: FeeTone;
}

/**
 * What to show in the roll's FEES column.
 *
 * `overdue` is passed separately because the roll does not carry due dates: a
 * caller that filtered by `fee_status=in_arrears` knows every row is overdue,
 * and a caller that did not cannot know for any row. Defaulting it to false
 * means the pill under-claims rather than over-claims, which is the right way
 * round — telling a parent they are in arrears when they are not is worse
 * than not telling them.
 */
export function feePillFrom(
  billed: number,
  settled: number,
  overdue = false,
): FeePill {
  if (billed <= 0) return { label: 'Not billed', tone: 'neutral' };
  if (settled >= billed) return { label: 'Settled', tone: 'ok' };
  if (overdue) return { label: 'In arrears', tone: 'bad' };
  return { label: 'Part paid', tone: 'warn' };
}

export type QueueFlag =
  | 'Ready to offer'
  | 'Possible duplicate'
  | 'Transfer in'
  | 'Needs screening';

export interface QueueFacts {
  readonly state: string;
  readonly duplicateScore: number | null;
  readonly previousSchool: string | null;
  readonly documentsHeld: number;
}

/** Matches the server's own threshold: below 70 is a coincidence, not a match. */
export const DUPLICATE_FLAG = 70;

/**
 * The one-word verdict at the top of a queue card.
 *
 * Ordered by what stops a registrar: a duplicate has to be resolved before
 * anything else, because offering a place to a child who already has one
 * creates a second record that two terms of marks will then be split across.
 */
export function queueFlag(facts: QueueFacts): { flag: QueueFlag; tone: FeeTone } {
  if ((facts.duplicateScore ?? 0) >= DUPLICATE_FLAG) {
    return { flag: 'Possible duplicate', tone: 'warn' };
  }
  if (facts.state === 'submitted') {
    return { flag: 'Needs screening', tone: 'neutral' };
  }
  if (facts.previousSchool) {
    return { flag: 'Transfer in', tone: 'neutral' };
  }
  return { flag: 'Ready to offer', tone: 'ok' };
}

/** "4 days", "today", "1 day" — the waiting line on a queue card. */
export function waitedFor(days: number): string {
  if (days <= 0) return 'today';
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}

/** "Neema Grace Mwanjala", with no double spaces when there is no middle name. */
export function fullName(
  first: string,
  middle: string | null | undefined,
  surname: string,
): string {
  return [first, middle, surname].filter(Boolean).join(' ');
}
