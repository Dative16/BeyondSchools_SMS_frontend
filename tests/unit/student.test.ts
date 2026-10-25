import { describe, expect, it } from 'vitest';

import { ageLabel, ageOn, initialsOf, missingFirst, outcomePill, statusPill } from '@/domain/student';

const on = (iso: string) => new Date(`${iso}T09:00:00Z`);

describe('how old a child is', () => {
  it('counts completed years, not elapsed ones', () => {
    // Born 8 June 2018. On 7 June 2026 she is seven, not eight — and a profile
    // that says eight is one a class teacher stops trusting.
    expect(ageOn('2018-06-08', on('2026-06-07'))).toBe(7);
    expect(ageOn('2018-06-08', on('2026-06-08'))).toBe(8);
    expect(ageOn('2018-06-08', on('2026-06-09'))).toBe(8);
  });

  it('copes with a birthday on 29 February', () => {
    expect(ageOn('2020-02-29', on('2027-02-28'))).toBe(6);
    expect(ageOn('2020-02-29', on('2027-03-01'))).toBe(7);
  });

  it('never reports a negative age for a date entered wrongly', () => {
    expect(ageOn('2030-01-01', on('2026-01-01'))).toBe(0);
  });

  it('counts a baby in months, because "0 years" says nothing', () => {
    expect(ageLabel('2026-01-15', on('2026-11-20'))).toBe('10 months');
    expect(ageLabel('2025-01-15', on('2026-11-20'))).toBe('1 year');
    expect(ageLabel('2018-06-08', on('2026-10-24'))).toBe('8 years');
  });
});

describe('the pills on a record', () => {
  it('reads an active enrolment and a repeated year differently', () => {
    expect(outcomePill('active', false)).toEqual({ label: 'Active', tone: 'ok' });
    expect(outcomePill('active', true)).toEqual({ label: 'Repeating', tone: 'warn' });
  });

  it('does not colour a death as a warning', () => {
    // Somebody in an office will open this record. The pill is not the place
    // to editorialise.
    expect(statusPill('deceased')).toEqual({ label: 'Deceased', tone: 'neutral' });
  });

  it('treats a promotion as ordinary and a withdrawal as not', () => {
    expect(statusPill('active').tone).toBe('ok');
    expect(outcomePill('promoted', false).tone).toBe('neutral');
    expect(outcomePill('withdrawn', false).tone).toBe('warn');
  });
});

describe('what is still missing', () => {
  const items = [
    { key: 'photo', label: 'Passport photograph', required: false, done: false },
    { key: 'birth', label: 'Birth certificate', required: true, done: false },
    { key: 'guardian', label: 'A guardian', required: true, done: true },
  ];

  it('drops what is already done', () => {
    expect(missingFirst(items).map((item) => item.key)).not.toContain('guardian');
  });

  it('puts what is required first, which is the order somebody chases it', () => {
    expect(missingFirst(items).map((item) => item.key)).toEqual(['birth', 'photo']);
  });
});

describe('initials', () => {
  it('takes the first and the last name, as the top bar does', () => {
    expect(initialsOf('Neema', 'Mwanjala')).toBe('NM');
    expect(initialsOf('', '')).toBe('?');
  });
});
