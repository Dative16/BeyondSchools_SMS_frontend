/**
 * Setting a school up: years, terms, the ladder, classes. Pure.
 *
 * These are the rules a school admin meets while making the system match the
 * school, and nearly all of them are about refusing to guess. A term range
 * that overlaps another, a ladder whose top has nowhere to go, a year that
 * cannot be made current yet — in each case the honest answer is to say what
 * is wrong rather than to pick something.
 *
 * The server owns every one of these answers and checks them again. This copy
 * exists so a form can explain itself before a round trip.
 */

export type YearState = 'closed' | 'current' | 'open' | 'not-set-up';

export interface YearFacts {
  readonly label: string;
  readonly isCurrent: boolean;
  readonly isClosed: boolean;
  readonly termCount: number;
}

/**
 * How a year reads on the list.
 *
 * "Not open yet" and "Open" are different things and the difference matters:
 * a year with no terms cannot have a fee due date worked out or a mark filed,
 * so it is not somewhere a school can be put yet.
 */
export function yearState(year: YearFacts): YearState {
  if (year.isClosed) return 'closed';
  if (year.isCurrent) return 'current';
  return year.termCount === 0 ? 'not-set-up' : 'open';
}

export const YEAR_STATE_LABELS: Record<YearState, string> = {
  closed: 'Closed',
  current: 'Current',
  open: 'Open',
  'not-set-up': 'Not open yet',
};

/** A closed year is read-only everywhere, which is what closing one means. */
export const yearIsEditable = (year: YearFacts): boolean => !year.isClosed;

export interface TermRange {
  readonly index: number;
  readonly label: string;
  readonly startsOn: string;
  readonly endsOn: string;
}

/**
 * Everything wrong with a set of term dates, in the order a person would fix
 * it. Empty means they can be saved.
 *
 * Overlap is the one worth being strict about. Term dates decide which term a
 * mark belongs to and when fees fall due, so two terms covering one day makes
 * both of those questions unanswerable — and a system that picked the first
 * match would be inventing an answer to a question the school had not settled.
 */
export function termProblems(terms: readonly TermRange[], year: { readonly label: string }): string[] {
  const problems: string[] = [];
  const filled = terms.filter((term) => term.startsOn && term.endsOn);

  if (filled.length !== terms.length) {
    problems.push('Every term needs a start and an end date.');
  }

  for (const term of filled) {
    if (new Date(term.endsOn) <= new Date(term.startsOn)) {
      problems.push(`${term.label} ends before it starts.`);
    }
  }

  const ordered = [...filled].sort(
    (a, b) => new Date(a.startsOn).getTime() - new Date(b.startsOn).getTime(),
  );
  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1];
    const current = ordered[index];
    if (previous && current && new Date(current.startsOn) <= new Date(previous.endsOn)) {
      problems.push(
        `${previous.label} and ${current.label} cover the same days. A mark entered then could belong to either.`,
      );
    }
  }

  const outside = filled.filter((term) => !term.startsOn.startsWith(year.label));
  if (outside.length > 0 && /^\d{4}$/.test(year.label)) {
    problems.push(
      `${outside.map((term) => term.label).join(' and ')} ${
        outside.length === 1 ? 'starts' : 'start'
      } outside ${year.label}.`,
    );
  }

  return problems;
}

/**
 * What has to be true before a school can be moved into a year.
 *
 * Shown as a list rather than enforced here, because the school admin needs to
 * know what to go and do. The server refuses the switch on its own terms.
 */
export function beforeYearCanBeCurrent(facts: {
  readonly termCount: number;
  readonly termProblems: readonly string[];
  readonly levelsWithoutFees: readonly string[];
  readonly hasLadderProblems: boolean;
}): string[] {
  const needed: string[] = [];
  if (facts.termCount === 0) needed.push('Term dates, which decide when fees fall due.');
  else if (facts.termProblems.length > 0) needed.push('Term dates that do not overlap.');
  if (facts.levelsWithoutFees.length > 0) {
    needed.push(
      `A published fee structure for ${facts.levelsWithoutFees.join(', ')} — a level without one cannot be invoiced at all.`,
    );
  }
  if (facts.hasLadderProblems) {
    needed.push('A ladder with no gaps, so the promotion run knows where each pupil goes.');
  }
  return needed;
}

// ---------------------------------------------------------------------------
// The ladder
// ---------------------------------------------------------------------------

export type LadderOutcome = 'promote' | 'graduate' | 'undefined';

/** What a row's "goes on to" column says. */
export function goesOnTo(
  outcome: LadderOutcome,
  nextLevelName: string | undefined,
): { readonly text: string; readonly isProblem: boolean } {
  if (outcome === 'graduate') return { text: 'Leaves school', isProblem: false };
  if (outcome === 'promote' && nextLevelName)
    return { text: nextLevelName, isProblem: false };
  // The ladder ran out with no exit level recorded. A configuration mistake
  // rather than an outcome, and the promotion run refuses to guess at it.
  return { text: 'Nowhere — nobody has said', isProblem: true };
}

/**
 * What to say about the levels leaving at the end of a year.
 *
 * Two exit levels is not a mistake here: Tanzania's move from a seven-year
 * primary cycle to six means a school holds two leaving cohorts at once, and
 * December 2027 is when both sit the same examination. The summary says the
 * total out loud because the office orders certificates from it.
 */
export function exitSummary(
  chosen: readonly { readonly name: string; readonly pupils: number }[],
  yearLabel: string,
): string {
  if (chosen.length === 0) {
    return `Nothing is selected, so the ${yearLabel} run would promote every pupil and nobody would leave.`;
  }
  const total = chosen.reduce((sum, level) => sum + level.pupils, 0);
  const names = chosen.map((level) => level.name);
  const listed =
    names.length === 1
      ? names[0]
      : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  const tail =
    chosen.length > 1
      ? ` That is ${total} school leavers in one December instead of one cohort — worth telling the office before they order certificates.`
      : '';
  return `${listed} leave at the end of ${yearLabel} — ${total} pupils in total.${tail}`;
}

// ---------------------------------------------------------------------------
// Classes
// ---------------------------------------------------------------------------

export interface ClassFacts {
  readonly pupils: number;
  readonly capacity: number | null;
}

/** "36 of 40", or just the headcount where nobody has set a capacity. */
export function fillLabel(klass: ClassFacts): string {
  if (klass.capacity === null) return `${klass.pupils} ${klass.pupils === 1 ? 'pupil' : 'pupils'}`;
  return `${klass.pupils} of ${klass.capacity}`;
}

export type Fill = 'empty' | 'room' | 'nearly-full' | 'full' | 'over';

export function fillState(klass: ClassFacts): Fill {
  if (klass.pupils === 0) return 'empty';
  if (klass.capacity === null) return 'room';
  if (klass.pupils > klass.capacity) return 'over';
  if (klass.pupils === klass.capacity) return 'full';
  return klass.capacity - klass.pupils <= 2 ? 'nearly-full' : 'room';
}

/**
 * Why a class cannot take another child, or null.
 *
 * Over capacity is reported rather than treated as impossible: a school that
 * has moved thirty-seven children into a room rated for thirty-five has done
 * that, and the system's job is to describe it.
 */
export function classWarning(klass: ClassFacts): string | null {
  const state = fillState(klass);
  if (state === 'over')
    return `${klass.pupils} pupils in a class set to hold ${klass.capacity ?? 0}. Raise the number of places, or move somebody.`;
  if (state === 'full') return 'Full. The admission form will not offer this class until it is opened up.';
  if (state === 'empty') return null;
  return null;
}

/** How a teacher reads in the picker: what they already hold, and nothing invented. */
export function teacherLoad(teacher: {
  readonly className: string | null;
  readonly subjectsTaught: number;
}): string {
  const parts = [
    teacher.className ? `already has ${teacher.className}` : 'no class',
    teacher.subjectsTaught === 0
      ? 'no subjects'
      : `${teacher.subjectsTaught} ${teacher.subjectsTaught === 1 ? 'subject' : 'subjects'}`,
  ];
  return parts.join(' · ');
}
