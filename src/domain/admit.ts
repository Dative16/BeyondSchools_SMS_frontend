/**
 * Admitting a child at the counter. Pure.
 *
 * Everything here takes facts and returns an answer, so the rules a registrar
 * meets at a desk can be tested in milliseconds rather than by typing a
 * family in. The server checks all of it again and its answer is the one that
 * counts; this exists so a disabled button can say why.
 */

export type Sex = 'f' | 'm';

export interface ChildFacts {
  readonly firstName: string;
  readonly surname: string;
  readonly dateOfBirth: string;
  readonly sex: Sex | null;
}

export interface GuardianFacts {
  readonly fullName: string;
  readonly phone: string;
}

/**
 * Whether a class can take another child.
 *
 * A class with no capacity set is not full — a school that has not said how
 * many fit in a room has not said the room is full either, and refusing an
 * admission on a number nobody entered would be the system inventing a rule.
 */
export interface ClassPlace {
  readonly capacity: number | null;
  readonly pupils: number;
}

export const placesLeft = (klass: ClassPlace): number | null =>
  klass.capacity === null ? null : Math.max(klass.capacity - klass.pupils, 0);

export const hasRoom = (klass: ClassPlace): boolean => {
  const left = placesLeft(klass);
  return left === null || left > 0;
};

/** "4 places left", or what to say when nobody has set a capacity. */
export function placesLabel(klass: ClassPlace): string {
  const left = placesLeft(klass);
  if (left === null) return `${klass.pupils} ${klass.pupils === 1 ? 'pupil' : 'pupils'}`;
  if (left === 0) return 'Full';
  return `${left} ${left === 1 ? 'place' : 'places'} left`;
}

/**
 * A Tanzanian mobile number as the API wants it: ten digits, leading zero.
 *
 * The same rule as the public form's, because this number is a credential —
 * it is how the family will sign in — and a mistyped one hands the account to
 * whoever owns the number that was typed. A registrar reads it back to the
 * parent; the least this can do is not care where they put the spaces.
 */
export function normalisePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('255')) return `0${digits.slice(3)}`;
  if (digits.length === 9 && !digits.startsWith('0')) return `0${digits}`;
  return digits;
}

export const isPhonePlausible = (raw: string): boolean =>
  /^0[67]\d{8}$/.test(normalisePhone(raw));

export const RELATIONSHIPS = [
  { value: 'mother', label: 'Mother' },
  { value: 'father', label: 'Father' },
  { value: 'grandparent', label: 'Grandparent' },
  { value: 'aunt_uncle', label: 'Aunt or uncle' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'legal_guardian', label: 'Legal guardian' },
  { value: 'sponsor', label: 'Sponsor' },
  { value: 'other', label: 'Other' },
] as const;

export const STEPS = ['child', 'class', 'guardian'] as const;
export type StepId = (typeof STEPS)[number];

export const STEP_NAMES: Record<StepId, string> = {
  child: 'The child',
  class: 'Class',
  guardian: 'Guardian',
};

export const stepIndex = (step: StepId): number => STEPS.indexOf(step);

/** The next step, or null when this is the last one. */
export const stepAfter = (step: StepId): StepId | null =>
  STEPS[stepIndex(step) + 1] ?? null;

/** The previous step, or null when this is the first. */
export const stepBefore = (step: StepId): StepId | null =>
  stepIndex(step) === 0 ? null : (STEPS[stepIndex(step) - 1] ?? null);

/**
 * Why a step cannot be left yet, or null.
 *
 * Unlike the public application form, this one does block. A parent filling
 * the form in at home can abandon it half-done and the school still learns
 * their child exists; a registrar at a counter is creating a pupil record, an
 * enrolment and a bill in one irreversible go, and a half-typed name on a
 * birth certificate is not something to find out about in March.
 */
export function stepProblem(
  step: StepId,
  facts: { readonly child: ChildFacts; readonly guardian: GuardianFacts; readonly classId: string },
  today: Date,
): string | null {
  if (step === 'child') {
    if (!facts.child.firstName.trim() || !facts.child.surname.trim())
      return 'A first name and a surname, copied from the birth certificate.';
    if (!facts.child.dateOfBirth) return 'The date of birth is needed.';
    const born = new Date(facts.child.dateOfBirth);
    if (Number.isNaN(born.getTime())) return 'That date of birth cannot be read.';
    if (born > today) return 'That date of birth is in the future.';
    if (born.getFullYear() < 1920) return 'Check the year on that date of birth.';
    if (!facts.child.sex) return 'Girl or boy.';
    return null;
  }
  if (step === 'class') {
    return facts.classId ? null : 'Choose the class this child is joining.';
  }
  if (!facts.guardian.fullName.trim()) return 'The guardian’s full name is needed.';
  if (!isPhonePlausible(facts.guardian.phone))
    return 'That does not look like a Tanzanian mobile number. Read it back to them.';
  return null;
}

/**
 * What the family's login ended up being, in words.
 *
 * The staff case is the one worth saying out loud. A teacher whose own child
 * joins keeps their staff account rather than being demoted to a guardian, so
 * they reach the child through their own login and not a parent one.
 */
export function loginOutcome(login: string): string {
  if (login === 'created') return 'A login was made for that number. They sign in by one-time code.';
  if (login === 'promoted')
    return 'The account that number already had is now the family’s login.';
  if (login === 'linked' || login === 'already a guardian')
    return 'That number already signs in here, and now reaches this child too.';
  if (login.startsWith('left as '))
    return `That number belongs to a ${login.slice('left as '.length).replace(/_/g, ' ')} account, which was left as it is. They reach this child through their own login.`;
  return login;
}
