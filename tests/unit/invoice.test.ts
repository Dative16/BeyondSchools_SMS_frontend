import { describe, expect, it } from 'vitest';

import { actionsFor, channelName, invoiceStatusPill } from '@/domain/fees';

describe('how an invoice status reads', () => {
  it('maps what the server derived to words and a tone', () => {
    expect(invoiceStatusPill('settled')).toEqual({ label: 'Settled', tone: 'ok' });
    expect(invoiceStatusPill('in_arrears')).toEqual({ label: 'In arrears', tone: 'bad' });
    expect(invoiceStatusPill('part_paid')).toEqual({ label: 'Part paid', tone: 'warn' });
  });

  it('does not colour a voided bill as a failure', () => {
    // It was cancelled on purpose. Red would read as something gone wrong.
    expect(invoiceStatusPill('void')).toEqual({ label: 'Void', tone: 'neutral' });
  });

  it('falls back to Open for a status it has not met', () => {
    expect(invoiceStatusPill('something_new').label).toBe('Open');
  });
});

const bill = (billed: number, settled: number, isVoid = false) => ({
  billed,
  settled,
  isVoid,
});

describe('what a bursar may do to a bill', () => {
  it('refuses to void one that has money against it, and says why', () => {
    // A payment attached to a bill that officially does not exist is worse
    // than the mistake it was meant to fix.
    const actions = actionsFor(bill(340_000, 190_000));

    expect(actions.canVoid).toBe(false);
    expect(actions.voidBlockedBecause).toContain('credit note');
    expect(actions.canCreditNote).toBe(true);
  });

  it('allows voiding an untouched bill', () => {
    const actions = actionsFor(bill(340_000, 0));

    expect(actions.canVoid).toBe(true);
    expect(actions.voidBlockedBecause).toBeNull();
  });

  it('offers no payment button on a settled bill', () => {
    // Money against a settled invoice lands in suspense and somebody spends an
    // afternoon untangling it.
    expect(actionsFor(bill(340_000, 340_000)).canRecordPayment).toBe(false);
    expect(actionsFor(bill(340_000, 190_000)).canRecordPayment).toBe(true);
  });

  it('offers nothing at all on a voided bill', () => {
    const actions = actionsFor(bill(340_000, 0, true));

    expect(actions.canRecordPayment).toBe(false);
    expect(actions.canVoid).toBe(false);
    expect(actions.canCreditNote).toBe(false);
    expect(actions.voidBlockedBecause).toContain('already void');
  });
});

describe('channels', () => {
  it('names them the way people say them', () => {
    expect(channelName('mpesa')).toBe('M-Pesa');
    expect(channelName('mixx')).toBe('Mixx by Yas');
    expect(channelName('counter')).toBe('At the counter');
  });

  it('shows an unknown one rather than hiding it', () => {
    expect(channelName('some_new_wallet')).toBe('some_new_wallet');
  });
});
