/**
 * What a parent sees after it has gone.
 *
 * The reference is the point of this screen. It is what they quote on the
 * phone and what the office searches on, so it is large, selectable, and said
 * before anything else.
 *
 * It also says what happens next, with no date attached. "We will be in
 * touch" is vague enough to be useless; "the school will read it and send you
 * an SMS" is what actually occurs, and promising a day the school has not
 * agreed to would be inventing a commitment on their behalf.
 */

import type { ApplyState } from '@/api/queries/apply';
import { Pill } from '@/components/ui';
import { longDate } from '@/lib/format';

const WHERE_IT_IS: Record<string, { label: string; tone: 'ok' | 'info' | 'warn' | 'neutral' }> =
  {
    submitted: { label: 'With the school', tone: 'info' },
    screened: { label: 'Being reviewed', tone: 'info' },
    offered: { label: 'A place has been offered', tone: 'ok' },
    accepted: { label: 'Place accepted', tone: 'ok' },
    enrolled: { label: 'Enrolled', tone: 'ok' },
    declined: { label: 'Not successful', tone: 'neutral' },
    withdrawn: { label: 'Withdrawn', tone: 'neutral' },
  };

export function Done({ state }: { readonly state: ApplyState }) {
  const application = state.application;
  const where = WHERE_IT_IS[application.state] ?? { label: application.state, tone: 'neutral' };
  const offered = application.state === 'offered';

  return (
    <div className="flex min-h-0 flex-1 flex-col px-5 pt-6 pb-8">
      <div className="mb-5 grid h-14 w-14 place-items-center rounded-full bg-brand-soft">
        <svg width="28" height="28" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path
            d="M4.5 9.4l3 3 6-6.8"
            stroke="#166534"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <h1 className="m-0 mb-2 font-display text-[22px] font-semibold tracking-[-0.02em]">
        Sent to the school
      </h1>
      <p className="m-0 mb-5 text-[13.5px] leading-relaxed text-muted">
        {application.child_first_name
          ? `${application.child_first_name}'s application is with the office.`
          : 'Your application is with the office.'}{' '}
        They will read it and send you an SMS.
      </p>

      <div className="mb-4 rounded-[10px] border border-line p-[14px_15px]">
        <p className="m-0 mb-1 text-xs font-medium text-muted">Your reference</p>
        <p className="m-0 mb-3 font-display text-[21px] font-semibold tracking-[-0.01em] select-all">
          {application.reference}
        </p>
        <Pill tone={where.tone}>{where.label}</Pill>
        {application.submitted_at ? (
          <p className="mt-3 mb-0 text-[12.5px] text-muted">
            Sent {longDate(application.submitted_at)}
          </p>
        ) : null}
      </div>

      {offered ? (
        <div className="rounded-[10px] border border-ok-bg bg-brand-soft p-[14px_15px]">
          <p className="m-0 mb-1 text-[13px] font-semibold text-brand-ink">
            A place has been offered
          </p>
          <p className="m-0 text-[12.5px] leading-relaxed text-ok-ink">
            {state.deposit_billed
              ? `The place is held once the deposit is paid. The school will have sent you the details by SMS.`
              : 'The school has sent you the details by SMS.'}
          </p>
        </div>
      ) : null}

      <p className="mt-auto pt-6 text-center text-[11.5px] leading-relaxed text-muted">
        Keep this reference. You can come back to this page with the same phone number at any
        time to see where it has got to.
      </p>
    </div>
  );
}
