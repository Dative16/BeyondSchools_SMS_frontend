import { describe, expect, it } from 'vitest';

import {
  billedInTerm,
  publishBlockedBecause,
  structureTotals,
  whenBilled,
  whoPays,
} from '@/domain/fees';
import type { FeeItemFacts } from '@/domain/fees';

const item = (over: Partial<FeeItemFacts> = {}): FeeItemFacts => ({
  name: 'Tuition',
  amount: 240_000,
  frequency: 'per_term',
  termIndex: null,
  isMandatory: true,
  ...over,
});

const TERMS = [
  { index: 1, label: 'Term 1' },
  { index: 2, label: 'Term 2' },
  { index: 3, label: 'Term 3' },
];

describe('which term an item lands in', () => {
  it('bills a per-term item in every term', () => {
    for (const index of [1, 2, 3]) {
      expect(billedInTerm(item(), { termIndex: index, isFirstTermOfYear: index === 1 })).toBe(true);
    }
  });

  it('bills an annual item with the first term and no other', () => {
    const annual = item({ frequency: 'annual' });
    expect(billedInTerm(annual, { termIndex: 1, isFirstTermOfYear: true })).toBe(true);
    expect(billedInTerm(annual, { termIndex: 2, isFirstTermOfYear: false })).toBe(false);
  });

  it('never bills a one-off on a term invoice', () => {
    // It belongs to joining the school. This is what makes an admission fee
    // charged once rather than three times a year, for ever.
    const joining = item({ frequency: 'one_off', amount: 40_000 });
    for (const index of [1, 2, 3]) {
      expect(billedInTerm(joining, { termIndex: index, isFirstTermOfYear: index === 1 })).toBe(
        false,
      );
    }
  });

  it('honours an item pinned to one term', () => {
    const third = item({ termIndex: 3, amount: 25_000 });
    expect(billedInTerm(third, { termIndex: 1, isFirstTermOfYear: true })).toBe(false);
    expect(billedInTerm(third, { termIndex: 3, isFirstTermOfYear: false })).toBe(true);
  });
});

describe('what a structure costs', () => {
  it('totals each term and the year', () => {
    const totals = structureTotals(
      [item({ amount: 240_000 }), item({ name: 'Meals', amount: 60_000 })],
      TERMS,
    );

    expect(totals.perTerm.map((term) => term.total)).toEqual([300_000, 300_000, 300_000]);
    expect(totals.fullYear).toBe(900_000);
    expect(totals.joining).toBe(0);
  });

  it('puts an annual item in the first term only, and counts it once in the year', () => {
    const totals = structureTotals(
      [item({ amount: 240_000 }), item({ name: 'Registration', amount: 40_000, frequency: 'annual' })],
      TERMS,
    );

    expect(totals.perTerm.map((term) => term.total)).toEqual([280_000, 240_000, 240_000]);
    expect(totals.fullYear).toBe(760_000);
  });

  it('keeps a joining charge out of every term total', () => {
    const totals = structureTotals(
      [item({ amount: 240_000 }), item({ name: 'Admission', amount: 50_000, frequency: 'one_off' })],
      TERMS,
    );

    expect(totals.fullYear).toBe(720_000);
    expect(totals.joining).toBe(50_000);
  });

  it('does not assume the terms after the first are equal', () => {
    // The artboard reads "Terms 2 and 3, each". An item pinned to term 3
    // makes that false, and a bursar reading one figure for both would be
    // reading one that is true of neither.
    const totals = structureTotals(
      [item({ amount: 240_000 }), item({ name: 'Mock exams', amount: 25_000, termIndex: 3 })],
      TERMS,
    );

    expect(totals.perTerm.map((term) => term.total)).toEqual([240_000, 240_000, 265_000]);
  });

  it('treats the lowest-numbered term as the first, whatever the terms are called', () => {
    const totals = structureTotals([item({ frequency: 'annual', amount: 40_000 })], [
      { index: 3, label: 'Third' },
      { index: 2, label: 'Second' },
    ]);

    expect(totals.perTerm.map((term) => [term.label, term.total])).toEqual([
      ['Second', 40_000],
      ['Third', 0],
    ]);
  });

  it('totals nothing without falling over when a year has no terms yet', () => {
    const totals = structureTotals([item()], []);
    expect(totals.perTerm).toEqual([]);
    expect(totals.fullYear).toBe(0);
  });
});

describe('how a line reads on the table', () => {
  it('says when it is billed', () => {
    expect(whenBilled(item())).toBe('Every term');
    expect(whenBilled(item({ termIndex: 2 }))).toBe('Term 2 only');
    expect(whenBilled(item({ frequency: 'annual' }))).toBe('Once a year');
    expect(whenBilled(item({ frequency: 'one_off' }))).toBe('When a child joins');
  });

  it('does not claim an optional item is paid by everybody', () => {
    expect(whoPays(item())).toBe('All pupils');
    expect(whoPays(item({ isMandatory: false }))).toBe('Only those who take it');
  });
});

describe('whether it can be published', () => {
  it('refuses an empty structure, with the reason the server gives', () => {
    expect(publishBlockedBecause({ status: 'draft', itemCount: 0 })).toMatch(/at least one/);
  });

  it('allows a draft that charges something', () => {
    expect(publishBlockedBecause({ status: 'draft', itemCount: 1 })).toBeNull();
  });

  it('refuses a second publish', () => {
    expect(publishBlockedBecause({ status: 'published', itemCount: 4 })).toMatch(/already/);
  });
});
