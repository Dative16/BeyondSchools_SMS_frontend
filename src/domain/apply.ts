/**
 * The shape of the application form. Pure.
 *
 * The form is four steps and about four minutes, and that is a constraint
 * rather than a style: a form that takes longer than that on a phone does not
 * get finished, and an application that is not finished is a pupil the school
 * never hears about. So the rules here are mostly about saying truthfully how
 * much is left and refusing to ask for anything that is not needed.
 *
 * Nothing here decides whether a form may be submitted. The server owns that,
 * and this mirrors its list so the button can be disabled before a round trip
 * — never so that a different answer can be given.
 */

export type StepId = 'phone' | 'child' | 'guardian' | 'review';

export interface Step {
  readonly id: StepId;
  readonly title: string;
  /** What the progress bar says: "Step 2 of 4 · Your child". */
  readonly label: string;
  /** Roughly how long this step takes, in seconds, for the time remaining. */
  readonly seconds: number;
}

export const STEPS: readonly Step[] = [
  { id: 'phone', title: 'Your phone number', label: 'Your phone', seconds: 60 },
  { id: 'child', title: 'Tell us about your child', label: 'Your child', seconds: 90 },
  { id: 'guardian', title: 'About you', label: 'About you', seconds: 60 },
  { id: 'review', title: 'Check and send', label: 'Check and send', seconds: 30 },
];

export const stepIndex = (id: StepId): number => STEPS.findIndex((step) => step.id === id);

/**
 * "About 2 minutes left", or nothing on the last step.
 *
 * Rounded up to the minute and deliberately generous. A form that says one
 * minute and takes three is worse than one that says nothing: the parent who
 * believed it is the one who abandons it.
 */
export function timeLeft(current: StepId): string | null {
  const from = stepIndex(current);
  const remaining = STEPS.slice(from + 1).reduce((total, step) => total + step.seconds, 0);
  if (remaining <= 0) return null;
  const minutes = Math.ceil(remaining / 60);
  return `About ${minutes} ${minutes === 1 ? 'minute' : 'minutes'} left`;
}

/** The fields the server will refuse a submission without. */
export const REQUIRED_TO_SUBMIT = [
  'child_first_name',
  'child_surname',
  'date_of_birth',
  'sex',
  'level_applied_id',
  'guardian_name',
  'guardian_phone',
  'guardian_relationship',
] as const;

export type RequiredField = (typeof REQUIRED_TO_SUBMIT)[number];

const LABELS: Record<RequiredField, string> = {
  child_first_name: "Your child's first name",
  child_surname: "Your child's surname",
  date_of_birth: 'Date of birth',
  sex: 'Whether they are a girl or a boy',
  level_applied_id: 'The class you are applying for',
  guardian_name: 'Your name',
  guardian_phone: 'A phone number',
  guardian_relationship: 'How you are related to the child',
};

/**
 * What is still missing, in words a parent can act on.
 *
 * The server answers with field names — `guardian_relationship` — which are
 * right for a log and useless on a screen. Anything the server names that is
 * not in this list is passed through rather than hidden: a message nobody
 * expected is still better than silence.
 */
export function missingInWords(missing: readonly string[]): readonly string[] {
  return missing
    .filter((field) => field !== 'phone_verified')
    .map((field) => LABELS[field as RequiredField] ?? field);
}

/** Which step a missing field lives on, so the form can send somebody back. */
export function stepFor(field: string): StepId {
  if (field.startsWith('guardian_')) return 'guardian';
  if (field === 'phone_verified') return 'phone';
  return 'child';
}

/**
 * A Tanzanian mobile number, in the one form the server wants.
 *
 * People write their own number six ways: 0754118902, +255754118902,
 * 255 754 118 902, 0754 118 902. All of them are the same number, and a form
 * that rejects five of them is a form that loses the applicant rather than
 * fixing the input.
 */
export function normalisePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('255')) return `0${digits.slice(3)}`;
  if (digits.startsWith('0')) return digits;
  if (digits.length === 9) return `0${digits}`;
  return digits;
}

/** Whether it could be one at all, before sending a code to it. */
export function looksLikePhone(raw: string): boolean {
  return /^0[67]\d{8}$/.test(normalisePhone(raw));
}
