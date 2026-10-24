import { describe, expect, it } from 'vitest';

import { arrearsBucket, balanceOf, canAcceptPayment, feeState, totalOutstanding } from '@/domain/fees';

const invoice = (billed: number, settled: number, due = '2027-01-31', isVoid = false) => ({
  billed,
  settled,
  dueDate: due,
  isVoid,
});

describe('fee rules', () => {
  it('reports a balance that never goes negative', () => {
    expect(balanceOf(invoice(340_000, 190_000))).toBe(150_000);
    expect(balanceOf(invoice(340_000, 400_000))).toBe(0);
  });

  it('calls a part-paid invoice arrears only once the due date has passed', () => {
    const i = invoice(340_000, 190_000);
    expect(feeState(i, new Date('2027-01-20'))).toBe('part_paid');
    expect(feeState(i, new Date('2027-02-20'))).toBe('in_arrears');
  });

  it('treats a settled invoice as settled whatever the date', () => {
    expect(feeState(invoice(340_000, 340_000), new Date('2027-06-01'))).toBe('settled');
  });

  it('buckets arrears the way the bursar report does', () => {
    expect(arrearsBucket(0)).toBe('current');
    expect(arrearsBucket(30)).toBe('1-30');
    expect(arrearsBucket(61)).toBe('over-60');
  });

  it('sums what one guardian owes across children, ignoring void invoices', () => {
    expect(
      totalOutstanding([
        invoice(340_000, 190_000),
        invoice(320_000, 320_000),
        invoice(200_000, 0, '2027-01-31', true),
      ]),
    ).toBe(150_000);
  });

  it('refuses payment on a settled or void invoice', () => {
    expect(canAcceptPayment(invoice(340_000, 190_000))).toBe(true);
    expect(canAcceptPayment(invoice(340_000, 340_000))).toBe(false);
    expect(canAcceptPayment(invoice(340_000, 0, '2027-01-31', true))).toBe(false);
  });
});
