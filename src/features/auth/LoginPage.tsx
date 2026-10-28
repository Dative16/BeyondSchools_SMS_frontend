/**
 * Signing in, rebuilt to the SignIn artboard.
 *
 * The artboard changed the model, not just the look. What was here before had
 * two doors — staff with an email and a password, guardians with a code by
 * SMS — and the design has one: everybody signs in with the phone number the
 * school holds and a password they chose. Codes have not gone away; they moved
 * to the two places they are actually needed, setting a first password and
 * resetting a forgotten one. That is the better shape. A code every time means
 * an SMS every time, which is a bill the school pays and a wait on a congested
 * network at eight in the morning.
 *
 * The server still accepts an email as the identifier, so a staff account set
 * up before this change keeps working. The label says phone because that is
 * what almost everybody has.
 *
 * The column beside the form is not decoration. Everybody who lands here is
 * either new or stuck, and "there is no sign-up" answers the commonest wrong
 * assumption before somebody hunts for a button that does not exist.
 */

import { useState } from 'react';
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { ApiError } from '@/api/client';
import { Button, Field, Notice, TextInput } from '@/components/ui';

import { fetchBranding } from './api';
import { useAuth } from './AuthProvider';
import { GateLayout, GateNote } from './components/GateLayout';

export default function LoginPage() {
  const { status, signIn } = useAuth();
  const location = useLocation();
  const [params] = useSearchParams();

  const branding = useQuery({
    queryKey: ['branding'],
    queryFn: fetchBranding,
    staleTime: 10 * 60_000,
    retry: false,
  });

  if (status === 'signed-in') {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from ?? '/'} replace />;
  }

  return (
    <GateLayout
      schoolName={branding.data?.name}
      brandColour={branding.data?.brand_color}
      aside={
        <>
          <GateNote title="There is no sign-up">
            <p className="m-0">
              Accounts are not created here. The school creates yours: a guardian gets one
              when a child is enrolled, a pupil when the guardian accepts the place, and
              staff when an administrator adds them.
            </p>
            <p className="m-0">
              If your child is enrolled and you still cannot get in, ring the office. They
              can see whether your number is on the record.
            </p>
          </GateNote>

          <GateNote title="Looking for a place?">
            <p className="m-0">
              Applying does not need an account. The form asks for your phone number and
              sends you a code to come back with.
            </p>
            <Link
              to="/apply"
              className="inline-flex min-h-12 items-center justify-center rounded-[10px] border border-line bg-white text-sm font-semibold text-ink no-underline hover:bg-canvas"
            >
              Apply for a place
            </Link>
          </GateNote>

          <GateNote title="Sharing a phone">
            <p className="m-0">
              If several people use this handset, leave the box above unticked and sign out
              when you are done. Your fee statement and your children&rsquo;s records are
              behind it.
            </p>
          </GateNote>
        </>
      }
    >
      {/* A reset finishes here and hands the number along, so somebody who
          has just typed it twice does not type it a third time. */}
      <SignInForm onSubmit={signIn} knownPhone={params.get('phone') ?? ''} />
    </GateLayout>
  );
}

/** A server message, started as a sentence. */
const sentence = (text: string): string =>
  text.length === 0 ? text : text[0]!.toUpperCase() + text.slice(1);

function SignInForm({
  onSubmit,
  knownPhone,
}: {
  readonly onSubmit: (identifier: string, password: string, remember: boolean) => Promise<void>;
  readonly knownPhone: string;
}) {
  const [identifier, setIdentifier] = useState(knownPhone);
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await onSubmit(identifier.trim(), password, remember);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 423) {
        // A lock-out is worth saying plainly: somebody waiting fifteen minutes
        // needs to know they are waiting rather than keep typing.
        setError('This account is locked for fifteen minutes after too many attempts.');
      } else if (caught instanceof ApiError && caught.status === 401) {
        // The server's own sentence. It carries the warning when an account is
        // close to its limit, and nothing at all before that — a countdown from
        // five would tell somebody guessing how far they had got. It is
        // written for a log, so it starts a sentence here.
        setError(sentence(caught.detail));
      } else {
        setError('We could not reach the school just now. Try again in a moment.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)}>
      <h1 className="m-0 mb-1.5 font-display text-2xl font-semibold tracking-[-0.02em]">
        Sign in
      </h1>
      <p className="m-0 mb-6 text-[13.5px] leading-relaxed text-muted">
        Guardians, pupils and staff all sign in here with the phone number the school holds
        for them.
      </p>

      {/* Both are failures somebody has to act on, so both announce. A
          lock-out rendered as a polite status is a lock-out a screen reader
          never mentions, and the person keeps typing into a dead form. */}
      {error ? (
        <div className="mb-5">
          <Notice>{error}</Notice>
        </div>
      ) : null}

      <div className="flex flex-col gap-4">
        <Field
          label="Phone number"
          hint="The number the school has on your record."
          required
        >
          <TextInput
            name="identifier"
            type="text"
            inputMode="tel"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            autoFocus={knownPhone === ''}
            placeholder="0754 118 902"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            className="min-h-12 rounded-[10px] text-[15px]"
          />
        </Field>

        <div>
          <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2.5">
            <span className="text-[13px] font-semibold">Password</span>
            <Link
              to="/forgot-password"
              className="text-[12.5px] font-medium text-ok-ink no-underline hover:text-brand-ink"
            >
              Forgot it?
            </Link>
          </div>
          <label htmlFor="password" className="sr-only">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="min-h-12 w-full rounded-[10px] border border-line bg-white px-3.5 text-[15px] text-ink"
          />
        </div>

        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
            className="h-[18px] max-h-[18px] min-h-[18px] w-[18px] flex-none accent-brand-strong"
          />
          <span className="text-[13px] text-ink-soft">Keep me signed in on this device</span>
        </label>

        <Button type="submit" variant="primary" busy={busy} className="min-h-[50px] w-full">
          Sign in
        </Button>
      </div>

      <div className="mt-6 border-t border-line-soft pt-5">
        <p className="m-0 mb-2.5 text-[13px] font-semibold">First time here?</p>
        <p className="m-0 mb-3.5 text-[12.5px] leading-relaxed text-muted">
          The school sends a code by SMS when your child is enrolled, or when staff are
          added. Use it to put a password on the account you already have.
        </p>
        <Link
          to="/set-password"
          className="flex min-h-12 items-center justify-center rounded-[10px] border border-line bg-white text-sm font-semibold text-ink no-underline hover:bg-canvas"
        >
          Set my first password
        </Link>
      </div>
    </form>
  );
}
