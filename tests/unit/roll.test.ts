import { describe, expect, it } from 'vitest';

import { feePillFrom, fullName, queueFlag, waitedFor } from '@/domain/roll';

describe('the fees pill on a roll row', () => {
  it('calls a fully paid bill settled', () => {
    expect(feePillFrom(320_000, 320_000)).toEqual({ label: 'Settled', tone: 'ok' });
  });

  it('treats an overpayment as settled rather than as something odd', () => {
    expect(feePillFrom(320_000, 400_000).label).toBe('Settled');
  });

  it('will not claim arrears it has not been told about', () => {
    // The roll sends totals and no due dates. Saying "In arrears" from a
    // balance alone tells a parent they are late when they may not be, and
    // that is worse than saying less.
    expect(feePillFrom(320_000, 100_000)).toEqual({ label: 'Part paid', tone: 'warn' });
    expect(feePillFrom(320_000, 100_000, true)).toEqual({ label: 'In arrears', tone: 'bad' });
  });

  it('separates a child nobody has billed from one who owes nothing', () => {
    // Both have a zero balance. Only one of them is a problem, and it is the
    // one the term run missed.
    expect(feePillFrom(0, 0)).toEqual({ label: 'Not billed', tone: 'neutral' });
    expect(feePillFrom(320_000, 320_000).label).toBe('Settled');
  });
});

const application = (over: Partial<Parameters<typeof queueFlag>[0]> = {}) =>
  queueFlag({
    state: 'screened',
    duplicateScore: null,
    previousSchool: null,
    documentsHeld: 1,
    ...over,
  });

describe('the flag at the top of a queue card', () => {
  it('puts a possible duplicate above everything else', () => {
    // Offering a place to a child who already has one creates a second record
    // that two terms of marks then get split across.
    expect(application({ duplicateScore: 86, state: 'submitted' }).flag).toBe(
      'Possible duplicate',
    );
  });

  it('ignores a score the server did not consider a match', () => {
    expect(application({ duplicateScore: 55 }).flag).not.toBe('Possible duplicate');
  });

  it('asks for screening before anything has been screened', () => {
    expect(application({ state: 'submitted' }).flag).toBe('Needs screening');
  });

  it('marks a child coming from another school as a transfer', () => {
    expect(application({ previousSchool: 'Mlimani Primary, Dodoma' }).flag).toBe('Transfer in');
  });

  it('says ready to offer when there is nothing left to resolve', () => {
    expect(application()).toEqual({ flag: 'Ready to offer', tone: 'ok' });
  });
});

describe('small readings', () => {
  it('counts waiting in words a person would use', () => {
    expect(waitedFor(0)).toBe('today');
    expect(waitedFor(1)).toBe('1 day');
    expect(waitedFor(4)).toBe('4 days');
  });

  it('joins a name without leaving a double space where a middle name is not', () => {
    expect(fullName('Neema', 'Grace', 'Mwanjala')).toBe('Neema Grace Mwanjala');
    expect(fullName('Neema', null, 'Mwanjala')).toBe('Neema Mwanjala');
    expect(fullName('Neema', '', 'Mwanjala')).toBe('Neema Mwanjala');
  });
});
