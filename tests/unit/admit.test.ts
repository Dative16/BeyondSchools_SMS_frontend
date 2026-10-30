import { describe, expect, it } from 'vitest';

import {
  hasRoom,
  isPhonePlausible,
  loginOutcome,
  normalisePhone,
  placesLabel,
  placesLeft,
  stepAfter,
  stepBefore,
  stepProblem,
} from '@/domain/admit';

const TODAY = new Date('2027-01-12');

const facts = (over: Record<string, unknown> = {}) => ({
  child: {
    firstName: 'Glory',
    surname: 'Mwakalebela',
    dateOfBirth: '2020-04-11',
    sex: 'f' as const,
  },
  guardian: { fullName: 'Asha Mwanjala', phone: '0712445109' },
  classId: 'cg-1',
  ...over,
});

describe('whether a class can take another child', () => {
  it('counts the places left', () => {
    expect(placesLeft({ capacity: 40, pupils: 36 })).toBe(4);
    expect(placesLeft({ capacity: 40, pupils: 40 })).toBe(0);
  });

  it('never reports a negative place count', () => {
    // A capacity lowered after the fact, which is a thing a school does.
    expect(placesLeft({ capacity: 30, pupils: 34 })).toBe(0);
    expect(hasRoom({ capacity: 30, pupils: 34 })).toBe(false);
  });

  it('treats a class with no capacity set as having room', () => {
    // A school that has not said how many fit in a room has not said the room
    // is full. Refusing on a number nobody entered would be invented policy.
    expect(placesLeft({ capacity: null, pupils: 61 })).toBeNull();
    expect(hasRoom({ capacity: null, pupils: 61 })).toBe(true);
    expect(placesLabel({ capacity: null, pupils: 61 })).toBe('61 pupils');
  });

  it('labels what a registrar needs to read', () => {
    expect(placesLabel({ capacity: 40, pupils: 36 })).toBe('4 places left');
    expect(placesLabel({ capacity: 40, pupils: 39 })).toBe('1 place left');
    expect(placesLabel({ capacity: 40, pupils: 40 })).toBe('Full');
  });
});

describe('the guardian’s phone number', () => {
  it('accepts it however a registrar types it', () => {
    // This number is a credential: it is how the family signs in. Caring
    // about spaces would be the system refusing a number it understood.
    expect(normalisePhone('0712 445 109')).toBe('0712445109');
    expect(normalisePhone('+255 712 445 109')).toBe('0712445109');
    expect(normalisePhone('712445109')).toBe('0712445109');
    expect(normalisePhone('0712-445-109')).toBe('0712445109');
  });

  it('refuses what is not a Tanzanian mobile', () => {
    expect(isPhonePlausible('0712445109')).toBe(true);
    expect(isPhonePlausible('0689000111')).toBe(true); // an 068 prefix too
    expect(isPhonePlausible('071244510')).toBe(false); // nine digits
    expect(isPhonePlausible('0812445109')).toBe(false); // no such prefix
    // A landline cannot receive the one-time code they sign in with.
    expect(isPhonePlausible('0222445109')).toBe(false);
  });
});

describe('what a step needs before it can be left', () => {
  it('passes a complete child', () => {
    expect(stepProblem('child', facts(), TODAY)).toBeNull();
  });

  it('asks for both names, because a roll sorted on half of one is no roll', () => {
    expect(
      stepProblem('child', facts({ child: { ...facts().child, surname: '  ' } }), TODAY),
    ).toMatch(/surname/);
  });

  it('refuses a date of birth in the future', () => {
    expect(
      stepProblem('child', facts({ child: { ...facts().child, dateOfBirth: '2030-01-01' } }), TODAY),
    ).toMatch(/future/);
  });

  it('refuses a year that is a slip at a keyboard', () => {
    expect(
      stepProblem('child', facts({ child: { ...facts().child, dateOfBirth: '1066-01-01' } }), TODAY),
    ).toMatch(/year/);
  });

  it('will not leave the child step without girl or boy', () => {
    expect(
      stepProblem('child', facts({ child: { ...facts().child, sex: null } }), TODAY),
    ).toMatch(/Girl or boy/);
  });

  it('will not leave the class step without a class', () => {
    expect(stepProblem('class', facts({ classId: '' }), TODAY)).toMatch(/Choose the class/);
    expect(stepProblem('class', facts(), TODAY)).toBeNull();
  });

  it('will not submit a guardian without a usable number', () => {
    expect(
      stepProblem('guardian', facts({ guardian: { fullName: 'Asha', phone: '07124' } }), TODAY),
    ).toMatch(/Tanzanian mobile/);
    expect(stepProblem('guardian', facts(), TODAY)).toBeNull();
  });
});

describe('moving through the steps', () => {
  it('knows where it is in the sequence', () => {
    expect(stepAfter('child')).toBe('class');
    expect(stepAfter('class')).toBe('guardian');
    expect(stepAfter('guardian')).toBeNull();
    expect(stepBefore('child')).toBeNull();
    expect(stepBefore('guardian')).toBe('class');
  });
});

describe('what happened to the family’s login', () => {
  it('explains each outcome in words a registrar can repeat', () => {
    expect(loginOutcome('created')).toMatch(/one-time code/);
    expect(loginOutcome('promoted')).toMatch(/already had/);
    expect(loginOutcome('already a guardian')).toMatch(/reaches this child/);
  });

  it('says a staff account was left alone, and why that is fine', () => {
    // A class teacher whose own child joins must not be demoted to a parent
    // by the admission: that would cost them the register and the marks.
    expect(loginOutcome('left as class_teacher')).toMatch(/class teacher account/);
    expect(loginOutcome('left as class_teacher')).toMatch(/their own login/);
  });
});
