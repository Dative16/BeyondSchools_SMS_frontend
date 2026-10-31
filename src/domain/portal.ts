/**
 * The parent and student portal. Pure.
 *
 * One thing shapes this whole file: the people reading these screens cannot
 * change anything. A guardian cannot correct their own phone number, a pupil
 * cannot correct their class, and neither can pay through the portal because
 * payments are manual in Phase 1. So every rule here is about saying what is
 * true and what to do about it, in words that work when the answer is "go to
 * the office".
 */

export interface ChildFees {
  readonly billed: number;
  readonly settled: number;
  readonly balance: number;
}

export type FeeStanding = 'nothing-billed' | 'settled' | 'part-paid' | 'owing' | 'in-credit';

/**
 * Where one child stands on fees.
 *
 * `in-credit` is separated from `settled` because a family who has overpaid
 * needs to know rather than seeing a cheerful nought — it usually means a
 * receipt went against the wrong child.
 */
export function standing(fees: ChildFees): FeeStanding {
  if (fees.billed === 0) return 'nothing-billed';
  if (fees.settled > fees.billed) return 'in-credit';
  if (fees.balance === 0) return 'settled';
  return fees.settled > 0 ? 'part-paid' : 'owing';
}

export const STANDING_LABELS: Record<FeeStanding, string> = {
  'nothing-billed': 'Nothing billed yet',
  settled: 'Settled',
  'part-paid': 'Part paid',
  owing: 'Owing',
  'in-credit': 'In credit',
};

/**
 * The line under the figure, in the words a parent needs.
 *
 * It never says "pay now", because there is nothing to press. What it says is
 * what has happened and what will happen to the money next.
 */
export function standingNote(fees: ChildFees, money: (value: number) => string): string {
  switch (standing(fees)) {
    case 'nothing-billed':
      return 'No bill has been raised for this term yet.';
    case 'settled':
      return 'Paid in full. The office has recorded every receipt.';
    case 'in-credit':
      return `${money(fees.settled - fees.billed)} more has been received than was billed. Ask the office to check it — a receipt may have gone against the wrong child.`;
    case 'part-paid':
      return `${money(fees.settled)} of ${money(fees.billed)} received.`;
    default:
      return `${money(fees.balance)} of ${money(fees.billed)} still to pay.`;
  }
}

/** What a family owes across every child, which is the figure they think in. */
export function owedAcross(children: readonly ChildFees[]): number {
  return children.reduce((sum, child) => sum + Math.max(child.balance, 0), 0);
}

/**
 * Greeting. Kiswahili, because this is the one screen in the system a parent
 * who speaks no English will open, and "Habari" costs nothing to anybody else.
 */
export function greet(fullName: string | undefined): string {
  const first = (fullName ?? '').trim().split(/\s+/)[0];
  return first ? `Habari, ${first}` : 'Habari';
}

export function initials(fullName: string | undefined): string {
  return (fullName ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

// ---------------------------------------------------------------------------
// Changing a password
// ---------------------------------------------------------------------------

/**
 * The server requires ten characters, so this does too.
 *
 * The artboard says eight. Ten is what `ChangePasswordRequest` enforces, and a
 * form that accepted eight would be a form that fails on submit with an error
 * nobody can act on — so the screen states the rule it will actually be held
 * to.
 */
export const PASSWORD_MINIMUM = 10;

export interface PasswordHint {
  readonly text: string;
  readonly tone: 'muted' | 'warn' | 'ok';
}

export function passwordHint(password: string): PasswordHint {
  if (password.length === 0)
    return { text: `${PASSWORD_MINIMUM} characters or more.`, tone: 'muted' };
  if (password.length < PASSWORD_MINIMUM)
    return {
      text: `Too short: ${password.length} of ${PASSWORD_MINIMUM} characters.`,
      tone: 'warn',
    };
  return { text: 'Long enough.', tone: 'ok' };
}

/** Why the password cannot be changed yet, or null. */
export function passwordProblem(facts: {
  readonly current: string;
  readonly next: string;
  readonly confirm: string;
}): string | null {
  if (!facts.current) return 'Enter the password you use now.';
  if (facts.next.length < PASSWORD_MINIMUM)
    return `A new password needs ${PASSWORD_MINIMUM} characters or more.`;
  if (facts.next !== facts.confirm) return 'The two new passwords do not match.';
  if (facts.next === facts.current) return 'The new password is the same as the old one.';
  return null;
}

// ---------------------------------------------------------------------------
// Paying
// ---------------------------------------------------------------------------

export interface PaymentInstruction {
  readonly bankName: string | null;
  readonly accountName: string | null;
  readonly accountNumber: string | null;
  readonly reference: string;
}

/**
 * Whether the school has said where to pay.
 *
 * Phase 1 takes no payments: there is no aggregator, no button and no
 * callback. A family pays at the counter or into the school's account and the
 * bursar records the receipt. If the school has not filled the bank details
 * in, the only honest instruction is the office — not a half-empty table that
 * looks like it might be an account number.
 */
export const canBankTransfer = (instruction: PaymentInstruction): boolean =>
  Boolean(instruction.bankName && instruction.accountNumber);
