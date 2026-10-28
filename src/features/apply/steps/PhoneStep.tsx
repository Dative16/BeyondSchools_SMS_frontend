/**
 * Step one: the phone number, and the code that verifies it.
 *
 * This is the whole credential. There is no password, no email and no account
 * — a parent types a number, receives six digits by SMS, and from then on the
 * form is theirs. That is not a shortcut: a password set once in January is a
 * password nobody has in March, and an email address is something a good many
 * of these families do not have.
 *
 * The number is normalised rather than validated strictly. People write their
 * own number six different ways and all of them are the same number; a form
 * that rejects five is a form that loses the applicant instead of fixing the
 * input.
 */

import { useEffect, useState } from 'react';

import { sendCode, verifyCode } from '@/api/queries/apply';
import { Button, Field, Notice, TextInput } from '@/components/ui';
import { looksLikePhone, normalisePhone } from '@/domain/phone';
import { msisdn } from '@/lib/format';

export function PhoneStep({
  phone,
  onPhone,
  onVerified,
}: {
  readonly phone: string;
  readonly onPhone: (phone: string) => void;
  readonly onVerified: () => void;
}) {
  const [typed, setTyped] = useState(phone);
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = window.setTimeout(() => setResendIn((left) => left - 1), 1_000);
    return () => window.clearTimeout(id);
  }, [resendIn]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const normalised = normalisePhone(typed);
    if (!looksLikePhone(normalised)) {
      setError('That does not look like a Tanzanian mobile number. It starts 06 or 07.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const answer = await sendCode(normalised);
      onPhone(normalised);
      setSent(true);
      setResendIn(answer.resend_after_seconds);
    } catch {
      setError('The code could not be sent just now. Try again in a moment.');
    } finally {
      setBusy(false);
    }
  }

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await verifyCode(normalisePhone(typed), code.trim());
      onVerified();
    } catch {
      setError('That code did not work. Check it, or ask for a new one.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Body>
      {!sent ? (
        <form onSubmit={(event) => void send(event)} className="flex flex-col gap-4">
          <h1 className="m-0 font-display text-[21px] font-semibold tracking-[-0.02em]">
            Apply for a place
          </h1>
          <p className="m-0 text-[13.5px] leading-relaxed text-muted">
            We start with your phone number. The school will use it to reach you, and you
            will use it to come back to this form.
          </p>

          {error ? <Notice>{error}</Notice> : null}

          <Field
            label="Your phone number"
            hint="We send one code by SMS. No account, no password."
            required
          >
            <TextInput
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              autoFocus
              placeholder="0754 118 902"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              className="min-h-12 rounded-[10px] text-[15px]"
            />
          </Field>

          <Footer>
            <Button type="submit" variant="primary" busy={busy} className="min-h-[50px] w-full">
              Send me a code
            </Button>
          </Footer>
        </form>
      ) : (
        <form onSubmit={(event) => void verify(event)} className="flex flex-col gap-4">
          <h1 className="m-0 font-display text-[21px] font-semibold tracking-[-0.02em]">
            Enter the code
          </h1>
          <p className="m-0 text-[13.5px] leading-relaxed text-muted">
            We sent six digits to {msisdn(normalisePhone(typed))}. It lasts ten minutes.
          </p>

          {error ? <Notice>{error}</Notice> : null}

          <Field label="The code from the SMS" required>
            <TextInput
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={6}
              required
              autoFocus
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="min-h-12 rounded-[10px] text-center text-lg tracking-[0.3em]"
            />
          </Field>

          <button
            type="button"
            disabled={resendIn > 0}
            onClick={() => {
              setSent(false);
              setCode('');
            }}
            className="self-start text-[13px] font-semibold text-ok-ink disabled:text-muted"
          >
            {resendIn > 0 ? `Send again in ${resendIn}s` : 'Use a different number'}
          </button>

          <Footer>
            <Button type="submit" variant="primary" busy={busy} className="min-h-[50px] w-full">
              Continue
            </Button>
          </Footer>
        </form>
      )}
    </Body>
  );
}

function Body({ children }: { readonly children: React.ReactNode }) {
  return <div className="flex min-h-0 flex-1 flex-col px-5 pt-1 pb-5">{children}</div>;
}

function Footer({ children }: { readonly children: React.ReactNode }) {
  return <div className="mt-auto pt-4">{children}</div>;
}
