import { describe, expect, it } from 'vitest';

import {
  MIN_PASSWORD_LENGTH,
  canSetPassword,
  passwordHint,
  passwordProblem,
  passwordsMatch,
} from '@/domain/password';
import { looksLikePhone, normalisePhone, spacedPhone } from '@/domain/phone';

describe('choosing a password', () => {
  it('says nothing about an empty box', () => {
    // Telling somebody their password is too short before they have typed one
    // is a form arguing with a person who has not spoken yet.
    expect(passwordProblem('')).toBeNull();
    expect(passwordHint('')).toEqual({
      text: '10 characters or more.',
      tone: 'muted',
    });
  });

  it('counts out how far somebody has got', () => {
    expect(passwordHint('short')).toEqual({
      text: 'Too short: 5 of 10 characters.',
      tone: 'warn',
    });
  });

  it('agrees with the server about the minimum', () => {
    // The server enforces ten. A screen that said eight would refuse a
    // password it had just called long enough.
    expect(MIN_PASSWORD_LENGTH).toBe(10);
    expect(passwordProblem('a'.repeat(9))).not.toBeNull();
    expect(passwordProblem('a'.repeat(10))).toBeNull();
  });

  it('asks for length and nothing else', () => {
    // A rule about capitals and punctuation produces "Passw0rd!" and a note on
    // the back of a phone case. Three ordinary words beat both.
    expect(passwordProblem('correct horse battery')).toBeNull();
  });

  it('only complains about a mismatch once the second box has something in it', () => {
    expect(passwordsMatch('elephantine', '')).toBe(false);
    expect(passwordsMatch('elephantine', 'eleph')).toBe(false);
    expect(passwordsMatch('elephantine', 'elephantine')).toBe(true);
  });

  it('will not submit until both boxes agree and the password is long enough', () => {
    expect(canSetPassword('short', 'short')).toBe(false);
    expect(canSetPassword('elephantine', 'elephantina')).toBe(false);
    expect(canSetPassword('elephantine', 'elephantine')).toBe(true);
  });
});

describe('a phone number, now that it is the credential', () => {
  it('reduces the six ways people write one to the form the server stores', () => {
    // Three screens send a number to the server. If they disagree, a parent
    // who typed +255 on Monday and 0 on Tuesday has two logins.
    for (const written of ['0754118902', '+255754118902', '255 754 118 902', '754118902']) {
      expect(normalisePhone(written)).toBe('0754118902');
    }
  });

  it('catches the landline somebody types out of habit', () => {
    // An SMS to one never arrives, and the silence looks like a broken system.
    expect(looksLikePhone('0222 110 000')).toBe(false);
    expect(looksLikePhone('0754 118 902')).toBe(true);
  });

  it('writes a number back the way it is written down', () => {
    expect(spacedPhone('+255754118902')).toBe('0754 118 902');
  });
});
