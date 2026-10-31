/**
 * My account. Built to `MyAccount.dc.html` and `MyAccountPhone.dc.html`.
 *
 * Two facts shape it. A guardian's phone number is how they sign in, so the
 * office changes it rather than them — a form that let a parent edit the
 * number they authenticate with is a form that locks people out of their own
 * children's fees. And the password rule is the server's: ten characters, not
 * the eight the artboard asks for, because a form that accepted eight would
 * fail on submit with an error nobody could act on.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';

import { useMyChildren } from '@/api/queries/portal';
import { useChangePassword } from '@/api/queries/portal';
import { Button, Card, CardHeader, Field, Notice, TextInput } from '@/components/ui';
import { PASSWORD_MINIMUM, initials, passwordHint, passwordProblem } from '@/domain/portal';
import { useAuth } from '@/features/auth/AuthProvider';
import { msisdn } from '@/lib/format';

export default function MyAccountPage() {
  const { principal, signOut } = useAuth();
  const children = useMyChildren(principal?.role === 'guardian');
  const change = useChangePassword();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const [showProblem, setShowProblem] = useState(false);

  const hint = passwordHint(next);
  const problem = passwordProblem({ current, next, confirm });

  async function submit() {
    if (problem) {
      setShowProblem(true);
      return;
    }
    await change.mutateAsync({ current_password: current, new_password: next });
    setCurrent('');
    setNext('');
    setConfirm('');
    setShowProblem(false);
    setDone(true);
  }

  const isGuardian = principal?.role === 'guardian';

  return (
    <>
      <p className="mt-0 mb-3">
        <Link
          to="/"
          className="text-[12.5px] font-semibold text-ink-dim no-underline hover:text-ink"
        >
          &larr; Back
        </Link>
      </p>

      <div className="mb-5">
        <h1 className="m-0 mb-1 font-display text-[22px] font-semibold tracking-[-0.02em] sm:text-[26px]">
          My account
        </h1>
        <p className="m-0 text-sm text-muted">{principal?.full_name}</p>
      </div>

      <div className="flex max-w-2xl flex-col gap-4.5">
        <Card>
          <div className="mb-4 flex items-center gap-3.5">
            <span
              aria-hidden="true"
              className="grid h-12 w-12 flex-none place-items-center rounded-full bg-ink text-base font-semibold text-white"
            >
              {initials(principal?.full_name)}
            </span>
            <div className="min-w-0">
              <p className="m-0 mb-0.5 text-[15.5px] font-semibold">{principal?.full_name}</p>
              <p className="m-0 text-[12.5px] text-muted">
                {isGuardian
                  ? `Guardian${children.data?.length ? ` · ${children.data.length === 1 ? 'one child' : `${children.data.length} children`}` : ''}`
                  : 'Pupil'}
              </p>
            </div>
          </div>

          <dl className="m-0 flex flex-col gap-3 border-t border-line pt-4 text-[13px]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
              <div className="min-w-0">
                <dt className="mb-0.5 text-muted">Name</dt>
                <dd className="m-0 font-medium">{principal?.full_name}</dd>
              </div>
              <span className="text-[11.5px] font-medium text-muted">
                Changed by the school office
              </span>
            </div>
            {isGuardian ? (
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
                <div className="min-w-0">
                  <dt className="mb-0.5 text-muted">Phone number</dt>
                  <dd className="m-0 font-medium">
                    {principal?.phone ? msisdn(principal.phone) : 'On file at the office'}
                  </dd>
                </div>
                <span className="text-[11.5px] font-medium text-muted">
                  Changed by the school office
                </span>
              </div>
            ) : null}
            {isGuardian ? (
              <div>
                <dt className="mb-0.5 text-muted">
                  {children.data?.length === 1 ? 'Child' : 'Children'}
                </dt>
                <dd className="m-0 font-medium">
                  {(children.data ?? []).map((child) => child.full_name).join(', ') || '—'}
                </dd>
              </div>
            ) : null}
          </dl>

          {isGuardian ? (
            <p className="mt-4 mb-0 text-[12.5px] leading-relaxed text-muted">
              Your phone number is how you sign in, so the office changes it rather than you. Ring
              them or come in with your ID, and it changes the same day.
            </p>
          ) : null}
        </Card>

        <Card>
          <CardHeader
            title="Change my password"
            note={`At least ${PASSWORD_MINIMUM} characters. Something you can remember without writing down.`}
          />

          {done ? (
            <div className="mb-4">
              <Notice tone="ok">
                Your password is changed. Other devices you were signed in on will need it again.
              </Notice>
            </div>
          ) : null}

          <div className="flex max-w-md flex-col gap-4">
            <Field label="Current password">
              <TextInput
                type="password"
                autoComplete="current-password"
                value={current}
                onChange={(event) => {
                  setCurrent(event.target.value);
                  setDone(false);
                }}
                className="min-h-12"
              />
            </Field>

            <Field label="New password" hint={hint.text}>
              <TextInput
                type="password"
                autoComplete="new-password"
                value={next}
                onChange={(event) => setNext(event.target.value)}
                className="min-h-12"
              />
            </Field>

            <Field
              label="New password again"
              error={
                confirm.length > 0 && next !== confirm ? 'These two do not match.' : undefined
              }
            >
              <TextInput
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                className="min-h-12"
              />
            </Field>

            {showProblem && problem ? <Notice>{problem}</Notice> : null}
            {change.isError ? <Notice>{change.error.message}</Notice> : null}

            <Button
              variant="primary"
              className="min-h-12"
              disabled={Boolean(problem)}
              busy={change.isPending}
              onClick={() => void submit()}
            >
              Change my password
            </Button>
          </div>
        </Card>

        <Card>
          <CardHeader title="Signing out" />
          <p className="m-0 mb-4 text-[12.5px] leading-relaxed text-muted">
            Sign out if this is a shared phone or a computer at an internet cafe. You will need
            your {isGuardian ? 'phone number' : 'username'} and password to come back.
          </p>
          <Button variant="danger" className="min-h-12" onClick={() => void signOut()}>
            Sign out
          </Button>
        </Card>
      </div>
    </>
  );
}
