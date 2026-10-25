/**
 * The public application form.
 *
 * Four steps and about four minutes, drawn to the Apply artboard. It shares no
 * chrome with the staff app — no sidebar, no top bar — because the person
 * using it has no account and is on a phone, and every kilobyte of layout they
 * do not need is a second of a 3G connection they wait for.
 *
 * The three properties that make it survivable on a bad connection:
 *
 * Progress is saved on the server, against the verified phone number, every
 * time a step is left. A flat battery, a closed browser or a dropped
 * connection costs nothing, and the parent comes back with the same code.
 *
 * The step lives in the URL, so the phone's own back button works and does
 * not leave the form.
 *
 * Nothing is required until the end. A parent who abandons it half-filled has
 * still told the school their child exists and left a number to ring.
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import { applyKeys, useApplyOptions, useMyApplication, tryResume } from '@/api/queries/apply';
import { Notice } from '@/components/ui';
import { STEPS, stepIndex, timeLeft } from '@/domain/apply';
import type { StepId } from '@/domain/apply';

import { ChildStep } from './steps/ChildStep';
import { Done } from './steps/Done';
import { GuardianStep } from './steps/GuardianStep';
import { PhoneStep } from './steps/PhoneStep';
import { ReviewStep } from './steps/ReviewStep';

export default function ApplyPage() {
  const [params, setParams] = useSearchParams();
  const client = useQueryClient();
  const [verified, setVerified] = useState(false);
  const [phone, setPhone] = useState('');

  const options = useApplyOptions();
  const application = useMyApplication(verified);

  const asked = params.get('step') as StepId | null;
  const step: StepId = verified ? (asked && asked !== 'phone' ? asked : 'child') : 'phone';

  const go = (next: StepId) => {
    const updated = new URLSearchParams(params);
    updated.set('step', next);
    setParams(updated);
  };

  // Resume: the refresh cookie from a previous visit buys a session back, so a
  // parent who closed the browser on a bus does not start again. Failing is
  // the ordinary case for a first visit and is not surfaced.
  useEffect(() => {
    let cancelled = false;
    void tryResume().then((state) => {
      if (cancelled || !state) return;
      client.setQueryData(applyKeys.me, state);
      setVerified(true);
    });
    return () => {
      cancelled = true;
    };
  }, [client]);

  const submitted =
    application.data !== undefined && application.data.application.state !== 'started';

  if (options.isError) {
    return (
      <Shell>
        <div className="p-5">
          <Notice>
            This school is not taking applications through this link. Check the address, or
            ring the school office.
          </Notice>
        </div>
      </Shell>
    );
  }

  return (
    <Shell
      schoolName={options.data?.school_name}
      intake={options.data?.academic_year}
      step={verified && application.data && submitted ? null : step}
    >
      {submitted && application.data ? (
        <Done state={application.data} />
      ) : !verified ? (
        <PhoneStep
          phone={phone}
          onPhone={setPhone}
          onVerified={() => {
            setVerified(true);
            go('child');
          }}
        />
      ) : !application.data ? (
        <div className="p-5 text-sm text-muted" role="status">
          Opening your form&hellip;
        </div>
      ) : step === 'child' ? (
        <ChildStep
          state={application.data}
          options={options.data}
          onNext={() => go('guardian')}
        />
      ) : step === 'guardian' ? (
        <GuardianStep
          state={application.data}
          phone={phone}
          onBack={() => go('child')}
          onNext={() => go('review')}
        />
      ) : (
        <ReviewStep state={application.data} onBack={(to) => go(to)} />
      )}
    </Shell>
  );
}

/**
 * The frame: a fixed header, a scrolling middle and a footer that stays put.
 *
 * The footer holds the one button that moves the form on, and it is pinned so
 * a parent part-way down a long field list can always see it. On a phone a
 * "Continue" button below the fold is a form that looks finished when it is
 * not.
 */
function Shell({
  schoolName,
  intake,
  step,
  children,
}: {
  readonly schoolName?: string;
  readonly intake?: string | null;
  readonly step?: StepId | null;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col bg-white">
      <header className="flex-none border-b border-line px-5 pt-4.5 pb-3.5">
        <div className="mb-2.5 flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-[3px] bg-brand" aria-hidden="true" />
          <span className="font-display text-[15px] font-bold tracking-[-0.01em]">
            BeyondSchools
          </span>
        </div>
        <p className="m-0 text-[13px] font-medium text-ink-dim">
          {schoolName ?? 'Loading…'}
          {intake ? ` · ${intake} intake` : null}
        </p>
      </header>

      {step ? <Progress step={step} /> : null}

      {children}
    </div>
  );
}

function Progress({ step }: { readonly step: StepId }) {
  const index = stepIndex(step);
  const remaining = timeLeft(step);
  const current = STEPS[index];

  return (
    <div className="flex-none px-5 pt-3.5 pb-3">
      <div className="mb-2 flex items-center justify-between gap-2.5">
        <p className="m-0 text-xs font-semibold text-ink-dim">
          Step {index + 1} of {STEPS.length} · {current?.label}
        </p>
        {remaining ? <p className="m-0 text-xs text-muted">{remaining}</p> : null}
      </div>
      <div
        className="flex gap-[5px]"
        role="progressbar"
        aria-valuenow={index + 1}
        aria-valuemin={1}
        aria-valuemax={STEPS.length}
        aria-label={`Step ${index + 1} of ${STEPS.length}`}
      >
        {STEPS.map((bar, position) => (
          <span
            key={bar.id}
            className={`h-[5px] flex-1 rounded-[3px] ${
              position <= index ? 'bg-brand' : 'bg-line'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
