import { describe, expect, it } from 'vitest';

import {
  arrearsSentence,
  beforeYearCanBeCurrent,
  classWarning,
  depositSentence,
  exitSummary,
  fillLabel,
  fillState,
  goesOnTo,
  graceSentence,
  teacherLoad,
  teachingGaps,
  termProblems,
  yearIsEditable,
  yearState,
} from '@/domain/setup';

const year = { label: '2027' };

const term = (index: number, startsOn: string, endsOn: string) => ({
  index,
  label: `Term ${index}`,
  startsOn,
  endsOn,
});

const THREE_TERMS = [
  term(1, '2027-01-11', '2027-04-09'),
  term(2, '2027-05-03', '2027-08-06'),
  term(3, '2027-09-06', '2027-12-03'),
];

describe('how a year reads', () => {
  it('separates a year that is open from one nobody has set up', () => {
    // The difference matters: a year with no terms cannot have a fee due date
    // worked out or a mark filed, so it is not somewhere a school can be put.
    expect(yearState({ label: '2028', isCurrent: false, isClosed: false, termCount: 0 })).toBe(
      'not-set-up',
    );
    expect(yearState({ label: '2028', isCurrent: false, isClosed: false, termCount: 3 })).toBe(
      'open',
    );
  });

  it('says current and closed before anything else', () => {
    expect(yearState({ label: '2027', isCurrent: true, isClosed: false, termCount: 3 })).toBe(
      'current',
    );
    // Closed wins even over current, because closed is the stronger fact.
    expect(yearState({ label: '2026', isCurrent: true, isClosed: true, termCount: 3 })).toBe(
      'closed',
    );
  });

  it('makes a closed year read-only', () => {
    expect(yearIsEditable({ label: '2026', isCurrent: false, isClosed: true, termCount: 3 })).toBe(
      false,
    );
  });
});

describe('term dates', () => {
  it('accepts three terms that do not touch', () => {
    expect(termProblems(THREE_TERMS, year)).toEqual([]);
  });

  it('refuses two terms that cover the same day', () => {
    // A mark entered that day could belong to either, and a system that picked
    // the first match would be answering a question the school had not settled.
    const overlapping = [term(1, '2027-01-11', '2027-05-10'), term(2, '2027-05-03', '2027-08-06')];
    expect(termProblems(overlapping, year).join(' ')).toMatch(/cover the same days/);
  });

  it('refuses a term that ends before it starts', () => {
    expect(termProblems([term(1, '2027-04-09', '2027-01-11')], year).join(' ')).toMatch(
      /ends before it starts/,
    );
  });

  it('asks for the dates that are missing', () => {
    expect(termProblems([term(1, '2027-01-11', '')], year).join(' ')).toMatch(
      /needs a start and an end/,
    );
  });

  it('notices a term that is not in its own year', () => {
    const strayed = [term(1, '2026-01-11', '2026-04-09')];
    expect(termProblems(strayed, year).join(' ')).toMatch(/outside 2027/);
  });

  it('does not complain about a year whose label is not a number', () => {
    expect(termProblems(THREE_TERMS, { label: '2027/28' })).toEqual([]);
  });
});

describe('before a school can be moved into a year', () => {
  it('asks for nothing when everything is ready', () => {
    expect(
      beforeYearCanBeCurrent({
        termCount: 3,
        termProblems: [],
        levelsWithoutFees: [],
        hasLadderProblems: false,
      }),
    ).toEqual([]);
  });

  it('names the levels that cannot be billed', () => {
    const needed = beforeYearCanBeCurrent({
      termCount: 3,
      termProblems: [],
      levelsWithoutFees: ['Standard 6', 'Standard 7'],
      hasLadderProblems: false,
    });
    expect(needed.join(' ')).toMatch(/Standard 6, Standard 7/);
    expect(needed.join(' ')).toMatch(/cannot be invoiced at all/);
  });

  it('asks for terms before it asks for anything about them', () => {
    const needed = beforeYearCanBeCurrent({
      termCount: 0,
      termProblems: ['anything'],
      levelsWithoutFees: [],
      hasLadderProblems: false,
    });
    expect(needed).toHaveLength(1);
    expect(needed[0]).toMatch(/Term dates/);
  });
});

describe('where a level leads', () => {
  it('names the next level', () => {
    expect(goesOnTo('promote', 'Standard 5')).toEqual({ text: 'Standard 5', isProblem: false });
  });

  it('says a leaving level leaves', () => {
    expect(goesOnTo('graduate', undefined)).toEqual({ text: 'Leaves school', isProblem: false });
  });

  it('flags a ladder that runs out with nothing recorded', () => {
    // A configuration mistake rather than an outcome, and the promotion run
    // refuses to guess at it — so the screen must not look settled either.
    expect(goesOnTo('undefined', undefined).isProblem).toBe(true);
    expect(goesOnTo('promote', undefined).isProblem).toBe(true);
  });
});

describe('which levels leave at the end of a year', () => {
  it('warns when nothing is selected', () => {
    expect(exitSummary([], '2027')).toMatch(/nobody would leave/);
  });

  it('states one cohort plainly', () => {
    expect(exitSummary([{ name: 'Standard 7', pupils: 34 }], '2027')).toBe(
      'Standard 7 leave at the end of 2027 — 34 pupils in total.',
    );
  });

  it('adds up two cohorts and says the office should be told', () => {
    // December 2027: the last seven-year cohort and the first six-year one sit
    // the same examination. 72 leavers instead of 34 is a certificate order.
    const summary = exitSummary(
      [
        { name: 'Standard 6', pupils: 38 },
        { name: 'Standard 7', pupils: 34 },
      ],
      '2027',
    );
    expect(summary).toMatch(/Standard 6 and Standard 7/);
    expect(summary).toMatch(/72 pupils in total/);
    expect(summary).toMatch(/72 school leavers in one December/);
    expect(summary).toMatch(/order certificates/);
  });

  it('lists three with commas and a final and', () => {
    expect(
      exitSummary(
        [
          { name: 'Pre-primary', pupils: 41 },
          { name: 'Standard 6', pupils: 38 },
          { name: 'Standard 7', pupils: 34 },
        ],
        '2027',
      ),
    ).toMatch(/Pre-primary, Standard 6 and Standard 7/);
  });
});

describe('how full a class is', () => {
  it('reads as a fraction when a capacity is set', () => {
    expect(fillLabel({ pupils: 36, capacity: 40 })).toBe('36 of 40');
    expect(fillState({ pupils: 36, capacity: 40 })).toBe('room');
  });

  it('warns before it is full, not after', () => {
    expect(fillState({ pupils: 38, capacity: 40 })).toBe('nearly-full');
    expect(fillState({ pupils: 40, capacity: 40 })).toBe('full');
  });

  it('reports a class over its capacity rather than calling it impossible', () => {
    // A school that moved 37 children into a room rated 35 has done that.
    expect(fillState({ pupils: 37, capacity: 35 })).toBe('over');
    expect(classWarning({ pupils: 37, capacity: 35 })).toMatch(/37 pupils in a class set to hold 35/);
  });

  it('treats no capacity as no claim about the room', () => {
    expect(fillLabel({ pupils: 61, capacity: null })).toBe('61 pupils');
    expect(fillState({ pupils: 61, capacity: null })).toBe('room');
    expect(classWarning({ pupils: 61, capacity: null })).toBeNull();
  });

  it('says a full class will not be offered to the admission form', () => {
    expect(classWarning({ pupils: 40, capacity: 40 })).toMatch(/admission form/);
  });
});

describe('what a teacher already holds', () => {
  it('says so without inventing a period count', () => {
    // The artboard shows "18 periods". Periods belong to the timetable, which
    // does not exist yet, so this says what is actually known.
    expect(teacherLoad({ className: null, subjectsTaught: 0 })).toBe('no class · no subjects');
    expect(teacherLoad({ className: 'Standard 4 Blue', subjectsTaught: 3 })).toBe(
      'already has Standard 4 Blue · 3 subjects',
    );
    expect(teacherLoad({ className: null, subjectsTaught: 1 })).toBe('no class · 1 subject');
  });
});

describe('subject and class pairs with nobody teaching them', () => {
  const subjects = [
    { id: 'kis', name: 'Kiswahili', levelIds: ['l2', 'l6'] },
    { id: 'mat', name: 'Mathematics', levelIds: ['l2'] },
  ];
  const classes = [
    { id: 'c2', name: 'Standard 2', levelId: 'l2' },
    { id: 'c6', name: 'Standard 6', levelId: 'l6' },
  ];

  it('finds every pair nobody is assigned to', () => {
    const gaps = teachingGaps({ subjects, classes, assigned: [] });
    expect(gaps.map((gap) => `${gap.subjectName} in ${gap.className}`).sort()).toEqual([
      'Kiswahili in Standard 2',
      'Kiswahili in Standard 6',
      'Mathematics in Standard 2',
    ]);
  });

  it('does not invent a gap where the subject is not taught', () => {
    // Mathematics is recorded at Standard 2 only. A school not teaching it in
    // Standard 6 has not left a hole in Standard 6.
    const gaps = teachingGaps({ subjects, classes, assigned: [] });
    expect(gaps.some((gap) => gap.subjectName === 'Mathematics' && gap.className === 'Standard 6')).toBe(
      false,
    );
  });

  it('counts a filled pair as filled', () => {
    const gaps = teachingGaps({
      subjects,
      classes,
      assigned: [
        { subjectId: 'kis', classGroupId: 'c2' },
        { subjectId: 'mat', classGroupId: 'c2' },
      ],
    });
    expect(gaps.map((gap) => gap.className)).toEqual(['Standard 6']);
  });
});

describe('what a fee rule will actually do', () => {
  it('says what an offer will ask a family for', () => {
    expect(depositSentence(30)).toMatch(/30% of the first term/);
  });

  it('names both ways of getting the deposit wrong', () => {
    // Nought fills seats that never pay; a hundred loses seats that would.
    expect(depositSentence(0)).toMatch(/fills seats that never pay/);
    expect(depositSentence(100)).toMatch(/loses places it would have filled/);
  });

  it('spells out a grace period of nothing', () => {
    expect(graceSentence(0)).toMatch(/Nobody is ever not in arrears/);
    expect(graceSentence(14)).toMatch(/14 days after the invoice is issued/);
  });

  it('says out loud what withholding results means', () => {
    // The switch decides whether a child is shown their own marks because of
    // money their parents owe. It should not read like a preference.
    expect(arrearsSentence('results', true)).toMatch(/will not be shown their results/);
    expect(arrearsSentence('results', false)).toMatch(/chased separately/);
    expect(arrearsSentence('promotion', true)).toMatch(/in a year they have otherwise passed/);
  });
});
