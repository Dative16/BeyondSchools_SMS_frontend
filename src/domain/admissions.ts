/**
 * The admissions funnel, as a screen needs to read it. Pure.
 *
 * One thing is worth stating plainly, because every other rule here follows
 * from it: **there is no accept button**. A place is accepted when the deposit
 * is on the ledger, so the step between "offered" and "accepted" is a money
 * entry a bursar makes, not an approval a registrar gives. The server already
 * works that way; this is what makes the screen say so.
 */

export type ApplicationState =
  | 'started'
  | 'submitted'
  | 'screened'
  | 'offered'
  | 'accepted'
  | 'enrolled'
  | 'declined'
  | 'withdrawn';

export type Tone = 'ok' | 'warn' | 'bad' | 'info' | 'neutral';

/** The happy path, in order. Declined and withdrawn are off it, not late on it. */
export const FUNNEL: readonly ApplicationState[] = [
  'submitted',
  'screened',
  'offered',
  'accepted',
  'enrolled',
];

const LABELS: Record<ApplicationState, string> = {
  started: 'Started',
  submitted: 'Submitted',
  screened: 'Screened',
  offered: 'Offered',
  accepted: 'Deposit received',
  enrolled: 'Enrolled',
  declined: 'Declined',
  withdrawn: 'Withdrawn',
};

const TONES: Record<ApplicationState, Tone> = {
  started: 'neutral',
  submitted: 'info',
  screened: 'info',
  offered: 'warn',
  accepted: 'ok',
  enrolled: 'ok',
  declined: 'neutral',
  withdrawn: 'neutral',
};

export const stateLabel = (state: ApplicationState): string => LABELS[state] ?? state;

export const statePill = (state: ApplicationState): { label: string; tone: Tone } => ({
  label: stateLabel(state),
  tone: TONES[state] ?? 'neutral',
});

/**
 * What the registrar is told about where this application stands.
 *
 * Each one says what has *not* happened as well as what has. The commonest
 * mistake in an admissions office is believing a place has been promised when
 * it has only been offered, or taken when it has only been promised.
 */
const NOTES: Partial<Record<ApplicationState, string>> = {
  started: 'The family has begun the form and not sent it. Nothing is waiting on the school.',
  submitted:
    'Nothing has been promised to this family yet. Screening is where somebody checks the documents and the duplicate warning.',
  screened:
    'Checked and clean. Offering a place issues an admission number and the first invoice, and nothing more.',
  offered:
    'An offer is out. The place is not accepted until the deposit is on the ledger, so the next step is a receipt, not an approval.',
  accepted:
    'The deposit is recorded, so the place is accepted. Enrolling is the last step and creates the pupil record.',
  enrolled:
    'Done. The child has a pupil record and an enrolment, and this application is closed.',
  declined: 'Declined. The application stays on file and can be reopened.',
  withdrawn: 'The family withdrew. The application stays on file.',
};

export const stateNote = (state: ApplicationState): string | null => NOTES[state] ?? null;

/**
 * Which step of the funnel bar is current, or -1 for an application that left
 * the path. A declined application is not "almost enrolled", and a bar that
 * showed it four-fifths full would say it was.
 */
export const funnelPosition = (state: ApplicationState): number => FUNNEL.indexOf(state);

export interface Actions {
  readonly canScreen: boolean;
  readonly canOffer: boolean;
  readonly canRecordDeposit: boolean;
  readonly canEnrol: boolean;
  readonly canDecline: boolean;
  readonly isFinished: boolean;
}

/**
 * What a registrar may do next.
 *
 * One step at a time and never two, so there is no choosing between "offer"
 * and "enrol" on a child who has not paid. The server refuses the rest
 * anyway; this keeps the screen from offering what will be refused.
 */
export function actionsFor(state: ApplicationState): Actions {
  return {
    canScreen: state === 'submitted',
    canOffer: state === 'screened',
    canRecordDeposit: state === 'offered',
    canEnrol: state === 'accepted',
    // Declining stays possible until the child is on the roll. After that it
    // is a transfer-out, which is a different act with a different record.
    canDecline: ['started', 'submitted', 'screened', 'offered', 'accepted'].includes(state),
    isFinished: ['enrolled', 'declined', 'withdrawn'].includes(state),
  };
}

/** Matches the server's own threshold: below 70 is a coincidence, not a match. */
export const DUPLICATE_FLAG = 70;

export const isLikelyDuplicate = (score: number | null | undefined): boolean =>
  (score ?? 0) >= DUPLICATE_FLAG;

/**
 * How long an offer has left, in words.
 *
 * A lapsed offer is the thing a registrar most needs to see: the family
 * believe they have a place and the school has stopped holding it.
 */
export function offerStanding(
  expiresOn: string | null | undefined,
  asOf: Date,
): { readonly text: string; readonly tone: Tone } | null {
  if (!expiresOn) return null;
  const due = new Date(`${expiresOn}T00:00:00Z`);
  const days = Math.ceil(
    (Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate()) -
      Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), asOf.getUTCDate())) /
      86_400_000,
  );

  if (days < 0) {
    return {
      text: `The offer lapsed ${-days === 1 ? 'yesterday' : `${-days} days ago`}`,
      tone: 'bad',
    };
  }
  if (days === 0) return { text: 'The offer lapses today', tone: 'bad' };
  if (days <= 3) {
    return { text: `The offer lapses in ${days} ${days === 1 ? 'day' : 'days'}`, tone: 'warn' };
  }
  return { text: `The offer holds for another ${days} days`, tone: 'neutral' };
}
