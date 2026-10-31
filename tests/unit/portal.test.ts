import { describe, expect, it } from 'vitest';

import {
  PASSWORD_MINIMUM,
  canBankTransfer,
  greet,
  initials,
  owedAcross,
  passwordHint,
  passwordProblem,
  standing,
  standingNote,
} from '@/domain/portal';

const money = (value: number) => `${value.toLocaleString('en-GB')} TZS`;

describe('where a child stands on fees', () => {
  it('separates nothing billed from nothing owed', () => {
    // A family with no bill yet has not paid up; they have not been asked.
    expect(standing({ billed: 0, settled: 0, balance: 0 })).toBe('nothing-billed');
    expect(standing({ billed: 320_000, settled: 320_000, balance: 0 })).toBe('settled');
  });

  it('calls part paid part paid', () => {
    expect(standing({ billed: 325_000, settled: 175_000, balance: 150_000 })).toBe('part-paid');
    expect(standing({ billed: 325_000, settled: 0, balance: 325_000 })).toBe('owing');
  });

  it('tells a family they are in credit rather than showing a cheerful nought', () => {
    // Overpayment usually means a receipt went against the wrong child, and
    // the family is the only one who can say so.
    expect(standing({ billed: 320_000, settled: 400_000, balance: 0 })).toBe('in-credit');
    expect(standingNote({ billed: 320_000, settled: 400_000, balance: 0 }, money)).toMatch(
      /wrong child/,
    );
  });

  it('never tells a parent to pay now, because there is nothing to press', () => {
    for (const fees of [
      { billed: 0, settled: 0, balance: 0 },
      { billed: 325_000, settled: 0, balance: 325_000 },
      { billed: 325_000, settled: 175_000, balance: 150_000 },
      { billed: 320_000, settled: 320_000, balance: 0 },
    ]) {
      expect(standingNote(fees, money).toLowerCase()).not.toMatch(/pay now|pay here/);
    }
  });

  it('says what has been received against what was billed', () => {
    expect(standingNote({ billed: 325_000, settled: 175_000, balance: 150_000 }, money)).toBe(
      '175,000 TZS of 325,000 TZS received.',
    );
  });
});

describe('what a family owes in total', () => {
  it('adds the balances, which is the figure they think in', () => {
    expect(
      owedAcross([
        { billed: 320_000, settled: 320_000, balance: 0 },
        { billed: 325_000, settled: 175_000, balance: 150_000 },
      ]),
    ).toBe(150_000);
  });

  it('does not let one child in credit hide another child owing', () => {
    // A negative balance on one child would otherwise subtract from the total
    // and show a family less than they owe.
    expect(
      owedAcross([
        { billed: 100_000, settled: 180_000, balance: -80_000 },
        { billed: 325_000, settled: 0, balance: 325_000 },
      ]),
    ).toBe(325_000);
  });
});

describe('greeting someone', () => {
  it('uses the first name, in Kiswahili', () => {
    expect(greet('Asha Mwanjala')).toBe('Habari, Asha');
  });

  it('still greets somebody whose name is missing', () => {
    expect(greet(undefined)).toBe('Habari');
    expect(greet('   ')).toBe('Habari');
  });

  it('makes initials from at most two names', () => {
    expect(initials('Asha Mwanjala')).toBe('AM');
    expect(initials('Datius Joseph Mwakalebela')).toBe('DJ');
    expect(initials(undefined)).toBe('');
  });
});

describe('changing a password', () => {
  it('holds to the server rule, not the artboard', () => {
    // The artboard says eight. ChangePasswordRequest enforces ten, and a form
    // that accepted eight would fail on submit with nothing to act on.
    expect(PASSWORD_MINIMUM).toBe(10);
    expect(passwordHint('shortone').tone).toBe('warn');
    expect(passwordHint('shortone').text).toMatch(/8 of 10/);
    expect(passwordHint('longenough1').tone).toBe('ok');
    expect(passwordHint('').tone).toBe('muted');
  });

  it('asks for the current password first', () => {
    expect(
      passwordProblem({ current: '', next: 'longenough1', confirm: 'longenough1' }),
    ).toMatch(/password you use now/);
  });

  it('refuses a mismatch and a too-short password', () => {
    expect(
      passwordProblem({ current: 'old', next: 'short', confirm: 'short' }),
    ).toMatch(/10 characters or more/);
    expect(
      passwordProblem({ current: 'old', next: 'longenough1', confirm: 'longenough2' }),
    ).toMatch(/do not match/);
  });

  it('refuses a new password that is the old one', () => {
    expect(
      passwordProblem({ current: 'samesame12', next: 'samesame12', confirm: 'samesame12' }),
    ).toMatch(/same as the old one/);
  });

  it('allows a password that satisfies all of it', () => {
    expect(
      passwordProblem({ current: 'oldone', next: 'brandnew123', confirm: 'brandnew123' }),
    ).toBeNull();
  });
});

describe('where to pay', () => {
  it('needs a bank and an account number before it says anything', () => {
    // A half-empty table looks like it might be an account number, and a
    // parent transferring fees to a guess is a parent who loses the money.
    expect(
      canBankTransfer({
        bankName: 'NMB',
        accountName: 'Mwenge Primary School',
        accountNumber: '2011 4409 118',
        reference: 'MPS/2027/0142',
      }),
    ).toBe(true);
    expect(
      canBankTransfer({
        bankName: 'NMB',
        accountName: null,
        accountNumber: null,
        reference: 'MPS/2027/0142',
      }),
    ).toBe(false);
  });
});
