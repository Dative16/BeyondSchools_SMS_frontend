/**
 * Parent home. Built to `ParentHome.dc.html` and `ParentHomePhone.dc.html`.
 *
 * The screen a guardian lands on, and until now they landed on the staff
 * dashboard and saw almost nothing.
 *
 * **There is no payment button, and that is the design.** Payments are manual
 * in Phase 1: no aggregator, no callback. A family pays at the office or into
 * the school's account, keeps the receipt, and the bursar records it against
 * the child — so the most useful thing this screen can do is say exactly where
 * to pay and what reference to write, because a payment without the admission
 * number on the slip sits unmatched for days.
 *
 * The artboard also shows a notices feed from the school. There is no notices
 * table — Communications is a later phase — so rather than invent one this
 * shows the term and fee facts it can actually stand behind, and says where
 * the rest will come from.
 */

import { Link } from 'react-router-dom';

import { useSchool, useCurrentTerm } from '@/api/queries/school';
import { useMyChildren } from '@/api/queries/portal';
import type { Child } from '@/api/queries/portal';
import { Card, CardHeader, ErrorState, Notice, Pill } from '@/components/ui';
import type { Tone } from '@/components/ui';
import {
  STANDING_LABELS,
  canBankTransfer,
  greet,
  initials,
  owedAcross,
  standing,
  standingNote,
} from '@/domain/portal';
import type { FeeStanding } from '@/domain/portal';
import { useAuth } from '@/features/auth/AuthProvider';
import { amount, longDate } from '@/lib/format';

const TONES: Record<FeeStanding, Tone> = {
  'nothing-billed': 'neutral',
  settled: 'ok',
  'part-paid': 'warn',
  owing: 'bad',
  'in-credit': 'info',
};

const money = (value: number) => `${amount(value)} TZS`;

export default function ParentHomePage() {
  const { principal } = useAuth();
  const school = useSchool();
  const term = useCurrentTerm();
  const children = useMyChildren();

  const rows = children.data ?? [];
  const owed = owedAcross(
    rows.map((child) => ({
      billed: Number(child.billed),
      settled: Number(child.settled),
      balance: Number(child.balance),
    })),
  );

  if (children.isError) {
    return <ErrorState onRetry={() => void children.refetch()} />;
  }

  return (
    <>
      <div className="mb-5">
        <h1 className="m-0 mb-1 font-display text-[22px] font-semibold tracking-[-0.02em] sm:text-[26px]">
          {greet(principal?.full_name)}
        </h1>
        <p className="m-0 text-sm text-muted">
          {children.isLoading
            ? 'Loading your children…'
            : rows.length === 0
              ? 'No children are linked to this account yet.'
              : `${rows.length === 1 ? 'One child' : `${rows.length} children`} at ${school.data?.name ?? 'this school'}`}
        </p>
      </div>

      {rows.length === 0 && !children.isLoading ? (
        <Notice tone="info">
          If your child is at this school, the office needs to link them to this phone number.
          Ring them or come in with your ID — it is done the same day.
        </Notice>
      ) : null}

      {rows.length > 0 ? (
        <Card className="mb-4.5">
          <p className="m-0 mb-1 text-[12.5px] font-medium text-muted">
            Owing in total{term.term ? `, ${term.term.label}` : null}
          </p>
          <p className="m-0 mb-1 font-display text-[30px] font-semibold tracking-[-0.02em]">
            {amount(owed)} <span className="text-base font-medium text-muted">TZS</span>
          </p>
          <p className={`m-0 text-[13px] ${owed > 0 ? 'text-bad-ink' : 'text-ok-ink'}`}>
            {owed > 0
              ? `Across ${rows.filter((child) => Number(child.balance) > 0).length} of your ${rows.length === 1 ? 'child' : 'children'}.`
              : 'Nothing outstanding. Every receipt has been recorded.'}
          </p>
        </Card>
      ) : null}

      <h2 className="mt-0 mb-3.5 font-display text-[17px] font-semibold">My children</h2>

      <div className="mb-4.5 grid grid-cols-1 gap-4.5 lg:grid-cols-2">
        {rows.map((child) => (
          <ChildCard key={child.student_id} child={child} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4.5 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader title="How to pay" />
          <p className="m-0 mb-4 text-[12.5px] leading-relaxed text-muted">
            There is no payment button in this portal. Pay at the school office or into the school
            account, keep the receipt, and the bursar records it against your child. Your balance
            here changes once that entry is made, usually the same day.
          </p>

          {canBankTransfer({
            bankName: school.data?.bank_name ?? null,
            accountName: school.data?.bank_account_name ?? null,
            accountNumber: school.data?.bank_account_number ?? null,
            reference: '',
          }) ? (
            <div className="rounded-[10px] border border-line p-3.5">
              <p className="m-0 mb-2.5 text-[13px] font-semibold">School bank account</p>
              <dl className="m-0 flex flex-col gap-1.5 text-[13px]">
                <Row label="Bank" value={school.data?.bank_name ?? '—'} />
                <Row
                  label="Account name"
                  value={school.data?.bank_account_name ?? school.data?.name ?? '—'}
                />
                <Row label="Account number" value={school.data?.bank_account_number ?? '—'} />
                <Row
                  label="Reference to write"
                  value={rows.map((child) => child.admission_no).join(' / ') || '—'}
                />
              </dl>
              <p className="mt-3 mb-0 text-xs leading-relaxed text-muted">
                Writing the admission number on the slip is what lets the office find the right
                child. Without it a payment can sit unmatched for days.
              </p>
            </div>
          ) : (
            <Notice tone="info">
              Pay at the school office. The school has not published bank details here yet — ask
              at the counter, and quote{' '}
              {rows.map((child) => child.admission_no).join(' or ') || 'your admission number'}.
            </Notice>
          )}
        </Card>

        <Card>
          <CardHeader
            title="From the school"
            note="Fee reminders also arrive by SMS to the number you sign in with."
          />
          <ul className="m-0 flex list-none flex-col gap-3 p-0 text-[12.5px]">
            {term.term ? (
              <li className="border-b border-line pb-3">
                <p className="m-0 mb-0.5 text-[13px] font-semibold">
                  {term.term.label} runs to {longDate(term.term.ends_on)}
                </p>
                <p className="m-0 leading-relaxed text-ink-dim">
                  Started {longDate(term.term.starts_on)}.
                </p>
              </li>
            ) : null}
            <li className="border-b border-line pb-3">
              <p className="m-0 mb-0.5 text-[13px] font-semibold">Reports</p>
              <p className="m-0 leading-relaxed text-ink-dim">
                Published at the end of term. Nothing to read yet.
              </p>
            </li>
            <li>
              <p className="m-0 mb-0.5 text-[13px] font-semibold">Something wrong on a record?</p>
              <p className="m-0 leading-relaxed text-ink-dim">
                Tell the school office. Nothing here can be changed from this account, which is
                what keeps a pupil record trustworthy.
              </p>
            </li>
          </ul>
        </Card>
      </div>
    </>
  );
}

function ChildCard({ child }: { readonly child: Child }) {
  const fees = {
    billed: Number(child.billed),
    settled: Number(child.settled),
    balance: Number(child.balance),
  };
  const state = standing(fees);

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-start gap-3.5">
        <span
          aria-hidden="true"
          className="grid h-13 w-13 flex-none place-items-center rounded-[12px] border border-ok-bg bg-brand-soft font-display text-[17px] font-semibold text-brand-ink"
        >
          {initials(child.full_name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="m-0 mb-1 font-display text-[17px] font-semibold">{child.full_name}</p>
          <p className="m-0 text-[13px] text-muted">
            {child.class_name ?? 'Not in a class yet'} &middot; {child.admission_no}
          </p>
        </div>
      </div>

      <dl className="m-0 mb-3.5 flex flex-wrap gap-4.5 border-y border-line py-3.5">
        <Figure label="Billed" value={amount(fees.billed)} />
        <Figure label="Paid" value={amount(fees.settled)} />
        <Figure
          label="Balance"
          value={amount(fees.balance)}
          tone={fees.balance > 0 ? 'bad' : 'ok'}
        />
      </dl>

      <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
        <Pill tone={TONES[state]}>{STANDING_LABELS[state]}</Pill>
        <p className="m-0 min-w-0 text-[12.5px] text-muted">{standingNote(fees, money)}</p>
      </div>

      <div className="flex flex-wrap gap-2.5">
        <Link
          to={`/children/${child.student_id}/statement`}
          className="inline-flex min-h-11 items-center rounded-control border border-line bg-white px-3.5 text-[13.5px] font-medium text-ink no-underline"
        >
          Statement
        </Link>
        <Link
          to={`/children/${child.student_id}`}
          className="inline-flex min-h-11 items-center rounded-control border border-line bg-white px-3.5 text-[13.5px] font-medium text-ink no-underline"
        >
          School page
        </Link>
      </div>
    </Card>
  );
}

function Figure({
  label,
  value,
  tone,
}: {
  readonly label: string;
  readonly value: string;
  readonly tone?: 'ok' | 'bad';
}) {
  return (
    <div>
      <dt className="mb-0.5 text-xs font-medium text-muted">{label}</dt>
      <dd
        className={`m-0 font-display text-[18px] font-semibold ${
          tone === 'bad' ? 'text-bad-ink' : tone === 'ok' ? 'text-ok-ink' : ''
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function Row({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="m-0 text-right font-medium">{value}</dd>
    </div>
  );
}
