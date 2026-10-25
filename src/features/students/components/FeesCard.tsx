/**
 * What this family owes, and for which bill.
 *
 * The three figures are the most recent live invoice, not a lifetime total,
 * because that is the number a parent is about to ask about on the phone. The
 * lifetime balance is said underneath only when it differs — a child who
 * settled this term but still owes from last year is exactly the case a
 * single figure would hide.
 *
 * A voided invoice is shown as voided rather than skipped. It is a bill the
 * family may have already seen, and "that invoice was cancelled" is an answer;
 * silence is not.
 */

import { Link } from 'react-router-dom';

import type { Statement } from '@/api/queries/student';
import { Card, CardHeader, ErrorState } from '@/components/ui';
import { amount } from '@/lib/format';

export function FeesCard({
  statement,
  loading,
  failed,
}: {
  readonly statement: Statement | undefined;
  readonly loading: boolean;
  readonly failed: boolean;
}) {
  if (failed) {
    return (
      <Card>
        <CardHeader title="Fees" />
        <ErrorState detail="The statement did not load. Nothing was changed." />
      </Card>
    );
  }

  if (loading || !statement) {
    return (
      <Card>
        <CardHeader title="Fees" />
        <div className="h-20 animate-pulse rounded bg-line-soft" aria-hidden="true" />
      </Card>
    );
  }

  const live = statement.invoices.filter((invoice) => !invoice.is_void);
  const latest = live.at(-1);

  if (!latest) {
    return (
      <Card>
        <CardHeader title="Fees" />
        <p className="m-0 text-[13px] leading-relaxed text-muted">
          This child has not been billed. If their class has a published fee structure, the
          term run has not reached them.
        </p>
      </Card>
    );
  }

  const lifetime = Number(statement.balance);
  const thisBill = Number(latest.balance);

  return (
    <Card>
      <CardHeader
        title={`Fees, ${latest.term_label ?? latest.kind}${
          latest.academic_year ? ` ${latest.academic_year}` : ''
        }`}
        action={{ label: 'Open invoice', to: `/fees/${latest.id}` }}
      />

      <div className="mb-3 flex flex-wrap gap-5">
        <Figure label="Billed" value={amount(Number(latest.billed))} />
        <Figure label="Paid" value={amount(Number(latest.settled))} />
        <Figure
          label="Balance"
          value={amount(thisBill)}
          tone={thisBill === 0 ? 'ok' : 'bad'}
        />
      </div>

      <p className="m-0 text-[12.5px] leading-relaxed text-muted">
        {lifetime === thisBill
          ? live.length === 1
            ? 'This is the only bill on record.'
            : `${live.length} bills on record, and nothing is owed on the others.`
          : `Across every year, this family owes ${amount(lifetime)}.`}
      </p>

      {statement.invoices.some((invoice) => invoice.is_void) ? (
        <p className="mt-1.5 mb-0 text-[12.5px] text-muted">
          One or more earlier bills were voided.{' '}
          <Link to={`/fees?student=${statement.student_id}`} className="font-semibold text-ok-ink no-underline">
            See the full statement
          </Link>
        </p>
      ) : null}
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
      <p className="m-0 mb-1 text-xs font-medium text-muted">{label}</p>
      <p
        className={`m-0 font-display text-[19px] font-semibold ${
          tone === 'ok' ? 'text-ok-ink' : tone === 'bad' ? 'text-bad-ink' : ''
        }`}
      >
        {value}
      </p>
    </div>
  );
}
