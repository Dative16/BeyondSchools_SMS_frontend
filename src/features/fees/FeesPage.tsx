/**
 * Fees and payments: the list the nav points at.
 *
 * There is no artboard for this one. It is built to the same shape as the
 * Students page — tiles, tabs in the URL, a table that becomes cards on a
 * phone — because a bursar moving between the two should not have to learn a
 * second set of habits.
 *
 * Four tabs, and the order is the order of a bursar's morning: what is owed,
 * who owes it, money nobody could place, and what the school charges. The term
 * run lives under Invoices, because that is where its result appears.
 */

import { Link, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';

import { useCurrentTerm } from '@/api/queries/school';
import {
  PAGE,
  useArrears,
  useCollection,
  useInvoices,
  useStructures,
  useSuspense,
} from '@/api/queries/fees';
import type { ArrearsRow, InvoiceRow } from '@/api/queries/fees';
import { SearchIcon } from '@/components/icons';
import {
  Button,
  Card,
  CardHeader,
  DataTable,
  EmptyState,
  ErrorState,
  Pill,
  StatTile,
  Unit,
} from '@/components/ui';
import type { Column } from '@/components/ui';
import { channelName, invoiceStatusPill } from '@/domain/fees';
import { useAuth } from '@/features/auth/AuthProvider';
import { amount, compactMoney, longDate, msisdn } from '@/lib/format';

import { StartStructureDialog } from './components/StartStructureDialog';
import { TermRunPanel } from './components/TermRunPanel';

type Tab = 'invoices' | 'arrears' | 'suspense' | 'structures';

export default function FeesPage() {
  const { can } = useAuth();
  const [params, setParams] = useSearchParams();

  const [starting, setStarting] = useState(false);

  const tab = (params.get('tab') as Tab | null) ?? 'invoices';
  const page = Number(params.get('page') ?? 1);
  const q = params.get('q') ?? '';
  const unpaidOnly = params.get('unpaid') === '1';

  const term = useCurrentTerm();
  const collection = useCollection();
  const invoices = useInvoices({ q, unpaidOnly, page });
  const arrears = useArrears(page, tab === 'arrears');
  const suspense = useSuspense(tab === 'suspense' && can('payment:read'));
  const structures = useStructures(tab === 'structures' && can('fee_structure:manage'));

  function set(next: Record<string, string | undefined>) {
    const updated = new URLSearchParams(params);
    for (const [key, value] of Object.entries(next)) {
      if (value) updated.set(key, value);
      else updated.delete(key);
    }
    if (!('page' in next)) updated.delete('page');
    setParams(updated, { replace: true });
  }

  const money = collection.data;

  return (
    <>
      <div className="mb-4.5">
        <h1 className="m-0 mb-1 font-display text-[26px] font-semibold tracking-[-0.02em]">
          Fees and payments
        </h1>
        <p className="m-0 text-sm text-muted">
          {term.label ? `${term.label}. ` : null}
          Every figure here is worked out from the lines and the payments, never typed.
        </p>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Billed"
          value={
            <>
              {compactMoney(Number(money?.billed ?? 0))}
              <Unit> TZS</Unit>
            </>
          }
          loading={collection.isLoading}
          foot="Across every open year"
        />
        <StatTile
          label="Collected"
          value={
            <>
              {compactMoney(Number(money?.settled ?? 0))}
              <Unit> TZS</Unit>
            </>
          }
          loading={collection.isLoading}
          progress={money?.collected_percent ?? 0}
          foot={`${money?.collected_percent ?? 0}% of what was billed`}
        />
        <StatTile
          label="Outstanding"
          value={
            <>
              {compactMoney(Number(money?.outstanding ?? 0))}
              <Unit> TZS</Unit>
            </>
          }
          loading={collection.isLoading}
          foot="Not all of it is overdue"
        />
        <StatTile
          label="Overdue"
          value={
            <>
              {compactMoney(Number(money?.overdue ?? 0))}
              <Unit> TZS</Unit>
            </>
          }
          loading={collection.isLoading}
          footTone={(money?.students_over_60_days ?? 0) > 0 ? 'bad' : 'muted'}
          foot={
            (money?.students_in_arrears ?? 0) === 0
              ? 'Nothing is past its due date'
              : `${money?.students_in_arrears} students, ${money?.students_over_60_days} over 60 days`
          }
        />
      </div>

      <div
        role="group"
        aria-label="Fee views"
        className="mb-4.5 flex flex-wrap gap-1 border-b border-line"
      >
        <TabButton active={tab === 'invoices'} onClick={() => set({ tab: undefined })}>
          Invoices
        </TabButton>
        <TabButton active={tab === 'arrears'} onClick={() => set({ tab: 'arrears' })}>
          Arrears{' '}
          <span className={money?.students_in_arrears ? 'font-semibold text-bad-ink' : 'text-muted'}>
            {money?.students_in_arrears ?? 0}
          </span>
        </TabButton>
        {can('payment:read') ? (
          <TabButton active={tab === 'suspense'} onClick={() => set({ tab: 'suspense' })}>
            Suspense{' '}
            <span className={suspense.data?.length ? 'font-semibold text-bad-ink' : 'text-muted'}>
              {suspense.data?.length ?? 0}
            </span>
          </TabButton>
        ) : null}
        {can('fee_structure:manage') ? (
          <TabButton active={tab === 'structures'} onClick={() => set({ tab: 'structures' })}>
            What we charge
          </TabButton>
        ) : null}
      </div>

      {tab === 'invoices' ? (
        <>
          {can('invoice:manage') && term.term ? (
            <TermRunPanel termId={term.term.id} termLabel={term.label ?? term.term.label} />
          ) : null}

          <div className="mb-4 flex flex-wrap gap-2.5">
            <SearchBox value={q} onChange={(value) => set({ q: value || undefined })} />
            <Button
              size="sm"
              className={unpaidOnly ? '!border-brand-strong !bg-brand-soft' : undefined}
              aria-pressed={unpaidOnly}
              onClick={() => set({ unpaid: unpaidOnly ? undefined : '1' })}
            >
              Unpaid only
            </Button>
          </div>

          <Card className="overflow-hidden !p-0">
            <div className="px-4.5 pt-3.5">
              {invoices.isError ? (
                <ErrorState onRetry={() => void invoices.refetch()} />
              ) : (
                <DataTable
                  columns={invoiceColumns}
                  rows={invoices.data?.items ?? []}
                  rowKey={(row) => row.id}
                  caption="Every bill raised, newest first"
                  tintHeader
                  loading={invoices.isLoading}
                  empty={
                    <EmptyState
                      title="No invoices match that"
                      note={
                        q || unpaidOnly
                          ? 'Try a wider search, or clear the filters.'
                          : 'Nothing has been billed yet. Run the term to raise this term’s invoices.'
                      }
                    />
                  }
                  card={(row) => <InvoiceCard row={row} />}
                />
              )}
            </div>
            <Pager
              total={invoices.data?.total ?? 0}
              page={page}
              onPage={(next) => set({ page: String(next) })}
            />
          </Card>
        </>
      ) : null}

      {tab === 'arrears' ? (
        <Card className="overflow-hidden !p-0">
          <div className="px-4.5 pt-3.5">
            <DataTable
              columns={arrearsColumns}
              rows={arrears.data?.items ?? []}
              rowKey={(row) => row.student_id}
              caption="One row per child, worst first — a bursar rings a family, not a document"
              tintHeader
              loading={arrears.isLoading}
              empty={
                <EmptyState
                  title="Nothing is overdue"
                  note="Every bill that has fallen due has been settled."
                />
              }
              card={(row) => <ArrearsCard row={row} />}
            />
          </div>
          <Pager
            total={arrears.data?.total ?? 0}
            page={page}
            onPage={(next) => set({ page: String(next) })}
          />
        </Card>
      ) : null}

      {tab === 'suspense' ? (
        <Card>
          <CardHeader
            title="Money nobody could place"
            note="It sits here until a bursar says which bill it belongs to. Nothing guesses between two siblings with open balances."
          />
          {suspense.isLoading ? (
            <div className="h-24 animate-pulse rounded bg-line-soft" aria-hidden="true" />
          ) : (suspense.data?.length ?? 0) === 0 ? (
            <EmptyState
              title="Suspense is clear"
              note="Every payment that has arrived is against a bill."
            />
          ) : (
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {(suspense.data ?? []).map((payment) => (
                <li key={payment.id} className="rounded-[10px] border border-line p-3.5">
                  <p className="m-0 mb-1 font-display text-lg font-semibold">
                    {amount(Number(payment.amount))} <span className="text-xs text-muted">TZS</span>
                  </p>
                  <p className="m-0 text-[12.5px] text-ink-dim">
                    {longDate(payment.received_at)} · {channelName(payment.channel)}
                    {payment.msisdn ? ` · from ${msisdn(payment.msisdn)}` : null}
                  </p>
                  {payment.reason ? (
                    <p className="mt-1.5 mb-0 text-[12.5px] text-warn-ink">{payment.reason}</p>
                  ) : null}
                  <p className="mt-2 mb-0 text-[12.5px] text-muted">
                    Open the bill it belongs to and match it there, so the entry records which
                    invoice you chose.
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}

      <StartStructureDialog open={starting} onClose={() => setStarting(false)} />

      {tab === 'structures' ? (
        <Card className="overflow-hidden !p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4.5 pt-4">
            <p className="m-0 text-[12.5px] text-muted">
              A level with no published structure cannot be invoiced at all.
            </p>
            <Button variant="primary" size="sm" onClick={() => setStarting(true)}>
              Start a structure
            </Button>
          </div>
          <div className="px-4.5 pt-3.5">
            <DataTable
              columns={structureColumns}
              rows={structures.data ?? []}
              rowKey={(row) => row.id}
              caption="What each class is charged. A published structure cannot be edited."
              tintHeader
              loading={structures.isLoading}
              empty={
                <EmptyState
                  title="Nothing is set up yet"
                  note="Until a level has a published structure, the term run cannot bill it."
                />
              }
              card={(row) => (
                <Link
                  to={`/fees/structures/${row.id}`}
                  className="block rounded-[10px] border border-line p-3 no-underline"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="m-0 text-sm font-semibold text-ink">{row.level_name}</p>
                    <Pill tone={row.status === 'published' ? 'ok' : 'warn'}>
                      {row.status === 'published' ? 'Published' : 'Draft'}
                    </Pill>
                  </div>
                  <p className="mt-1 mb-0 text-xs text-muted">
                    {row.item_count} items · {amount(Number(row.total_amount))} TZS ·{' '}
                    {row.enrolled_count} {row.enrolled_count === 1 ? 'pupil' : 'pupils'}
                  </p>
                </Link>
              )}
            />
          </div>
        </Card>
      ) : null}
    </>
  );
}

const invoiceColumns: readonly Column<InvoiceRow>[] = [
  {
    key: 'reference',
    header: 'Reference',
    nowrap: true,
    cell: (row) => (
      <Link
        to={`/fees/${row.id}`}
        className="text-[12.5px] font-semibold text-ink no-underline hover:text-ok-ink"
      >
        {row.reference}
      </Link>
    ),
  },
  {
    key: 'student',
    header: 'Student',
    nowrap: true,
    cell: (row) => <span className="font-medium">{row.student_name ?? '—'}</span>,
  },
  {
    key: 'class',
    header: 'Class',
    nowrap: true,
    cell: (row) => <span className="text-ink-dim">{row.class_name ?? '—'}</span>,
  },
  {
    key: 'billed',
    header: 'Billed',
    align: 'right',
    nowrap: true,
    cell: (row) => amount(Number(row.billed)),
  },
  {
    key: 'balance',
    header: 'Balance',
    align: 'right',
    nowrap: true,
    cell: (row) => (
      <span className={Number(row.balance) > 0 ? 'font-semibold text-bad-ink' : ''}>
        {amount(Number(row.balance))}
      </span>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    nowrap: true,
    cell: (row) => {
      const pill = invoiceStatusPill(row.status);
      return <Pill tone={pill.tone}>{pill.label}</Pill>;
    },
  },
];

const arrearsColumns: readonly Column<ArrearsRow>[] = [
  {
    key: 'student',
    header: 'Student',
    nowrap: true,
    cell: (row) => (
      <Link
        to={`/students/${row.student_id}`}
        className="text-[13.5px] font-semibold text-ink no-underline hover:text-ok-ink"
      >
        {row.student_name}
      </Link>
    ),
  },
  {
    key: 'class',
    header: 'Class',
    nowrap: true,
    cell: (row) => <span className="text-ink-dim">{row.class_name ?? '—'}</span>,
  },
  {
    key: 'guardian',
    header: 'Who to ring',
    nowrap: true,
    cell: (row) =>
      row.guardian_phone ? (
        <a href={`tel:${row.guardian_phone}`} className="text-ink-dim no-underline">
          {row.guardian_name ?? 'Guardian'} · {msisdn(row.guardian_phone)}
        </a>
      ) : (
        <span className="text-warn-ink">No number on file</span>
      ),
  },
  {
    key: 'balance',
    header: 'Owed',
    align: 'right',
    nowrap: true,
    cell: (row) => <span className="font-semibold">{amount(Number(row.balance))}</span>,
  },
  {
    key: 'bucket',
    header: 'How long',
    nowrap: true,
    cell: (row) => (
      <Pill tone={row.bucket === 'over-60' ? 'bad' : row.bucket === '31-60' ? 'warn' : 'neutral'}>
        {row.bucket === 'over-60' ? 'Over 60 days' : `${row.bucket} days`}
      </Pill>
    ),
  },
];

const structureColumns: readonly Column<{
  id: string;
  level_name: string;
  label: string;
  status: string;
  item_count: number;
  total_amount: string;
  enrolled_count: number;
}>[] = [
  {
    key: 'level',
    header: 'Class',
    nowrap: true,
    cell: (row) => (
      <Link
        to={`/fees/structures/${row.id}`}
        className="text-[13.5px] font-semibold text-ink no-underline hover:text-ok-ink"
      >
        {row.level_name}
      </Link>
    ),
  },
  { key: 'label', header: 'Structure', cell: (row) => row.label },
  {
    key: 'pupils',
    header: 'Pupils',
    align: 'right',
    nowrap: true,
    // Who a price would actually be charged to. A structure published against
    // a level nobody is in is harmless; one published against the wrong level
    // bills the wrong children, and this is the column where that shows.
    cell: (row) => <span className="text-ink-dim">{row.enrolled_count}</span>,
  },
  {
    key: 'items',
    header: 'Items',
    align: 'right',
    nowrap: true,
    cell: (row) => row.item_count,
  },
  {
    key: 'total',
    header: 'Per term, TZS',
    align: 'right',
    nowrap: true,
    cell: (row) => amount(Number(row.total_amount)),
  },
  {
    key: 'status',
    header: 'Status',
    nowrap: true,
    cell: (row) => (
      <Pill tone={row.status === 'published' ? 'ok' : 'warn'}>
        {row.status === 'published' ? 'Published' : 'Draft'}
      </Pill>
    ),
  },
];

function InvoiceCard({ row }: { readonly row: InvoiceRow }) {
  const pill = invoiceStatusPill(row.status);
  return (
    <Link
      to={`/fees/${row.id}`}
      className="block rounded-[10px] border border-line p-3 no-underline"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="m-0 truncate text-sm font-semibold text-ink">
            {row.student_name ?? row.reference}
          </p>
          <p className="mt-0.5 mb-0 text-xs text-muted">
            {row.reference} · {row.class_name ?? 'No class'}
          </p>
        </div>
        <Pill tone={pill.tone}>{pill.label}</Pill>
      </div>
      <p className="mt-1.5 mb-0 text-xs text-ink-dim">
        {amount(Number(row.billed))} billed ·{' '}
        <span className={Number(row.balance) > 0 ? 'font-semibold text-bad-ink' : ''}>
          {amount(Number(row.balance))} owed
        </span>
      </p>
    </Link>
  );
}

function ArrearsCard({ row }: { readonly row: ArrearsRow }) {
  return (
    <div className="rounded-[10px] border border-line p-3">
      <div className="flex items-start justify-between gap-3">
        <Link
          to={`/students/${row.student_id}`}
          className="text-sm font-semibold text-ink no-underline"
        >
          {row.student_name}
        </Link>
        <span className="text-sm font-semibold whitespace-nowrap">
          {amount(Number(row.balance))}
        </span>
      </div>
      <p className="mt-1 mb-0 text-xs text-muted">
        {row.class_name ?? 'No class'} · {row.days_overdue} days overdue
      </p>
      {row.guardian_phone ? (
        <a
          href={`tel:${row.guardian_phone}`}
          className="mt-1.5 inline-block text-xs font-semibold text-ok-ink no-underline"
        >
          Ring {row.guardian_name ?? 'the guardian'} · {msisdn(row.guardian_phone)}
        </a>
      ) : null}
    </div>
  );
}

function Pager({
  total,
  page,
  onPage,
}: {
  readonly total: number;
  readonly page: number;
  readonly onPage: (page: number) => void;
}) {
  if (total <= PAGE) return null;
  const from = (page - 1) * PAGE + 1;
  const to = Math.min(page * PAGE, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-canvas px-4.5 py-3">
      <p className="m-0 text-[12.5px] text-muted" aria-live="polite">
        Showing {from}&ndash;{to} of {total}
      </p>
      <div className="flex gap-2">
        <Button size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <Button size="sm" disabled={to >= total} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  readonly active: boolean;
  readonly onClick: () => void;
  readonly children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`-mb-px min-h-11 border-b-2 px-3.5 text-sm ${
        active
          ? 'border-brand-strong font-semibold text-brand-ink'
          : 'border-transparent font-medium text-ink-dim hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}

function SearchBox({
  value,
  onChange,
}: {
  readonly value: string;
  readonly onChange: (value: string) => void;
}) {
  const [typed, setTyped] = useState(value);

  useEffect(() => setTyped(value), [value]);

  useEffect(() => {
    if (typed === value) return;
    const id = window.setTimeout(() => onChange(typed), 300);
    return () => window.clearTimeout(id);
  }, [typed, value, onChange]);

  return (
    <div className="relative min-w-0 flex-[1_1_260px]">
      <label htmlFor="invoice-search" className="sr-only">
        Search invoices
      </label>
      <SearchIcon
        width={16}
        height={16}
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint"
      />
      <input
        id="invoice-search"
        type="search"
        value={typed}
        onChange={(event) => setTyped(event.target.value)}
        placeholder="Search a reference, name or admission number"
        className="min-h-11 w-full rounded-control border border-line bg-white pr-3 pl-9 text-sm"
      />
    </div>
  );
}
