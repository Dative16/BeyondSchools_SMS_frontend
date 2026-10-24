/**
 * Where in the term we are. Pure.
 *
 * "Week 4 of Term 1" is the line under the greeting, and it is the most-read
 * sentence on the dashboard: a head teacher checks it against what they
 * believe, and the day they disagree is the day somebody finds the term dates
 * were entered wrong. So it is worth getting right rather than approximating.
 *
 * Every function takes the day as an argument. A rule that reads the clock
 * cannot be tested, and a screen opened at 23:50 in Dar es Salaam must not
 * change its answer at midnight UTC.
 */

export interface TermDates {
  readonly label: string;
  readonly startsOn: string;
  readonly endsOn: string;
}

const DAY = 86_400_000;

/** Midnight, so a comparison is between days and not between moments. */
const dayOf = (value: Date | string): number => {
  const date = typeof value === 'string' ? new Date(`${value}T00:00:00Z`) : value;
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};

/**
 * Which week of the term a day falls in, counting from one.
 *
 * Before the term starts it is 0, which the caller should read as "not yet"
 * rather than printing "Week 0 of Term 1". After it ends the count keeps
 * going, because a school still working in week 15 of a 13-week term wants to
 * see that rather than a capped number that hides it.
 */
export function weekOfTerm(term: TermDates, asOf: Date): number {
  const elapsed = dayOf(asOf) - dayOf(term.startsOn);
  if (elapsed < 0) return 0;
  return Math.floor(elapsed / (7 * DAY)) + 1;
}

export function hasStarted(term: TermDates, asOf: Date): boolean {
  return dayOf(asOf) >= dayOf(term.startsOn);
}

export function hasEnded(term: TermDates, asOf: Date): boolean {
  return dayOf(asOf) > dayOf(term.endsOn);
}

/**
 * The line under the greeting: "Week 4 of Term 1", or what to say instead.
 *
 * Returns null when there is nothing honest to say — no term set, or a term
 * the school has not reached. A dashboard that invents "Week 1" for a term
 * starting in three weeks is a dashboard that will be believed.
 */
export function termProgress(term: TermDates | undefined, asOf: Date): string | null {
  if (!term) return null;
  if (!hasStarted(term, asOf)) return `${term.label} has not started`;
  if (hasEnded(term, asOf)) return `${term.label} has ended`;
  return `Week ${weekOfTerm(term, asOf)} of ${term.label}`;
}

/**
 * Habari is the ordinary Swahili greeting and does not change with the hour,
 * which is the point: an app that says "Good evening" to somebody working late
 * is an app written somewhere else.
 */
export function greeting(fullName: string): string {
  const first = fullName.trim().split(/\s+/)[0];
  return first ? `Habari, ${first}` : 'Habari';
}
