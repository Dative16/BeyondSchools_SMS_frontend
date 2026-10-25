/**
 * Reading a child's record. Pure.
 *
 * The one rule here that matters is `ageOn`. A profile that says "8 years"
 * when the child is seven is a profile a class teacher stops trusting, and
 * every naive implementation — days divided by 365.25, or subtracting the
 * years — is wrong on a birthday or in a leap year. So it does what a person
 * does: subtract the years, then take one back if the birthday has not come
 * round yet.
 */

export type StudentStatus =
  | 'prospective'
  | 'active'
  | 'alumnus'
  | 'transferred_out'
  | 'withdrawn'
  | 'deceased';

export type EnrolmentOutcome =
  | 'active'
  | 'promoted'
  | 'repeated'
  | 'graduated'
  | 'transferred_out'
  | 'withdrawn';

export type Tone = 'ok' | 'warn' | 'bad' | 'info' | 'neutral';

const parts = (value: Date | string): [number, number, number] => {
  const date = typeof value === 'string' ? new Date(`${value}T00:00:00Z`) : value;
  return [date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()];
};

/** Completed years, counted the way a person counts them. */
export function ageOn(dateOfBirth: string, asOf: Date): number {
  const [by, bm, bd] = parts(dateOfBirth);
  const [ny, nm, nd] = parts(asOf);
  const years = ny - by;
  const hadBirthday = nm > bm || (nm === bm && nd >= bd);
  return Math.max(hadBirthday ? years : years - 1, 0);
}

/** "8 years", "1 year", "11 months" for a child too young for the first. */
export function ageLabel(dateOfBirth: string, asOf: Date): string {
  const years = ageOn(dateOfBirth, asOf);
  if (years >= 1) return `${years} ${years === 1 ? 'year' : 'years'}`;
  const [by, bm] = parts(dateOfBirth);
  const [ny, nm] = parts(asOf);
  const months = Math.max((ny - by) * 12 + (nm - bm), 0);
  return `${months} ${months === 1 ? 'month' : 'months'}`;
}

export function statusPill(status: StudentStatus): { label: string; tone: Tone } {
  switch (status) {
    case 'active':
      return { label: 'Active', tone: 'ok' };
    case 'prospective':
      return { label: 'Prospective', tone: 'info' };
    case 'alumnus':
      return { label: 'Alumnus', tone: 'neutral' };
    case 'transferred_out':
      return { label: 'Transferred out', tone: 'neutral' };
    case 'withdrawn':
      return { label: 'Withdrawn', tone: 'warn' };
    case 'deceased':
      // Shown plainly and without a colour that reads as a warning. Somebody
      // in an office will open this record, and the pill is not the place to
      // editorialise.
      return { label: 'Deceased', tone: 'neutral' };
  }
}

export function outcomePill(
  outcome: EnrolmentOutcome,
  isRepeating: boolean,
): { label: string; tone: Tone } {
  switch (outcome) {
    case 'active':
      return { label: isRepeating ? 'Repeating' : 'Active', tone: isRepeating ? 'warn' : 'ok' };
    case 'promoted':
      return { label: 'Promoted', tone: 'neutral' };
    case 'repeated':
      return { label: 'Repeated', tone: 'warn' };
    case 'graduated':
      return { label: 'Graduated', tone: 'info' };
    case 'transferred_out':
      return { label: 'Transferred out', tone: 'neutral' };
    case 'withdrawn':
      return { label: 'Withdrawn', tone: 'warn' };
  }
}

/**
 * The initials in the avatar. Two letters, from the first and last name — the
 * same rule the top bar uses, so one person looks like one person.
 */
export function initialsOf(first: string, surname: string): string {
  const a = first.trim()[0] ?? '';
  const b = surname.trim()[0] ?? '';
  return (a + b).toUpperCase() || '?';
}

/**
 * Where a child's record is still incomplete, in the order a registrar would
 * chase it. A guardian with no phone number outranks a missing photograph:
 * one of them means nobody can be rung when the child is ill.
 */
export function missingFirst(
  items: readonly { key: string; label: string; required: boolean; done: boolean }[],
): readonly { key: string; label: string; required: boolean; done: boolean }[] {
  return [...items]
    .filter((item) => !item.done)
    .sort((a, b) => Number(b.required) - Number(a.required));
}
