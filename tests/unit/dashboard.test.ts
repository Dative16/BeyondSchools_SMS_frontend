import { describe, expect, it } from 'vitest';

import { attentionItems } from '@/domain/attention';
import type { AttentionFacts } from '@/domain/attention';
import { greeting, termProgress, weekOfTerm } from '@/domain/term';
import { funnelSteps } from '@/features/dashboard/hooks/useDashboard';

const TERM = { label: 'Term 1', startsOn: '2027-01-08', endsOn: '2027-04-02' };

const day = (iso: string) => new Date(`${iso}T09:00:00Z`);

describe('where in the term we are', () => {
  it('counts the first day as week 1, not week 0', () => {
    expect(weekOfTerm(TERM, day('2027-01-08'))).toBe(1);
    expect(weekOfTerm(TERM, day('2027-01-14'))).toBe(1);
    expect(weekOfTerm(TERM, day('2027-01-15'))).toBe(2);
  });

  it('reads the same at either end of a day in Dar es Salaam', () => {
    // 23:50 in Dar is 20:50 UTC; a naive comparison rolls the date over.
    const late = new Date('2027-01-14T20:50:00Z');
    expect(weekOfTerm(TERM, late)).toBe(1);
  });

  it('says a term has not started rather than inventing week 1', () => {
    expect(termProgress(TERM, day('2026-12-20'))).toBe('Term 1 has not started');
  });

  it('says a term has ended rather than counting past it', () => {
    expect(termProgress(TERM, day('2027-04-20'))).toBe('Term 1 has ended');
  });

  it('keeps counting inside the term, including a long one', () => {
    expect(termProgress(TERM, day('2027-02-01'))).toBe('Week 4 of Term 1');
    expect(termProgress(TERM, day('2027-03-30'))).toBe('Week 12 of Term 1');
  });

  it('says nothing when the school has set no current term', () => {
    expect(termProgress(undefined, day('2027-02-01'))).toBeNull();
  });

  it('greets by first name, and copes with one name or none', () => {
    expect(greeting('Datius Mwakalebela')).toBe('Habari, Datius');
    expect(greeting('Salome')).toBe('Habari, Salome');
    expect(greeting('  ')).toBe('Habari');
  });
});

const quiet: AttentionFacts = {
  suspenseCount: 0,
  suspenseTotal: 0,
  draftStructures: [],
  applicationsWaiting: 0,
  oldestWaitingDays: 0,
  likelyDuplicates: 0,
  studentsOver60Days: 0,
};

const facts = (overrides: Partial<AttentionFacts>): AttentionFacts => ({
  ...quiet,
  ...overrides,
});

describe('what needs attention', () => {
  it('says nothing when nothing is wrong', () => {
    expect(attentionItems(quiet)).toEqual([]);
  });

  it('puts money that cannot be placed above applications waiting', () => {
    const items = attentionItems(
      facts({
        suspenseCount: 1,
        suspenseTotal: 150_000,
        suspenseFrom: '0712445109',
        applicationsWaiting: 7,
        oldestWaitingDays: 4,
      }),
    );

    expect(items.map((item) => item.id)).toEqual(['suspense', 'applications']);
    expect(items[0]?.detail).toContain('TZS 150,000');
    expect(items[0]?.detail).toContain('0712445109');
  });

  it('names each unpublished structure separately, because each is a different class', () => {
    const items = attentionItems(facts({ draftStructures: ['Standard 6', 'Standard 7'] }));

    expect(items).toHaveLength(2);
    expect(items[0]?.title).toBe('Standard 6 fee structure is not published');
    expect(items[1]?.title).toBe('Standard 7 fee structure is not published');
  });

  it('escalates an application nobody has looked at for a week', () => {
    const soon = attentionItems(facts({ applicationsWaiting: 3, oldestWaitingDays: 2 }));
    const urgent = attentionItems(facts({ applicationsWaiting: 3, oldestWaitingDays: 9 }));

    expect(soon[0]?.severity).toBe('soon');
    expect(urgent[0]?.severity).toBe('urgent');
  });

  it('mentions duplicates only when the server flagged some', () => {
    const plain = attentionItems(facts({ applicationsWaiting: 7, oldestWaitingDays: 4 }));
    const flagged = attentionItems(
      facts({ applicationsWaiting: 7, oldestWaitingDays: 4, likelyDuplicates: 2 }),
    );

    expect(plain[0]?.detail).not.toContain('duplicate');
    expect(flagged[0]?.detail).toContain('2 look like duplicates');
  });

  it('treats a tail past sixty days as urgent, not as more arrears', () => {
    const items = attentionItems(facts({ studentsOver60Days: 9 }));

    expect(items[0]?.severity).toBe('urgent');
    expect(items[0]?.title).toBe('9 children are more than 60 days behind');
  });

  it('counts one of something as one, in words that read', () => {
    const items = attentionItems(
      facts({ suspenseCount: 1, suspenseTotal: 90_000, studentsOver60Days: 1 }),
    );

    expect(items[0]?.title).toBe('1 payment is sitting in the suspense account');
    expect(items[1]?.title).toBe('1 child is more than 60 days behind');
  });

  it('puts every urgent item above every soon one', () => {
    const items = attentionItems(
      facts({
        draftStructures: ['Standard 6'],
        suspenseCount: 2,
        suspenseTotal: 300_000,
        studentsOver60Days: 4,
      }),
    );

    const severities = items.map((item) => item.severity);
    expect(severities).toEqual(['urgent', 'urgent', 'soon']);
  });
});

const counts = (over: Partial<Record<string, number>> = {}) => ({
  started: 0,
  submitted: 0,
  screened: 0,
  offered: 0,
  accepted: 0,
  enrolled: 0,
  declined: 0,
  withdrawn: 0,
  ...over,
});

describe('the admissions funnel', () => {
  it('counts everyone who got at least this far, not who is sitting there now', () => {
    // The API reports current state. Drawn directly, this school would show
    // Started 0 and Submitted 2 — an upside-down staircase, not a funnel.
    const steps = funnelSteps(counts({ submitted: 2, screened: 1, enrolled: 1 }));

    expect(steps.map((step) => [step.label, step.count])).toEqual([
      ['Started', 4],
      ['Submitted', 4],
      ['Screened', 2],
      ['Offered', 1],
      ['Enrolled', 1],
    ]);
  });

  it('never widens, which is what makes it a funnel', () => {
    const steps = funnelSteps(
      counts({ started: 30, submitted: 20, screened: 10, offered: 8, enrolled: 25 }),
    );

    const widths = steps.map((step) => step.percent);
    expect(widths).toEqual([...widths].sort((a, b) => b - a));
    expect(widths[0]).toBe(100);
  });

  it('leaves declined and withdrawn out rather than guessing where they stopped', () => {
    const steps = funnelSteps(counts({ submitted: 3, declined: 9, withdrawn: 4 }));

    expect(steps[0]?.count).toBe(3);
  });

  it('shows an empty intake as empty, not as a division by zero', () => {
    const steps = funnelSteps(counts());

    expect(steps.every((step) => step.count === 0 && step.percent === 0)).toBe(true);
  });

  it('says nothing at all before the numbers arrive', () => {
    expect(funnelSteps(undefined)).toEqual([]);
  });
});
