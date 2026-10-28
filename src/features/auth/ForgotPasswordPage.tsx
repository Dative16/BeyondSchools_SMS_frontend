/**
 * Forgot your password.
 *
 * Three steps: ask for a code, use it, done. The second and third are where
 * the care is.
 *
 * The page never says whether a number is registered. Everything after "send
 * me a code" is phrased as a conditional — *if that number is on a school
 * record* — because a page that answered would be a way to ask which families
 * have a child at this school. The server answers the same way for a wrong
 * code and an unknown number, and this screen does not undo that by being
 * more helpful than it should be.
 *
 * It ends at sign in rather than signing somebody in. A reset hands over an
 * account, and typing the new password once more is the step that catches one
 * typed wrong twice.
 */

import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { ApiError } from '@/api/client';
import { Button, Field, Notice, TextInput } from '@/components/ui';
import { looksLikePhone, normalisePhone, spacedPhone } from '@/domain/phone';

import { fetchBranding, setPasswordWithCode, startPasswordReset } from './api';
import { CodeAndPassword } from './components/CodeAndPassword';
import { DoneMark, GateLayout, GateNote } from './components/GateLayout';

type Step = 'ask' | 'sent' | 'done';

export default function ForgotPasswordPage() {
  const [params] = useSearchParams();
  const [step, setStep] = useState<Step>('ask');
  const [phone, setPhone] = useState(params.get('phone') ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const branding = useQuery({
    queryKey: ['branding'],
    queryFn: fetchBranding,
    staleTime: 10 * 60_000,
    retry: false,
  });

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!looksLikePhone(phone)) {
      setError('That does not look like a Tanzanian mobile number. It starts 06 or 07.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await startPasswordReset(normalisePhone(phone));
      setStep('sent');
    } catch (caught) {
      setError(
        caught instanceof ApiError && caught.status === 429
          ? 'Too many codes have been sent to that number. Wait an hour and try again.'
          : 'The code could not be sent just now. Try again in a moment.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function finish(code: string, password: string) {
    setError(null);
    setBusy(true);
    try {
      await setPasswordWithCode(normalisePhone(phone), code, password);
      setStep('done');
    } catch (caught) {
      setError(
        caught instanceof ApiError && caught.status === 401
          ? 'That code did not work. Check it, or ask for a new one.'
          : caught instanceof ApiError
            ? caught.detail
            : 'That did not go through. Try again in a moment.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <GateLayout
      schoolName={branding.data?.name}
      brandColour={branding.data?.brand_color}
      action={{ label: 'Back to sign in', to: '/login' }}
      aside={
        <>
          <GateNote title="Never set a password?">
            <p className="m-0">
              If you have never signed in at all, you want the code the school sent you, not
              this page.
            </p>
            <Link
              to="/set-password"
              className="inline-flex min-h-12 items-center justify-center rounded-[10px] border border-line bg-white text-sm font-semibold text-ink no-underline hover:bg-canvas"
            >
              Set my first password
            </Link>
          </GateNote>

          <GateNote title="Staff accounts">
            <p className="m-0">
              Teachers and the bursar reset the same way, on the number the school holds.
            </p>
          </GateNote>

          <GateNote title="Too many tries">
            <p className="m-0">
              Five wrong codes and that code is dead — ask for a new one. Only five codes
              can be sent to a number in an hour, so after that the only way through is to
              wait.
            </p>
          </GateNote>
        </>
      }
    >
      {step === 'ask' ? (
        <form onSubmit={(event) => void send(event)}>
          <h1 className="m-0 mb-1.5 font-display text-2xl font-semibold tracking-[-0.02em]">
            Forgot your password
          </h1>
          <p className="m-0 mb-5 text-[13.5px] leading-relaxed text-muted">
            We will send a code by SMS to the number the school holds for you. It can only
            go to that number, never a new one.
          </p>

          <div className="flex flex-col gap-4">
            {error ? <Notice>{error}</Notice> : null}
            <Field
              label="Phone number"
              hint="The number the school has on your record."
              required
            >
              <TextInput
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                autoFocus
                placeholder="0754 000 000"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="min-h-12 rounded-[10px] text-[15px]"
              />
            </Field>
            <Button type="submit" variant="primary" busy={busy} className="min-h-[50px] w-full">
              Send me a code
            </Button>
          </div>

          <div className="mt-5 border-t border-line-soft pt-4.5">
            <p className="m-0 mb-2 text-[13px] font-semibold">If your number has changed</p>
            <p className="m-0 text-[12.5px] leading-relaxed text-muted">
              A code cannot be sent to a number that is not on your record, because that is
              what stops somebody else taking your account. Ring the office or come in with
              your ID, and they will change it the same day.
            </p>
          </div>
        </form>
      ) : step === 'sent' ? (
        <div>
          <h1 className="m-0 mb-1.5 font-display text-2xl font-semibold tracking-[-0.02em]">
            Check your messages
          </h1>
          <p className="m-0 mb-5 text-[13.5px] leading-relaxed text-muted">
            If {spacedPhone(phone)} is on a school record, a six-digit code is on its way.
            It is good for thirty minutes.
          </p>

          <div className="mb-5 rounded-[10px] border border-line bg-canvas px-3.5 py-3">
            <p className="m-0 text-[12.5px] leading-relaxed text-ink-dim">
              We do not say whether the number is registered. That keeps somebody from using
              this page to find out who has a child at this school.
            </p>
          </div>

          <CodeAndPassword
            codeLabel="Six-digit code"
            codeHelp="Six digits, good for thirty minutes."
            submitLabel="Set the new password"
            busy={busy}
            error={error}
            onSubmit={(code, password) => void finish(code, password)}
            onBack={() => {
              setError(null);
              setStep('ask');
            }}
            backLabel="Use a different number"
          />
        </div>
      ) : (
        <div>
          <DoneMark />
          <h1 className="m-0 mb-1.5 font-display text-2xl font-semibold tracking-[-0.02em]">
            Password changed
          </h1>
          <p className="m-0 mb-5 text-[13.5px] leading-relaxed text-muted">
            Anywhere you were already signed in has been signed out, so if somebody else had
            got into your account they are out now.
          </p>
          <Link
            to={`/login?phone=${encodeURIComponent(normalisePhone(phone))}`}
            className="flex min-h-[50px] items-center justify-center rounded-[10px] bg-brand-strong text-[15px] font-semibold text-white no-underline hover:bg-brand-ink"
          >
            Sign in
          </Link>
        </div>
      )}
    </GateLayout>
  );
}
