/**
 * Students: the roll, and the applications waiting on a registrar.
 *
 * Two tabs, as the artboard draws them, and the tab lives in the URL rather
 * than in component state. A registrar working the review queue who opens an
 * application in a new tab and comes back must land on the queue, not on the
 * roll — and "send me the link" has to work.
 *
 * Filters live in the URL for the same reason. The search box, the class and
 * the fee status are all query parameters, so the back button undoes a filter
 * instead of leaving the page.
 */

import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { useRoll, useClassGroups, useReviewQueue } from '@/api/queries/students';
import type { FeeStatus, RollRow } from '@/api/queries/students';
import { PAGE } from '@/api/queries/students';
import { SearchIcon } from '@/components/icons';
import {
  Button,
  ButtonLink,
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  Pill,
} from '@/components/ui';
import type { Column } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { feePillFrom, fullName } from '@/domain/roll';

import { QueueCard } from './components/QueueCard';

type Tab = 'roll' | 'queue';

export default function StudentsPage() {
  const { can } = useAuth();
  const [params, setParams] = useSearchParams();

  const tab: Tab = params.get('tab') === 'queue' ? 'queue' : 'roll';
  const classGroupId = params.get('class') ?? undefined;
  const feeStatus = (params.get('fees') as FeeStatus | null) ?? undefined;
  const page = Number(params.get('page') ?? 1);
  const q = params.get('q') ?? '';

  const classes = useClassGroups();
  const roll = useRoll({ q, classGroupId, feeStatus, page });
  const queue = useReviewQueue(can('admission:review'));

  function set(next: Record<string, string | undefined>) {
    const updated = new URLSearchParams(params);
    for (const [key, value] of Object.entries(next)) {
      if (value) updated.set(key, value);
      else updated.delete(key);
    }
    // Any change of filter starts again at page one; staying on page 12 of a
    // search that now returns four results shows an empty table.
    if (!('page' in next)) updated.delete('page');
    setParams(updated, { replace: true });
  }

  const columns: readonly Column<RollRow>[] = [
    {
      key: 'adm',
      header: 'Adm. no',
      nowrap: true,
      cell: (row) => (
        <span className="text-[12.5px] font-medium text-muted">{row.admission_no}</span>
      ),
    },
    {
      key: 'student',
      header: 'Student',
      nowrap: true,
      cell: (row) => (
        <Link
          to={`/students/${row.student_id}`}
          className="text-[13.5px] font-semibold text-ink no-underline hover:text-ok-ink"
        >
          {fullName(row.first_name, row.middle_name, row.surname)}
        </Link>
      ),
    },
    {
      key: 'class',
      header: 'Class',
      nowrap: true,
      cell: (row) => <span className="text-ink-dim">{row.class_name ?? 'Not enrolled'}</span>,
    },
    {
      key: 'guardian',
      header: 'Primary guardian',
      nowrap: true,
      cell: (row) => (
        <span className="text-ink-dim">{row.primary_guardian ?? 'None recorded'}</span>
      ),
    },
    {
      key: 'fees',
      header: 'Fees',
      nowrap: true,
      cell: (row) => <FeeCell row={row} overdue={feeStatus === 'in_arrears'} />,
    },
    {
      key: 'ai',
      header: 'AI platform',
      nowrap: true,
      cell: (row) => (
        <span className="text-[12.5px] text-ink-dim">
          {row.on_ai_platform ? 'Signed in' : 'Not signed in yet'}
        </span>
      ),
    },
  ];

  const total = roll.data?.total ?? 0;
  const from = total === 0 ? 0 : (page - 1) * PAGE + 1;
  const to = Math.min(page * PAGE, total);

  return (
    <>
      <div className="mb-4.5 flex flex-wrap items-end justify-between gap-3.5">
        <div>
          <h1 className="m-0 mb-1 font-display text-[26px] font-semibold tracking-[-0.02em]">
            Students
          </h1>
          <p className="m-0 text-sm text-muted">
            {roll.isLoading ? 'Loading the roll…' : `${total} on the roll`}
          </p>
        </div>
        {can('student:manage') ? (
          <ButtonLink to="/students/new" variant="primary">
            Enrol a student
          </ButtonLink>
        ) : null}
      </div>

      <div
        role="group"
        aria-label="Student views"
        className="mb-4.5 flex flex-wrap gap-1 border-b border-line"
      >
        <TabButton active={tab === 'roll'} onClick={() => set({ tab: undefined })}>
          Class roll <Count>{total}</Count>
        </TabButton>
        {can('admission:review') ? (
          <TabButton active={tab === 'queue'} onClick={() => set({ tab: 'queue' })}>
            Review queue{' '}
            <Count tone={queue.data?.total ? 'warn' : undefined}>{queue.data?.total ?? 0}</Count>
          </TabButton>
        ) : null}
      </div>

      {tab === 'roll' ? (
        <>
          <div className="mb-4 flex flex-wrap gap-2.5">
            <SearchBox value={q} onChange={(value) => set({ q: value || undefined })} />
            <label className="sr-only" htmlFor="class-filter">
              Filter by class
            </label>
            <select
              id="class-filter"
              value={classGroupId ?? ''}
              onChange={(event) => set({ class: event.target.value || undefined })}
              className="min-h-11 rounded-control border border-line bg-white px-2.5 text-sm font-medium"
            >
              <option value="">All classes</option>
              {(classes.data ?? []).map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="fee-filter">
              Filter by fee status
            </label>
            <select
              id="fee-filter"
              value={feeStatus ?? ''}
              onChange={(event) => set({ fees: event.target.value || undefined })}
              className="min-h-11 rounded-control border border-line bg-white px-2.5 text-sm font-medium"
            >
              <option value="">Any fee status</option>
              <option value="settled">Settled</option>
              <option value="part_paid">Part paid</option>
              <option value="in_arrears">In arrears</option>
            </select>
          </div>

          <Card className="overflow-hidden !p-0">
            <div className="px-4.5 pt-3.5">
              {roll.isError ? (
                <ErrorState onRetry={() => void roll.refetch()} />
              ) : (
                <DataTable
                  columns={columns}
                  rows={roll.data?.items ?? []}
                  rowKey={(row) => row.student_id}
                  caption="Each row is an enrolment, not a person: a child who repeats a year keeps both records."
                  tintHeader
                  loading={roll.isLoading}
                  empty={
                    <EmptyState
                      title="Nobody matches that"
                      note={
                        q || classGroupId || feeStatus
                          ? 'Try a wider search, or clear the filters.'
                          : 'No children are enrolled for the current year yet.'
                      }
                      action={
                        q || classGroupId || feeStatus ? (
                          <Button
                            size="sm"
                            onClick={() =>
                              set({ q: undefined, class: undefined, fees: undefined })
                            }
                          >
                            Clear the filters
                          </Button>
                        ) : null
                      }
                    />
                  }
                  card={(row) => <RollCard row={row} overdue={feeStatus === 'in_arrears'} />}
                />
              )}
            </div>

            {total > PAGE ? (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-canvas px-4.5 py-3">
                <p className="m-0 text-[12.5px] text-muted" aria-live="polite">
                  Showing {from}&ndash;{to} of {total}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => set({ page: String(page - 1) })}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    disabled={to >= total}
                    onClick={() => set({ page: String(page + 1) })}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </Card>
        </>
      ) : (
        <ReviewQueue query={queue} />
      )}
    </>
  );
}

function ReviewQueue({ query }: { readonly query: ReturnType<typeof useReviewQueue> }) {
  if (query.isError) return <ErrorState onRetry={() => void query.refetch()} />;
  if (query.isLoading) {
    return (
      <div className="flex flex-col gap-3" aria-hidden="true">
        {[0, 1, 2].map((row) => (
          <div key={row} className="h-32 animate-pulse rounded-card bg-line-soft" />
        ))}
      </div>
    );
  }

  const rows = query.data?.items ?? [];

  return (
    <>
      <p className="mt-0 mb-4 max-w-[70ch] text-[13.5px] leading-relaxed text-ink-dim">
        Applications arrive from the public form with the guardian&rsquo;s phone already
        verified. The system flags likely duplicates on name, date of birth and guardian
        phone; a registrar accepts or merges each one.
      </p>
      {rows.length === 0 ? (
        <Card>
          <EmptyState
            title="Nothing is waiting"
            note="Every application that has come in has been screened or decided."
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((row) => (
            <QueueCard key={row.id} row={row} />
          ))}
        </div>
      )}
    </>
  );
}

function FeeCell({ row, overdue }: { readonly row: RollRow; readonly overdue: boolean }) {
  const pill = feePillFrom(Number(row.billed), Number(row.settled), overdue);
  return <Pill tone={pill.tone}>{pill.label}</Pill>;
}

function RollCard({ row, overdue }: { readonly row: RollRow; readonly overdue: boolean }) {
  const pill = feePillFrom(Number(row.billed), Number(row.settled), overdue);
  return (
    <Link
      to={`/students/${row.student_id}`}
      className="block rounded-[10px] border border-line p-3 no-underline"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="m-0 truncate text-sm font-semibold text-ink">
            {fullName(row.first_name, row.middle_name, row.surname)}
          </p>
          <p className="mt-0.5 mb-0 text-xs text-muted">
            {row.admission_no} · {row.class_name ?? 'Not enrolled'}
          </p>
        </div>
        <Pill tone={pill.tone}>{pill.label}</Pill>
      </div>
      {row.primary_guardian ? (
        <p className="mt-1.5 mb-0 text-xs text-muted">Guardian {row.primary_guardian}</p>
      ) : null}
    </Link>
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

const Count = ({
  children,
  tone,
}: {
  readonly children: React.ReactNode;
  readonly tone?: 'warn';
}) => (
  <span className={tone === 'warn' ? 'font-semibold text-warn-ink' : 'font-medium text-muted'}>
    {children}
  </span>
);

/**
 * Debounced, because the roll is a server-side search: a request per keystroke
 * over 471 children on a 3G connection is a queue of requests whose answers
 * arrive out of order.
 */
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
      <label htmlFor="roll-search" className="sr-only">
        Search students
      </label>
      <SearchIcon
        width={16}
        height={16}
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint"
      />
      <input
        id="roll-search"
        type="search"
        value={typed}
        onChange={(event) => setTyped(event.target.value)}
        placeholder="Search name or admission number"
        className="min-h-11 w-full rounded-control border border-line bg-white pr-3 pl-9 text-sm"
      />
    </div>
  );
}
