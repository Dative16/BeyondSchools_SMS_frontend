import { describe, expect, it } from 'vitest';

import {
  COMMONLY_REQUIRED,
  documentKindLabel,
  missingRequired,
  moveConsequence,
  moveProblem,
} from '@/domain/profile';

describe('what the school is still missing', () => {
  it('names the two it is asked for first', () => {
    expect(missingRequired([])).toEqual([...COMMONLY_REQUIRED]);
    expect(missingRequired(['birth_certificate'])).toEqual(['passport_photo']);
    expect(missingRequired(['birth_certificate', 'passport_photo'])).toEqual([]);
  });

  it('reads a kind in the words a registrar uses, in both languages', () => {
    expect(documentKindLabel('birth_certificate')).toMatch(/cheti cha kuzaliwa/);
    expect(documentKindLabel('passport_photo')).toMatch(/picha ya pasipoti/);
  });

  it('falls back to something readable for a kind it does not know', () => {
    expect(documentKindLabel('some_new_thing')).toBe('some new thing');
  });
});

describe('moving a child between classes', () => {
  const base = {
    fromClassId: 'cg-blue',
    toClassId: 'cg-green',
    toYearId: 'y27',
    enrolmentYearId: 'y27',
    toCapacity: 40,
    toPupils: 30,
  };

  it('allows an ordinary move', () => {
    expect(moveProblem(base)).toBeNull();
  });

  it('refuses the class they are already in', () => {
    expect(moveProblem({ ...base, toClassId: 'cg-blue' })).toMatch(/already in/);
  });

  it('refuses a class from another year', () => {
    // A move is a change to this year's enrolment. A class from last year
    // would quietly move the child onto a roll nobody is looking at.
    expect(moveProblem({ ...base, toYearId: 'y26' })).toMatch(/different academic year/);
  });

  it('refuses a full class and says how full', () => {
    expect(moveProblem({ ...base, toPupils: 40 })).toMatch(/full \(40 of 40\)/);
  });

  it('allows a move into a class with no capacity set', () => {
    expect(moveProblem({ ...base, toCapacity: null, toPupils: 61 })).toBeNull();
  });

  it('asks for a destination', () => {
    expect(moveProblem({ ...base, toClassId: '' })).toMatch(/Choose the class/);
  });
});

describe('what a move costs the family', () => {
  it('warns when the level changes, because the fees follow the level', () => {
    const said = moveConsequence({
      fromLevelId: 'l4',
      toLevelId: 'l5',
      toClassName: 'Standard 5 Blue',
    });
    expect(said).toMatch(/different level/);
    expect(said).toMatch(/billed from that level's fee structure/);
    // And that nothing already raised moves.
    expect(said).toMatch(/keep their figures/);
  });

  it('says plainly when a stream move changes nothing', () => {
    // A registrar moving somebody for a timetable reason needs to know they
    // have not just changed a family's fees.
    expect(
      moveConsequence({ fromLevelId: 'l4', toLevelId: 'l4', toClassName: 'Standard 4 Green' }),
    ).toMatch(/does not change/);
  });
});
