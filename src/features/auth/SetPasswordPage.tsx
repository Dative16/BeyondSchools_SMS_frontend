/**
 * Set your first password.
 *
 * The same act as a reset — prove the phone, put a password on the account —
 * and the same endpoint. What is different is who is reading it: somebody who
 * has never signed in and is not sure they have an account at all. So the
 * column beside the form spends its words on that, and the page says plainly
 * that it is not a sign-up: the account already exists, the school made it,
 * and this only puts a password on it.
 *
 * It signs you in at the end, where a reset does not. A reset hands over an
 * account that already had a password and is worth one more deliberate step; a
 * first password is somebody arriving, and sending them to a sign-in page to
 * retype what they just chose is a step with nothing behind it.
 *
 * One thing the artboard assumes that is not built yet: it shows the enrolment
 * SMS the school sends with a code good for seven days. Nothing sends that
 * message, so this page asks for the code itself. The flow is the same; the
 * code is thirty minutes old rather than seven days.
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { ApiError } from '@/api/client';
import { Button, Field, Notice, TextInput } from '@/components/ui';
import { looksLikePhone, normalisePhone, spacedPhone } from '@/domain/phone';

import { fetchBranding, setPasswordWithCode, startPasswordReset } from './api';
import { useAuth } from './AuthProvider';
import { CodeAndPassword } from './components/CodeAndPassword';
import { GateLayout, GateNote, Steps } from './components/GateLayout';

export default function SetPasswordPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [phone, setPhone] = useState('');
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
      setStep(2);
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
    const number = normalisePhone(phone);
    try {
      await setPasswordWithCode(number, code, password);
      // Straight in with what was just set, rather than a sign-in page asking
      // them to retype it. The code is spent either way.
      await signIn(number, password, false);
      void navigate('/', { replace: true });
    } catch (caught) {
      setError(
        caught instanceof ApiError && caught.status === 401
          ? 'That code did not work. Check it, or ask for a new one.'
          : caught instanceof ApiError
            ? caught.detail
            : 'That did not go through. Try again in a moment.',
      );
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
          <GateNote title="This is not a sign-up">
            <p className="m-0">
              Your account already exists; the school made it when it enrolled your child,
              or when an administrator added you. This page only puts a password on it.
              Nobody can create an account here who is not already on a school record.
            </p>
          </GateNote>

          <GateNote title="The code comes by SMS">
            <p className="m-0">
              It is six digits in the message itself, not a link to tap, so it still works
              on a phone that cannot open links.
            </p>
            <p className="m-0">
              It can only go to the number the school already holds for you. If that number
              has changed, ring the office — they cannot tell you a password, only send a
              code to the right handset.
            </p>
          </GateNote>
        </>
      }
    >
      <Steps at={step} of={2} />

      {step === 1 ? (
        <form onSubmit={(event) => void send(event)}>
          <h1 className="m-0 mb-1.5 font-display text-2xl font-semibold tracking-[-0.02em]">
            Get your code
          </h1>
          <p className="m-0 mb-5 text-[13.5px] leading-relaxed text-muted">
            We will send six digits by SMS to the number the school holds for you. It goes
            only to that number, so nobody else can set your password.
          </p>

          <div className="flex flex-col gap-4">
            {error ? <Notice>{error}</Notice> : null}
            <Field
              label="Phone number"
              hint="The number you gave the school."
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
            <p className="m-0 text-[12.5px] leading-relaxed text-muted">
              Already have a password?{' '}
              <Link to="/login" className="font-semibold text-ok-ink no-underline">
                Sign in instead
              </Link>
              .
            </p>
          </div>
        </form>
      ) : (
        <div>
          <h1 className="m-0 mb-1.5 font-display text-2xl font-semibold tracking-[-0.02em]">
            Choose a password
          </h1>
          <p className="m-0 mb-5 text-[13.5px] leading-relaxed text-muted">
            Sent to {spacedPhone(phone)}. Pick something you will remember without writing
            it down.
          </p>

          <CodeAndPassword
            codeLabel="Six-digit code"
            codeHelp="Six digits, from the SMS."
            submitLabel="Set my password and sign in"
            busy={busy}
            error={error}
            onSubmit={(code, password) => void finish(code, password)}
            onBack={() => {
              setError(null);
              setStep(1);
            }}
            backLabel="Use a different number"
          />
        </div>
      )}
    </GateLayout>
  );
}
