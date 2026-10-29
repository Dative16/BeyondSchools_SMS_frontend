import { describe, expect, it } from 'vitest';

import {
  actionsFor,
  funnelPosition,
  isLikelyDuplicate,
  offerStanding,
  statePill,
  stateNote,
} from '@/domain/admissions';

const on = (iso: string) => new Date(`${iso}T09:00:00Z`);

describe('what a registrar may do next', () => {
  it('offers exactly one step at a time', () => {
    // No choosing between "offer" and "enrol" on a child whose family has
    // not paid.
    const atEachStage = (['submitted', 'screened', 'offered', 'accepted'] as const).map(
      (state) => {
        const a = actionsFor(state);
        return [a.canScreen, a.canOffer, a.canRecordDeposit, a.canEnrol].filter(Boolean)
          .length;
      },
    );

    expect(atEachStage).toEqual([1, 1, 1, 1]);
  });

  it('puts a money entry where an accept button would be', () => {
    // The whole point: a place is accepted when the deposit is on the ledger.
    const offered = actionsFor('offered');

    expect(offered.canRecordDeposit).toBe(true);
    expect(offered.canEnrol).toBe(false);
  });

  it('only lets a child be enrolled once the deposit is in', () => {
    expect(actionsFor('screened').canEnrol).toBe(false);
    expect(actionsFor('offered').canEnrol).toBe(false);
    expect(actionsFor('accepted').canEnrol).toBe(true);
  });

  it('stops offering anything once the application is finished', () => {
    for (const state of ['enrolled', 'declined', 'withdrawn'] as const) {
      const a = actionsFor(state);
      expect(a.isFinished).toBe(true);
      expect(a.canScreen || a.canOffer || a.canRecordDeposit || a.canEnrol).toBe(false);
      expect(a.canDecline).toBe(false);
    }
  });

  it('allows a decline right up to enrolment and not after', () => {
    // After that it is a transfer-out, which is a different act with a
    // different record.
    expect(actionsFor('accepted').canDecline).toBe(true);
    expect(actionsFor('enrolled').canDecline).toBe(false);
  });
});

describe('where an application stands', () => {
  it('puts a declined one off the funnel rather than late on it', () => {
    // A bar that showed it four-fifths full would say it was almost enrolled.
    expect(funnelPosition('declined')).toBe(-1);
    expect(funnelPosition('withdrawn')).toBe(-1);
    expect(funnelPosition('offered')).toBe(2);
  });

  it('calls the accepted state what actually happened', () => {
    expect(statePill('accepted').label).toBe('Deposit received');
  });

  it('says what has not happened, not only what has', () => {
    expect(stateNote('submitted')).toContain('Nothing has been promised');
    expect(stateNote('offered')).toContain('not accepted until the deposit');
  });
});

describe('an offer running out', () => {
  const expires = '2027-01-20';

  it('says nothing when there is no offer', () => {
    expect(offerStanding(null, on('2027-01-10'))).toBeNull();
  });

  it('is quiet while there is plenty of time', () => {
    expect(offerStanding(expires, on('2027-01-05'))).toEqual({
      text: 'The offer holds for another 15 days',
      tone: 'neutral',
    });
  });

  it('warns in the last three days', () => {
    expect(offerStanding(expires, on('2027-01-18'))?.tone).toBe('warn');
  });

  it('is loudest on the day and after it', () => {
    // The family believe they have a place and the school has stopped
    // holding it.
    expect(offerStanding(expires, on('2027-01-20'))).toEqual({
      text: 'The offer lapses today',
      tone: 'bad',
    });
    expect(offerStanding(expires, on('2027-01-21'))).toEqual({
      text: 'The offer lapsed yesterday',
      tone: 'bad',
    });
    expect(offerStanding(expires, on('2027-01-25'))?.text).toBe('The offer lapsed 5 days ago');
  });
});

describe('duplicates', () => {
  it('uses the same threshold as the server', () => {
    expect(isLikelyDuplicate(70)).toBe(true);
    expect(isLikelyDuplicate(69)).toBe(false);
    expect(isLikelyDuplicate(null)).toBe(false);
  });
});
