/**
 * One child's statement, as the family reads it.
 *
 * Every bill the child has had and what has been received against each. The
 * only thing a parent asks this system, and until the statement was opened up
 * to `OWN_CHILDREN_READ` it needed the office's permission to answer.
 *
 * No payment button, for the reason the home screen gives: payments are
 * manual, and the honest thing to show is what to write on the slip.
 */

import { Link, useParams } from 'react-router-dom';

import { useChildStatement, useMyChildren } from '@/api/queries/portal';
import { Card, CardHeader, ErrorState, Notice, Pill } from '@/components/ui';
import { invoiceStatusPill } from '@/domain/fees';
import { useAuth } from '@/features/auth/AuthProvider';
import { amount, longDate } from '@/lib/format';

export default function StatementPage() {
  const { studentId } = useParams();
  const { principal } = useAuth();
  const id = studentId ?? principal?.student_id ?? undefined;

  const statement = useChildStatement(id);
  const children = useMyChildren(principal?.role === 'guardian');
  const child = (children.data ?? []).find((each) => each.student_id === id);

  if (statement.isError) {
    return (
      <>
        <Back />
        <ErrorState onRetry={() => void statement.refetch()} />
      </>
    );
  }

  const rows = statement.data?.invoices ?? [];

  return (
    <>
      <Back />

      <div className="mb-5">
        <h1 className="m-0 mb-1 font-display text-[22px] font-semibold tracking-[-0.02em] sm:text-[26px]">
          Statement
        </h1>
        <p className="m-0 text-sm text-muted">
          {child ? `${child.full_name} · ${child.admission_no}` : 'Every bill, and what has been received'}
        </p>
      </div>

      {statement.data ? (
        <Card className="mb-4.5">
          <div className="flex flex-wrap gap-6">
            <Figure label="Billed" value={amount(Number(statement.data.billed))} />
            <Figure label="Received" value={amount(Number(statement.data.settled))} />
            <Figure
              label="Balance"
              value={amount(Number(statement.data.balance))}
              tone={Number(statement.data.balance) > 0 ? 'bad' : 'ok'}
            />
          </div>
        </Card>
      ) : null}

      <Card className="overflow-hidden !p-0">
        <div className="px-4.5 pt-4">
          <CardHeader
            title="Every bill"
            note="Newest first. A receipt appears here once the office has entered it."
          />
        </div>

        {statement.isLoading ? (
          <div className="mx-4.5 mb-4 h-24 animate-pulse rounded bg-line-soft" aria-hidden="true" />
        ) : rows.length === 0 ? (
          <div className="px-4.5 pb-4">
            <Notice tone="info">
              No bill has been raised for this child yet. Nothing is owed.
            </Notice>
          </div>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2.5 px-4.5 pb-4">
            {rows.map((row) => {
              const pill = invoiceStatusPill(
                row.is_void
                  ? 'void'
                  : Number(row.balance) === 0
                    ? 'settled'
                    : Number(row.settled) > 0
                      ? 'part_paid'
                      : 'open',
              );
              return (
                <li key={row.id} className="rounded-[10px] border border-line p-3.5">
                  <div className="mb-1.5 flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="m-0 text-sm font-semibold">
                        {row.term_label ?? row.kind} {row.academic_year ?? ''}
                      </p>
                      <p className="m-0 text-xs text-muted">
                        {row.reference} &middot; issued {longDate(row.issued_on)}
                        {row.due_date ? ` · due ${longDate(row.due_date)}` : null}
                      </p>
                    </div>
                    <Pill tone={pill.tone}>{pill.label}</Pill>
                  </div>
                  <p className="m-0 text-[13px] text-ink-dim">
                    {amount(Number(row.billed))} billed &middot; {amount(Number(row.settled))}{' '}
                    received &middot;{' '}
                    <span
                      className={Number(row.balance) > 0 ? 'font-semibold text-bad-ink' : ''}
                    >
                      {amount(Number(row.balance))} to pay
                    </span>
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <p className="mt-4 mb-0 text-[12.5px] leading-relaxed text-muted">
        Paid something that is not here? Receipts are entered by the office, usually the same day.
        Bring the slip in if a few days have passed &mdash; quote{' '}
        {child?.admission_no ?? 'the admission number'}.
      </p>
    </>
  );
}

function Back() {
  return (
    <p className="mt-0 mb-3">
      <Link
        to="/"
        className="text-[12.5px] font-semibold text-ink-dim no-underline hover:text-ink"
      >
        &larr; Back
      </Link>
    </p>
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
      <p className="m-0 mb-0.5 text-xs font-medium text-muted">{label}</p>
      <p
        className={`m-0 font-display text-[20px] font-semibold ${
          tone === 'bad' ? 'text-bad-ink' : tone === 'ok' ? 'text-ok-ink' : ''
        }`}
      >
        {value} <span className="text-xs font-medium text-muted">TZS</span>
      </p>
    </div>
  );
}
