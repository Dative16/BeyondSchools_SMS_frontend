/**
 * Signing in.
 *
 * Two doors, because there are two kinds of user. Staff have an email and a
 * password. A guardian has a phone and no patience for a password they set once
 * in January — they get a code by SMS, which is also the only credential the
 * public application form uses, so it is a path that has to work.
 *
 * The school's name and colour come from `/auth/school`, which needs no
 * account: a parent who lands here should see their own school, not a product.
 * While that is loading the form is already usable — branding is not something
 * to wait on before letting somebody type their password.
 */

import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { ApiError } from '@/api/client';
import { Button, Field, Notice, TextInput } from '@/components/ui';
import { msisdn } from '@/lib/format';

import { fetchBranding, startOtp } from './api';
import { useAuth } from './AuthProvider';

type Door = 'password' | 'code';

export default function LoginPage() {
  const { status, signIn, signInWithCode } = useAuth();
  const location = useLocation();
  const [door, setDoor] = useState<Door>('password');

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
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-canvas px-4 py-10">
      <header className="flex flex-col items-center gap-2 text-center">
        <span
          className="inline-block h-3 w-3 rounded-[3px]"
          style={{ background: branding.data?.brand_color ?? '#22c55e' }}
          aria-hidden="true"
        />
        <h1 className="m-0 font-display text-[22px] font-semibold tracking-[-0.02em]">
          {branding.data?.name ?? 'BeyondSchools'}
        </h1>
        <p className="m-0 text-[13px] text-muted">
          {branding.isError
            ? 'Sign in to the school management system'
            : 'School management system'}
        </p>
      </header>

      <div className="w-full max-w-sm rounded-card border border-line bg-white p-5">
        <div
          role="group"
          aria-label="How you sign in"
          className="mb-5 flex gap-1 rounded-control bg-canvas p-1"
        >
          <DoorTab active={door === 'password'} onClick={() => setDoor('password')}>
            Staff
          </DoorTab>
          <DoorTab active={door === 'code'} onClick={() => setDoor('code')}>
            Parent
          </DoorTab>
        </div>

        {door === 'password' ? (
          <PasswordForm onSubmit={signIn} />
        ) : (
          <CodeForm onSubmit={signInWithCode} />
        )}
      </div>

      <p className="m-0 text-center text-[13px] text-muted">
        Applying for a place?{' '}
        <Link to="/apply" className="font-semibold text-ok-ink no-underline hover:text-brand-ink">
          Start an application
        </Link>
      </p>
    </main>
  );
}

function DoorTab({
  active,
  onClick,
  children,
}: {
  readonly active: boolean;
  readonly onClick: () => void;
  readonly children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex-1 rounded-[6px] text-[13px] font-semibold ${
        active ? 'bg-white text-ink shadow-[0_0_0_1px_var(--color-line)]' : 'text-muted'
      }`}
    >
      {children}
    </button>
  );
}

/** Whatever went wrong, say the same thing: the difference is what an attacker probes for. */
const SIGN_IN_FAILED = 'That email and password do not match an account at this school.';

function PasswordForm({
  onSubmit,
}: {
  readonly onSubmit: (identifier: string, password: string) => Promise<void>;
}) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await onSubmit(identifier.trim(), password);
    } catch (caught) {
      // A lockout is worth saying plainly — somebody waiting fifteen minutes
      // needs to know they are waiting, not keep typing.
      setError(
        caught instanceof ApiError && caught.status === 423 ? caught.detail : SIGN_IN_FAILED,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
      {error ? <Notice>{error}</Notice> : null}
      <Field label="Email or phone" required>
        <TextInput
          name="identifier"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
        />
      </Field>
      <Field label="Password" required>
        <TextInput
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </Field>
      <Button type="submit" variant="primary" busy={busy} className="w-full">
        Sign in
      </Button>
    </form>
  );
}

function CodeForm({
  onSubmit,
}: {
  readonly onSubmit: (phone: string, code: string) => Promise<void>;
}) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sentAt, setSentAt] = useState<number | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Count the wait down rather than leaving a dead button: a parent who cannot
  // see why "Send again" does nothing taps it until they give up.
  useEffect(() => {
    if (resendIn <= 0) return;
    const id = window.setTimeout(() => setResendIn((left) => left - 1), 1_000);
    return () => window.clearTimeout(id);
  }, [resendIn]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const sent = await startOtp(phone.replace(/\s/g, ''));
      setSentAt(Date.now());
      setResendIn(sent.resend_after_seconds);
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.detail : 'The code could not be sent. Try again.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await onSubmit(phone.replace(/\s/g, ''), code.trim());
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.detail : 'That code did not work. Ask for a new one.',
      );
    } finally {
      setBusy(false);
    }
  }

  if (sentAt === null) {
    return (
      <form onSubmit={(event) => void send(event)} className="flex flex-col gap-4">
        {error ? <Notice>{error}</Notice> : null}
        <Field
          label="Phone number"
          hint="The number the school has for you, starting 0."
          required
        >
          <TextInput
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            placeholder="0754 118 902"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </Field>
        <Button type="submit" variant="primary" busy={busy} className="w-full">
          Send me a code
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={(event) => void verify(event)} className="flex flex-col gap-4">
      {error ? <Notice>{error}</Notice> : null}
      <Notice tone="info">We sent a code to {msisdn(phone)}. It lasts ten minutes.</Notice>
      <Field label="The code from the SMS" required>
        <TextInput
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          required
          value={code}
          onChange={(event) => setCode(event.target.value)}
          className="text-center text-lg tracking-[0.3em]"
        />
      </Field>
      <Button type="submit" variant="primary" busy={busy} className="w-full">
        Sign in
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={resendIn > 0}
        onClick={() => setSentAt(null)}
        className="w-full"
      >
        {resendIn > 0 ? `Send again in ${resendIn}s` : 'Use a different number'}
      </Button>
    </form>
  );
}
