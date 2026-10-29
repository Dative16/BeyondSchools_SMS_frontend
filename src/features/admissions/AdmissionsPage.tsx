/**
 * Admissions: the whole intake, not just what is unreviewed.
 *
 * The Students page already has a review-queue tab for the submitted ones.
 * This is the other question a head teacher asks — how is the intake going —
 * and the two things that answer it are the funnel and the list of offers
 * about to lapse.
 *
 * The funnel counts how many applications have **reached** each state, not how
 * many are sitting in it. Current-state counts drawn as a funnel give an
 * upside-down staircase, which is the same mistake the dashboard made before
 * it was fixed.
 *
 * Two things the artboard shows that the system cannot answer yet are left
 * out rather than faked: a count of applications missing a birth certificate
 * (the queue knows how many documents are attached, not which), and a "send a
 * reminder" button (nothing sends an SMS on demand). Both are noted in the
 * commit rather than drawn as numbers nobody can reproduce.
 */

import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { PAGE, STATES, useFunnel, useQueue } from '@/api/queries/admissions';
import type { ApplicationState, QueueRow } from '@/api/queries/admissions';
import { SearchIcon } from '@/components/icons';
import {
  Button,
  ButtonLink,
  Card,
  CardHeader,
  DataTable,
  EmptyState,
  ErrorState,
  Pill,
} from '@/components/ui';
import type { Column } from '@/components/ui';
import { isLikelyDuplicate, offerStanding, stateLabel, statePill } from '@/domain/admissions';
import { useAuth } from '@/features/auth/AuthProvider';
import { msisdn } from '@/lib/format';

export default function AdmissionsPage() {
  const { can } = useAuth();
  const [params, setParams] = useSearchParams();

  const chosen = params.get('state') as ApplicationState | null;
  const q = params.get('q') ?? '';
  const page = Number(params.get('page') ?? 1);

  const funnel = useFunnel();
  const list = useQueue({ states: chosen ? [chosen] : [], q, page });
  const offered = useQueue({ states: ['offered'], page: 1 });
  const waiting = useQueue({ states: ['submitted'], page: 1 });
  const accepted = useQueue({ states: ['accepted'], page: 1 });

  function set(next: Record<string, string | undefined>) {
    const updated = new URLSearchParams(params);
    for (const [key, value] of Object.entries(next)) {
      if (value) updated.set(key, value);
      else updated.delete(key);
    }
    if (!('page' in next)) updated.delete('page');
    setParams(updated, { replace: true });
  }

  const today = new Date();
  const lapsing = (offered.data?.items ?? [])
    .map((row) => ({ row, standing: offerStanding(row.offer_expires_on, today) }))
    .filter(({ standing }) => standing && standing.tone !== 'neutral')
    .slice(0, 6);

  const duplicates = (waiting.data?.items ?? []).filter((row) =>
    isLikelyDuplicate(row.duplicate_score),
  ).length;
  const oldest = waiting.data?.items[0]?.waiting_days ?? 0;

  return (
    <>
      <div className="mb-4.5 flex flex-wrap items-end justify-between gap-3.5">
        <div>
          <h1 className="m-0 mb-1 font-display text-[26px] font-semibold tracking-[-0.02em]">
            Admissions
          </h1>
          <p className="m-0 text-sm text-muted">
            Every application this school has received, and where each one has got to.
          </p>
        </div>
        {can('student:manage') ? (
          <ButtonLink to="/students/new" variant="primary">
            Admit a child by hand
          </ButtonLink>
        ) : null}
      </div>

      <Card className="mb-4.5">
        <CardHeader
          title="How far applications have got"
          note="How many have reached each state, not how many are sitting in it. An application that is declined or withdrawn stops and is counted separately."
        />
        <FunnelBars funnel={funnel.data} loading={funnel.isLoading} />
        {funnel.data ? (
          <div className="mt-4 flex flex-wrap gap-6 border-t border-line-soft pt-3.5">
            <Aside label="Declined by the school" value={funnel.data.declined} />
            <Aside label="Withdrawn by the family" value={funnel.data.withdrawn} />
            <Aside label="Started but never sent" value={funnel.data.started} />
          </div>
        ) : null}
      </Card>

      <div className="mb-4.5 flex flex-wrap gap-4.5">
        <Card className="min-w-0 flex-[1.3_1_420px]">
          <div className="mb-2.5 flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-warn-ink" aria-hidden="true" />
            <h2 className="m-0 font-display text-[15px] font-semibold">
              Offers about to lapse
            </h2>
          </div>
          <p className="m-0 mb-3.5 text-[12.5px] leading-relaxed text-muted">
            An offer holds the place until its date. Ring the guardian before it passes —
            after that the family still believe they have a place and the school no longer
            holds it.
          </p>
          {offered.isLoading ? (
            <div className="h-20 animate-pulse rounded bg-line-soft" aria-hidden="true" />
          ) : lapsing.length === 0 ? (
            <p className="m-0 text-[13px] text-muted">
              No offer is close to lapsing. Every one out has time on it.
            </p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {lapsing.map(({ row, standing }) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-[10px] border border-line p-3"
                >
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <Link
                        to={`/admissions/${row.id}`}
                        className="text-[13.5px] font-semibold text-ink no-underline hover:text-ok-ink"
                      >
                        {row.child_name}
                      </Link>
                      <Pill tone={standing?.tone === 'bad' ? 'bad' : 'warn'}>
                        {standing?.text}
                      </Pill>
                    </div>
                    <p className="m-0 text-[12.5px] text-muted">
                      {row.level_name ?? 'No level'} ·{' '}
                      {row.guardian_name ?? 'Guardian not named'} ·{' '}
                      {msisdn(row.guardian_phone ?? row.phone)}
                    </p>
                  </div>
                  <a
                    href={`tel:${row.guardian_phone ?? row.phone}`}
                    className="inline-flex min-h-11 items-center rounded-control border border-line bg-white px-3.5 text-[13px] font-medium text-ink no-underline hover:bg-canvas"
                  >
                    Ring them
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="min-w-0 flex-[1_1_300px]">
          <CardHeader
            title="Waiting for the registrar"
            note="Nothing moves on its own. These are waiting for a person."
          />
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
            <Waiting
              label="Submitted, not yet screened"
              count={waiting.data?.total ?? 0}
              to="/admissions?state=submitted"
            />
            <Waiting
              label="Flagged as a possible duplicate"
              count={duplicates}
              to="/admissions?state=submitted"
              tone={duplicates > 0 ? 'warn' : undefined}
            />
            <Waiting
              label="Deposit received, not yet enrolled"
              count={accepted.data?.total ?? 0}
              to="/admissions?state=accepted"
              tone={(accepted.data?.total ?? 0) > 0 ? 'ok' : undefined}
            />
          </ul>
          {(waiting.data?.total ?? 0) > 0 ? (
            <p className="mt-3 mb-0 text-[12.5px] text-muted">
              The oldest unscreened application has been waiting {oldest}{' '}
              {oldest === 1 ? 'day' : 'days'}.
            </p>
          ) : null}
        </Card>
      </div>

      <Card className="overflow-hidden !p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4.5 pt-4 pb-1">
          <h2 className="m-0 font-display text-[15px] font-semibold">All applications</h2>
          <div className="flex flex-wrap gap-2.5">
            <SearchBox value={q} onChange={(value) => set({ q: value || undefined })} />
            <label htmlFor="state-filter" className="sr-only">
              Filter by state
            </label>
            <select
              id="state-filter"
              value={chosen ?? ''}
              onChange={(event) => set({ state: event.target.value || undefined })}
              className="min-h-11 rounded-control border border-line bg-white px-2.5 text-sm font-medium"
            >
              <option value="">Every state</option>
              {STATES.map((state) => (
                <option key={state} value={state}>
                  {stateLabel(state)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="px-4.5 pt-2">
          {list.isError ? (
            <ErrorState onRetry={() => void list.refetch()} />
          ) : (
            <DataTable
              columns={columns}
              rows={list.data?.items ?? []}
              rowKey={(row) => row.id}
              caption="Every application, oldest first"
              captionHidden
              tintHeader
              loading={list.isLoading}
              empty={
                <EmptyState
                  title="Nothing matches that"
                  note={
                    q || chosen
                      ? 'Try a wider search, or clear the filter.'
                      : 'No applications have come in yet.'
                  }
                />
              }
              card={(row) => <ApplicationCard row={row} />}
            />
          )}
        </div>

        <Pager
          total={list.data?.total ?? 0}
          page={page}
          onPage={(next) => set({ page: String(next) })}
        />
      </Card>
    </>
  );
}

const columns: readonly Column<QueueRow>[] = [
  {
    key: 'child',
    header: 'Child',
    nowrap: true,
    cell: (row) => (
      <Link
        to={`/admissions/${row.id}`}
        className="text-[13.5px] font-semibold text-ink no-underline hover:text-ok-ink"
      >
        {row.child_name || row.reference}
      </Link>
    ),
  },
  {
    key: 'level',
    header: 'Applying for',
    nowrap: true,
    cell: (row) => <span className="text-ink-dim">{row.level_name ?? '—'}</span>,
  },
  {
    key: 'guardian',
    header: 'Guardian',
    nowrap: true,
    cell: (row) => (
      <span className="text-ink-dim">
        {row.guardian_name ?? 'Not named'} · {msisdn(row.guardian_phone ?? row.phone)}
      </span>
    ),
  },
  {
    key: 'state',
    header: 'State',
    nowrap: true,
    cell: (row) => {
      const pill = statePill(row.state);
      return (
        <span className="flex items-center gap-2">
          <Pill tone={pill.tone}>{pill.label}</Pill>
          {isLikelyDuplicate(row.duplicate_score) ? <Pill tone="warn">Duplicate?</Pill> : null}
        </span>
      );
    },
  },
  {
    key: 'waiting',
    header: 'Waiting',
    align: 'right',
    nowrap: true,
    cell: (row) => (
      <span className={row.waiting_days >= 7 ? 'font-semibold text-warn-ink' : ''}>
        {row.waiting_days} {row.waiting_days === 1 ? 'day' : 'days'}
      </span>
    ),
  },
];

function FunnelBars({
  funnel,
  loading,
}: {
  readonly funnel:
    | {
        started: number;
        submitted: number;
        screened: number;
        offered: number;
        accepted: number;
        enrolled: number;
      }
    | undefined;
  readonly loading: boolean;
}) {
  if (loading || !funnel) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((step) => (
          <div key={step} className="h-[86px] animate-pulse rounded-[10px] bg-line-soft" />
        ))}
      </div>
    );
  }

  // Reached-at-least, accumulated backwards. Drawing the current-state counts
  // straight would give Started 0 and Submitted 2 — an upside-down staircase.
  const stages: ReadonlyArray<[string, number]> = [
    ['Submitted', funnel.submitted],
    ['Screened', funnel.screened],
    ['Offered', funnel.offered],
    ['Deposit received', funnel.accepted],
    ['Enrolled', funnel.enrolled],
  ];
  const reached: number[] = [];
  let running = 0;
  for (let index = stages.length - 1; index >= 0; index -= 1) {
    running += stages[index]?.[1] ?? 0;
    reached[index] = running;
  }
  const widest = Math.max(reached[0] ?? 0, 1);

  return (
    <ol className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 lg:grid-cols-5">
      {stages.map(([label], index) => {
        const count = reached[index] ?? 0;
        const percent = Math.min(Math.round((count / widest) * 100), 100);
        return (
          <li key={label} className="rounded-[10px] border border-line p-[13px_14px]">
            <p className="m-0 mb-2 text-xs font-medium text-muted">{label}</p>
            <p className="m-0 mb-2.5 font-display text-[23px] font-semibold">{count}</p>
            <div
              className="h-[5px] overflow-hidden rounded-[3px] bg-line-soft"
              role="img"
              aria-label={`${percent}% of those who applied`}
            >
              <div className="h-[5px] bg-brand" style={{ width: `${percent}%` }} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function Aside({ label, value }: { readonly label: string; readonly value: number }) {
  return (
    <div>
      <p className="m-0 mb-0.5 text-xs font-medium text-muted">{label}</p>
      <p className="m-0 font-display text-lg font-semibold">{value}</p>
    </div>
  );
}

function Waiting({
  label,
  count,
  to,
  tone,
}: {
  readonly label: string;
  readonly count: number;
  readonly to: string;
  readonly tone?: 'warn' | 'ok';
}) {
  return (
    <li className="flex items-center justify-between gap-3 text-[13px]">
      <Link to={to} className="text-ink-dim no-underline hover:text-ok-ink">
        {label}
      </Link>
      <span
        className={`font-semibold ${
          tone === 'warn' ? 'text-warn-ink' : tone === 'ok' ? 'text-ok-ink' : 'text-muted'
        }`}
      >
        {count}
      </span>
    </li>
  );
}

function ApplicationCard({ row }: { readonly row: QueueRow }) {
  const pill = statePill(row.state);
  return (
    <Link
      to={`/admissions/${row.id}`}
      className="block rounded-[10px] border border-line p-3 no-underline"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="m-0 truncate text-sm font-semibold text-ink">
            {row.child_name || row.reference}
          </p>
          <p className="mt-0.5 mb-0 text-xs text-muted">
            {row.level_name ?? 'No level'} · waiting {row.waiting_days}{' '}
            {row.waiting_days === 1 ? 'day' : 'days'}
          </p>
        </div>
        <Pill tone={pill.tone}>{pill.label}</Pill>
      </div>
      <p className="mt-1.5 mb-0 text-xs text-ink-dim">
        {row.guardian_name ?? 'Guardian not named'} · {msisdn(row.guardian_phone ?? row.phone)}
      </p>
    </Link>
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
    <div className="relative min-w-0 flex-[1_1_220px]">
      <label htmlFor="application-search" className="sr-only">
        Search applications
      </label>
      <SearchIcon
        width={16}
        height={16}
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint"
      />
      <input
        id="application-search"
        type="search"
        value={typed}
        onChange={(event) => setTyped(event.target.value)}
        placeholder="Search a name, reference or number"
        className="min-h-11 w-full rounded-control border border-line bg-white pr-3 pl-9 text-sm"
      />
    </div>
  );
}
