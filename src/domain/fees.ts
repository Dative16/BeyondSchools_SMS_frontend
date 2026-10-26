/**
 * Fee rules. Pure.
 *
 * No React, no fetch, no clock. Everything here takes facts and returns a
 * decision, which is why these rules can be tested in milliseconds and why the
 * same logic is safe to reuse in the parent portal, the bursar screen and a
 * future report without dragging a component along with it.
 *
 * The same arithmetic exists in app/domain/payments.py on the API side. The
 * server's answer is the one that counts; this copy exists so the UI can show a
 * balance without a round trip, never to decide anything on its own.
 */

export type FeeState = 'settled' | 'part_paid' | 'in_arrears';

export interface InvoiceFacts {
  readonly billed: number;
  readonly settled: number;
  readonly dueDate: string;
  readonly isVoid: boolean;
}

export const balanceOf = (invoice: InvoiceFacts): number =>
  Math.max(invoice.billed - invoice.settled, 0);

export const creditOf = (invoice: InvoiceFacts): number =>
  Math.max(invoice.settled - invoice.billed, 0);

/**
 * Overdue is a property of the invoice against a given day, not against "now".
 * Pass the day in: a component that reads the clock cannot be tested, and a
 * report run for last month must not use today's date.
 */
export function feeState(invoice: InvoiceFacts, asOf: Date): FeeState {
  const balance = balanceOf(invoice);
  if (balance === 0) return 'settled';
  return asOf > new Date(invoice.dueDate) ? 'in_arrears' : 'part_paid';
}

export function daysOverdue(invoice: InvoiceFacts, asOf: Date): number {
  if (balanceOf(invoice) === 0) return 0;
  const due = new Date(invoice.dueDate).getTime();
  const diff = asOf.getTime() - due;
  return diff <= 0 ? 0 : Math.floor(diff / 86_400_000);
}

export type ArrearsBucket = 'current' | '1-30' | '31-60' | 'over-60';

export function arrearsBucket(days: number): ArrearsBucket {
  if (days <= 0) return 'current';
  if (days <= 30) return '1-30';
  if (days <= 60) return '31-60';
  return 'over-60';
}

/** What a guardian owes across every child they are linked to. */
export function totalOutstanding(invoices: readonly InvoiceFacts[]): number {
  return invoices.filter((i) => !i.isVoid).reduce((sum, i) => sum + balanceOf(i), 0);
}

/**
 * Whether the pay button should be offered at all. A void invoice or a settled
 * one must not accept money: the callback would land in suspense and somebody
 * would spend an afternoon untangling it.
 */
export function canAcceptPayment(invoice: InvoiceFacts): boolean {
  return !invoice.isVoid && balanceOf(invoice) > 0;
}

/**
 * How an invoice's status reads on screen, and in what colour.
 *
 * The server derives the status and sends it as a string; this only maps it to
 * words and a tone. Keeping the mapping here rather than inside a component
 * means the pill on the list and the pill on the detail cannot disagree, which
 * is the kind of difference that makes a bursar check both.
 */
export type InvoiceStatus =
  | 'draft'
  | 'open'
  | 'part_paid'
  | 'settled'
  | 'in_arrears'
  | 'void';

export type StatusTone = 'ok' | 'warn' | 'bad' | 'info' | 'neutral';

export function invoiceStatusPill(status: string): { label: string; tone: StatusTone } {
  switch (status) {
    case 'settled':
      return { label: 'Settled', tone: 'ok' };
    case 'part_paid':
      return { label: 'Part paid', tone: 'warn' };
    case 'in_arrears':
      return { label: 'In arrears', tone: 'bad' };
    case 'void':
      return { label: 'Void', tone: 'neutral' };
    case 'draft':
      return { label: 'Draft', tone: 'neutral' };
    default:
      return { label: 'Open', tone: 'info' };
  }
}

/**
 * What a bursar may do to a bill, and why not when they may not.
 *
 * The server owns all three answers and checks them again. This exists so a
 * disabled button can say why it is disabled, which is the difference between
 * a screen that feels broken and one that has explained itself.
 */
export interface InvoiceActions {
  readonly canRecordPayment: boolean;
  readonly canVoid: boolean;
  readonly canCreditNote: boolean;
  readonly voidBlockedBecause: string | null;
}

export function actionsFor(invoice: {
  readonly isVoid: boolean;
  readonly billed: number;
  readonly settled: number;
}): InvoiceActions {
  if (invoice.isVoid) {
    return {
      canRecordPayment: false,
      canVoid: false,
      canCreditNote: false,
      voidBlockedBecause: 'This invoice is already void.',
    };
  }

  const paid = invoice.settled > 0;
  return {
    canRecordPayment: invoice.billed > invoice.settled,
    // Voiding a part-paid bill would leave a payment attached to something
    // that officially does not exist, which is worse than the mistake it was
    // meant to fix.
    canVoid: !paid,
    canCreditNote: invoice.billed > 0,
    voidBlockedBecause: paid
      ? 'Money has been paid against this bill. Write a credit note instead.'
      : null,
  };
}

/** How a channel reads to a person, rather than how it is stored. */
const CHANNELS: Record<string, string> = {
  mpesa: 'M-Pesa',
  airtel_money: 'Airtel Money',
  mixx: 'Mixx by Yas',
  halopesa: 'HaloPesa',
  bank: 'Bank transfer',
  card: 'Card',
  counter: 'At the counter',
};

export const channelName = (channel: string): string => CHANNELS[channel] ?? channel;

export const PAYMENT_CHANNELS = Object.entries(CHANNELS).map(([value, label]) => ({
  value,
  label,
}));
