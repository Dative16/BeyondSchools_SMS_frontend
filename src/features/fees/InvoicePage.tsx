/**
 * One bill, as the Invoice artboard draws it: the lines, the three totals, the
 * money against it, and the suspense card beside it.
 *
 * Two things on the artboard are no longer true, and both are the same change.
 * It says "a balance moves only when a signed callback arrives from the
 * aggregator. Nobody can type a payment into this screen" — but Phase 1 has no
 * aggregator, and a bursar typing a receipt is the only way money enters the
 * ledger. So the copy says what is actually the case, and there is a Record a
 * payment button where the artboard assumed there could not be one.
 *
 * The other is the nightly reconciliation card. There is no aggregator
 * statement to reconcile against and no job that runs at five in the morning,
 * so drawing "38 matched, 1 open" would be three invented numbers on the one
 * screen where invented numbers do the most damage. It is left out until there
 * is something to put in it.
 *
 * What does survive from the artboard, and matters most: the balance is never
 * typed. Billed and paid are derived by the database from the lines and the
 * payments, and the only way to change what a child owes is to write a line or
 * record a payment.
 */

import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useInvoice, useSuspense } from '@/api/queries/fees';
import type { InvoiceDetail } from '@/api/queries/fees';
import { ChevronDownIcon } from '@/components/icons';
import { Button, Card, CardHeader, DataTable, ErrorState, Pill } from '@/components/ui';
import type { Column } from '@/components/ui';
import { actionsFor, channelName, invoiceStatusPill } from '@/domain/fees';
import { useAuth } from '@/features/auth/AuthProvider';
import { amount, longDate, msisdn } from '@/lib/format';

import { CreditNoteDialog } from './components/CreditNoteDialog';
import { RecordPaymentDialog } from './components/RecordPaymentDialog';
import { SuspenseCard } from './components/SuspenseCard';
import { VoidDialog } from './components/VoidDialog';

type Line = InvoiceDetail['lines'][number];
type Payment = InvoiceDetail['payments'][number];

const LINE_KINDS: Record<string, string> = {
  charge: '',
  discount: 'Discount',
  credit_note: 'Credit note',
  arrears_brought_forward: 'Brought forward',
};

export default function InvoicePage() {
  const { invoiceId = '' } = useParams();
  const { can } = useAuth();
  const invoice = useInvoice(invoiceId);
  const suspense = useSuspense(can('payment:match_suspense'));
  const [open, setOpen] = useState<'pay' | 'void' | 'credit' | null>(null);

  if (invoice.isError) {
    return (
      <>
        <BackLink />
        <Card>
          <ErrorState
            title="That invoice did not load"
            detail="The link may be old, or this account may not be allowed to see it."
            onRetry={() => void invoice.refetch()}
          />
        </Card>
      </>
    );
  }

  if (invoice.isLoading || !invoice.data) {
    return (
      <>
        <BackLink />
        <div className="h-96 animate-pulse rounded-card bg-line-soft" aria-hidden="true" />
        <span className="sr-only" role="status">
          Loading the invoice
        </span>
      </>
    );
  }

  const bill = invoice.data;
  const billed = Number(bill.billed);
  const settled = Number(bill.settled);
  const balance = Number(bill.balance);
  const status = invoiceStatusPill(bill.is_void ? 'void' : bill.status);
  const actions = actionsFor({ isVoid: bill.is_void, billed, settled });

  const columns: readonly Column<Line>[] = [
    {
      key: 'item',
      header: 'Item',
      cell: (line) => (
        <span className={line.kind === 'charge' ? '' : 'text-ink-dim'}>
          {line.item}
          {LINE_KINDS[line.kind] ? (
            <span className="ml-2 text-xs text-muted">{LINE_KINDS[line.kind]}</span>
          ) : null}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount, TZS',
      align: 'right',
      nowrap: true,
      cell: (line) => (
        <span className={`font-medium ${line.kind === 'charge' ? '' : 'text-ok-ink'}`}>
          {line.kind === 'charge' ? '' : '−'}
          {amount(Math.abs(Number(line.amount)))}
        </span>
      ),
    },
  ];

  return (
    <>
      <BackLink />

      <div className="mb-4.5 flex flex-wrap items-end justify-between gap-3.5">
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-2.5">
            <h1 className="m-0 font-display text-[25px] font-semibold tracking-[-0.02em]">
              {bill.reference}
            </h1>
            <Pill tone={status.tone}>{status.label}</Pill>
          </div>
          <p className="m-0 text-sm text-muted">
            {bill.student_id && bill.student_name ? (
              <Link
                to={`/students/${bill.student_id}`}
                className="font-medium text-ink no-underline hover:text-ok-ink"
              >
                {bill.student_name}
              </Link>
            ) : (
              'No child attached'
            )}
            {bill.class_name ? ` · ${bill.class_name}` : null}
            {bill.term_label ? ` · ${bill.term_label}` : null} · due {longDate(bill.due_date)}
          </p>
        </div>

        {can('invoice:manage') ? (
          <div className="flex flex-wrap gap-2.5">
            <Button size="sm" onClick={() => window.print()}>
              Print
            </Button>
            {actions.canCreditNote ? (
              <Button size="sm" onClick={() => setOpen('credit')}>
                Credit note
              </Button>
            ) : null}
            {actions.canVoid ? (
              <Button size="sm" variant="danger" onClick={() => setOpen('void')}>
                Void
              </Button>
            ) : null}
            {can('payment:record_manual') && actions.canRecordPayment ? (
              <Button size="sm" variant="primary" onClick={() => setOpen('pay')}>
                Record a payment
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {bill.is_void ? (
        <div className="mb-4.5 rounded-card border border-line bg-white p-[14px_18px]">
          <p className="m-0 text-[13px] leading-relaxed text-ink-dim">
            <span className="font-semibold">This bill was voided.</span>{' '}
            {bill.void_reason ?? 'No reason was recorded.'} It stays here, and it counts for
            nothing.
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-4.5">
        <div className="flex min-w-0 flex-[1.5_1_440px] flex-col gap-4.5">
          <Card className="overflow-hidden !p-0">
            <h2 className="m-0 px-5 pt-4 pb-3 font-display text-[15px] font-semibold">
              Invoice lines
            </h2>
            <div className="px-5">
              <DataTable
                columns={columns}
                rows={bill.lines}
                rowKey={(line) => line.id}
                caption={`What ${bill.student_name ?? 'this child'} was charged`}
                captionHidden
                tintHeader
                card={(line) => (
                  <div className="flex items-baseline justify-between gap-3 rounded-[10px] border border-line p-3">
                    <span className="text-[13px]">{line.item}</span>
                    <span className="text-[13px] font-semibold whitespace-nowrap">
                      {line.kind === 'charge' ? '' : '−'}
                      {amount(Math.abs(Number(line.amount)))}
                    </span>
                  </div>
                )}
              />
            </div>
            <div className="mt-3 flex flex-wrap justify-end gap-6.5 border-t border-line bg-canvas px-5 py-3.5">
              <Total label="Billed" value={amount(billed)} />
              <Total label="Paid" value={amount(settled)} />
              <Total
                label="Balance"
                value={amount(balance)}
                tone={balance === 0 ? 'ok' : 'bad'}
              />
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Payments received"
              note="Every entry names who recorded it and when. A balance is never typed: it is worked out from the lines and the payments below."
            />
            <Payments payments={bill.payments} />
          </Card>
        </div>

        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-4.5">
          {can('payment:match_suspense') ? (
            <SuspenseCard
              payments={suspense.data ?? []}
              loading={suspense.isLoading}
              invoiceId={invoiceId}
              invoiceReference={bill.reference}
              balance={balance}
              canMatch={!bill.is_void && balance > 0}
            />
          ) : null}

          <Card>
            <CardHeader title="This bill" />
            <dl className="m-0 flex flex-col gap-2.5 text-[13px]">
              <Fact label="Raised" value={longDate(bill.issued_on)} />
              <Fact label="Due" value={longDate(bill.due_date)} />
              <Fact
                label="Overdue by"
                value={bill.days_overdue > 0 ? `${bill.days_overdue} days` : 'Not overdue'}
              />
              <Fact label="Kind" value={bill.kind === 'term' ? 'Term fees' : 'Deposit'} />
              {bill.academic_year ? (
                <Fact label="Year" value={bill.academic_year} />
              ) : null}
            </dl>
            {bill.note ? (
              <p className="mt-3 mb-0 text-[12.5px] leading-relaxed text-muted">{bill.note}</p>
            ) : null}
          </Card>
        </div>
      </div>

      <RecordPaymentDialog
        invoiceId={invoiceId}
        balance={balance}
        open={open === 'pay'}
        onClose={() => setOpen(null)}
      />
      <VoidDialog
        invoiceId={invoiceId}
        reference={bill.reference}
        open={open === 'void'}
        onClose={() => setOpen(null)}
      />
      <CreditNoteDialog
        invoiceId={invoiceId}
        billed={billed}
        open={open === 'credit'}
        onClose={() => setOpen(null)}
      />
    </>
  );
}

function Payments({ payments }: { readonly payments: readonly Payment[] }) {
  const rows = payments;

  if (rows.length === 0) {
    return (
      <p className="m-0 text-[13px] leading-relaxed text-muted">
        Nothing has been paid against this bill yet.
      </p>
    );
  }

  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0">
      {rows.map((payment, index) => (
        <li
          key={payment.id}
          className={`flex flex-wrap items-start justify-between gap-3 ${
            index < rows.length - 1 ? 'border-b border-line-soft pb-3' : ''
          }`}
        >
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <p className="m-0 text-[13.5px] font-semibold">
                {amount(Number(payment.amount))} TZS
              </p>
              {payment.reversed_at ? (
                <Pill tone="bad">Reversed</Pill>
              ) : payment.is_manual ? (
                <Pill tone="neutral">Entered by hand</Pill>
              ) : (
                <Pill tone="ok">From the aggregator</Pill>
              )}
            </div>
            <p className="m-0 text-[12.5px] text-muted">
              {longDate(payment.received_at)} · {channelName(payment.channel)} · ref{' '}
              {payment.external_ref.replace(/^MANUAL-/, '')}
              {payment.msisdn ? ` · ${msisdn(payment.msisdn)}` : null}
            </p>
          </div>
          <span className="text-[12.5px] whitespace-nowrap text-muted">
            {payment.recorded_by ?? 'Aggregator'}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Total({
  label,
  value,
  tone,
}: {
  readonly label: string;
  readonly value: string;
  readonly tone?: 'ok' | 'bad';
}) {
  return (
    <div className="text-right">
      <p className="m-0 mb-0.5 text-xs font-medium text-muted">{label}</p>
      <p
        className={`m-0 font-display text-lg font-semibold ${
          tone === 'ok' ? 'text-ok-ink' : tone === 'bad' ? 'text-bad-ink' : ''
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Fact({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="m-0 font-medium">{value}</dd>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      to="/fees"
      className="mb-3.5 inline-flex items-center gap-1.5 text-[13px] font-medium text-ok-ink no-underline hover:text-brand-ink"
    >
      <ChevronDownIcon width={14} height={14} className="rotate-90" />
      All invoices
    </Link>
  );
}
