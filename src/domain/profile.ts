/**
 * Keeping a pupil record. Pure.
 *
 * The rules here are mostly about what a school is holding and what it is
 * still missing, because a record nobody can complete is a record nobody
 * trusts — and the gap a registrar most often has to be told about is a
 * document that was promised and never arrived.
 */

/**
 * The document vocabulary, in the words a registrar uses.
 *
 * The same members as the server's enum. Which of them a school actually
 * requires lives in `document_requirement` on the server and differs per
 * school, so this is the list of what *can* be attached rather than what must
 * be.
 */
export const DOCUMENT_KINDS = [
  { value: 'birth_certificate', label: 'Birth certificate (cheti cha kuzaliwa)' },
  { value: 'passport_photo', label: 'Passport photograph (picha ya pasipoti)' },
  { value: 'registration_form', label: 'Registration form (fomu ya usajili)' },
  { value: 'report_card', label: 'Report card from the last school' },
  { value: 'transfer_letter', label: 'Transfer letter' },
  { value: 'leaving_certificate', label: 'Leaving certificate' },
  { value: 'immunisation_card', label: 'Immunisation card' },
  { value: 'national_id', label: "A guardian's national ID" },
  { value: 'photo', label: 'Photograph of the pupil' },
  { value: 'medical', label: 'Medical paperwork' },
  { value: 'other', label: 'Something else' },
] as const;

const LABELS: Record<string, string> = Object.fromEntries(
  DOCUMENT_KINDS.map((kind) => [kind.value, kind.label]),
);

export const documentKindLabel = (kind: string): string =>
  LABELS[kind] ?? kind.replace(/_/g, ' ');

/**
 * The two a school is asked for first, and the ones worth nagging about.
 *
 * Deliberately short. The server holds each school's own requirement list and
 * the checklist endpoint answers against it; this is the client's prompt while
 * a registrar has the family in front of them, and a prompt that listed eleven
 * things would be ignored.
 */
export const COMMONLY_REQUIRED = ['birth_certificate', 'passport_photo'] as const;

export function missingRequired(held: readonly string[]): string[] {
  return COMMONLY_REQUIRED.filter((kind) => !held.includes(kind));
}

// ---------------------------------------------------------------------------
// Changing a class
// ---------------------------------------------------------------------------

/**
 * Why a child cannot be moved to this class, or null.
 *
 * Moving a child is a per-year fact written to the enrolment, so the target
 * has to be in the same year — a class from last year would quietly move them
 * out of a roll nobody is looking at. The server refuses it too; this says so
 * before the click.
 */
export function moveProblem(facts: {
  readonly fromClassId: string | null;
  readonly toClassId: string;
  readonly toYearId: string;
  readonly enrolmentYearId: string | null;
  readonly toCapacity: number | null;
  readonly toPupils: number;
}): string | null {
  if (!facts.toClassId) return 'Choose the class they are moving to.';
  if (facts.toClassId === facts.fromClassId) return 'That is the class they are already in.';
  if (facts.enrolmentYearId && facts.toYearId !== facts.enrolmentYearId) {
    return 'That class belongs to a different academic year. A move is a change to this year, not a transfer between years.';
  }
  if (facts.toCapacity !== null && facts.toPupils >= facts.toCapacity) {
    return `That class is full (${facts.toPupils} of ${facts.toCapacity}). Raise its places under Classes first.`;
  }
  return null;
}

/**
 * What moving a child actually does, said before it is done.
 *
 * Worth spelling out because it is not obvious: the fee structure follows the
 * level, so a move between levels changes what the child is billed from the
 * next term run, while a move between streams of the same level usually does
 * not. A registrar moving somebody for a timetable reason should know whether
 * they have just changed a family's fees.
 */
export function moveConsequence(facts: {
  readonly fromLevelId: string | null;
  readonly toLevelId: string;
  readonly toClassName: string;
}): string {
  if (facts.fromLevelId && facts.fromLevelId !== facts.toLevelId) {
    return `${facts.toClassName} is a different level, so this child will be billed from that level's fee structure at the next term run. Invoices already raised keep their figures.`;
  }
  return `${facts.toClassName} is the same level, so what the child is billed does not change.`;
}
