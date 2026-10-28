import { describe, expect, it } from 'vitest';

import { missingInWords, stepFor, timeLeft } from '@/domain/apply';
import { looksLikePhone, normalisePhone } from '@/domain/phone';

describe('a phone number as people actually write it', () => {
  it('accepts the six forms of the same number', () => {
    // A form that rejects five of these loses the applicant rather than
    // fixing the input.
    for (const written of [
      '0754118902',
      '0754 118 902',
      '+255754118902',
      '255 754 118 902',
      '754118902',
      ' 0754-118-902 ',
    ]) {
      expect(normalisePhone(written)).toBe('0754118902');
    }
  });

  it('knows a Tanzanian mobile from something else', () => {
    expect(looksLikePhone('0754 118 902')).toBe(true);
    expect(looksLikePhone('+255 682 445 294')).toBe(true);
    expect(looksLikePhone('0222 110 000')).toBe(false); // a landline
    expect(looksLikePhone('07541189')).toBe(false); // too short
    expect(looksLikePhone('hello')).toBe(false);
  });
});

describe('how long is left', () => {
  it('counts only the steps still to come', () => {
    expect(timeLeft('phone')).toBe('About 3 minutes left');
    expect(timeLeft('child')).toBe('About 2 minutes left');
    expect(timeLeft('guardian')).toBe('About 1 minute left');
  });

  it('says nothing on the last step rather than "0 minutes"', () => {
    expect(timeLeft('review')).toBeNull();
  });
});

describe('what is still missing', () => {
  it('says it in words a parent can act on', () => {
    // The server answers with field names, which are right for a log and
    // useless on a screen.
    expect(missingInWords(['guardian_relationship', 'date_of_birth'])).toEqual([
      'How you are related to the child',
      'Date of birth',
    ]);
  });

  it('drops the verification flag, which is not something to fill in', () => {
    expect(missingInWords(['phone_verified', 'child_surname'])).toEqual([
      "Your child's surname",
    ]);
  });

  it('passes through a field it does not recognise rather than hiding it', () => {
    // A message nobody expected is still better than silence.
    expect(missingInWords(['something_new'])).toEqual(['something_new']);
  });

  it('knows which step to send somebody back to', () => {
    expect(stepFor('guardian_phone')).toBe('guardian');
    expect(stepFor('date_of_birth')).toBe('child');
    expect(stepFor('phone_verified')).toBe('phone');
  });
});
