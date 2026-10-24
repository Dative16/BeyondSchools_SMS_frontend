/**
 * The seam: six reads in, one view model out.
 *
 * Everything the page needs to decide has been decided by the time it gets
 * here, which is what lets `DashboardPage` be markup. The two interesting
 * decisions are both about honesty:
 *
 * A tile reports `loading` separately from its value, so a figure is never
 * drawn as 0 while it is still on its way — a collection tile that shows
 * "0%" for half a second and then "74%" has told a lie, briefly, about the
 * thing a bursar is judged on.
 *
 * And the attention list is only built once the things it counts have
 * answered. A list assembled from partial data would drop rows as the rest
 * arrived, which looks like items being dismissed by somebody else.
 */

import { useMemo } from 'react';

import {
  useCollection,
  useDraftStructures,
  useEnrolledCount,
  useFunnel,
  useRecentPayments,
  useReviewQueue,
  useSuspense,
} from '@/api/queries/dashboard';
import { useCurrentTerm } from '@/api/queries/school';
import { attentionItems } from '@/domain/attention';
import { greeting, termProgress } from '@/domain/term';
import type { components } from '@/api/schema';
import type { Permission } from '@/types/domain';

type Funnel = components['schemas']['FunnelResponse'];

/** The server flags a likely duplicate at 70; below that it is a coincidence. */
const DUPLICATE_FLAG = 70;

export function useDashboard(
  fullName: string,
  can: (permission: Permission) => boolean,
  asOf: Date = new Date(),
) {
  const seesMoney = can('invoice:read');
  const seesPayments = can('payment:read');
  const seesAdmissions = can('admission:review');
  const seesRoll = can('student:read');
  const seesStructures = can('fee_structure:manage');

  const term = useCurrentTerm();
  const collection = useCollection(seesMoney);
  const enrolled = useEnrolledCount(seesRoll);
  const funnel = useFunnel(seesAdmissions);
  const payments = useRecentPayments(seesPayments);
  const suspense = useSuspense(seesPayments);
  const structures = useDraftStructures(seesStructures);
  const queue = useReviewQueue(seesAdmissions);

  const attention = useMemo(() => {
    const rows = queue.data?.items ?? [];
    return attentionItems({
      suspenseCount: suspense.data?.length ?? 0,
      suspenseTotal: sum(suspense.data?.map((row) => Number(row.amount)) ?? []),
      suspenseFrom: suspense.data?.[0]?.msisdn ?? null,
      draftStructures: structures.data?.map((row) => row.level_name) ?? [],
      applicationsWaiting: queue.data?.total ?? 0,
      // The queue comes back oldest first, so the first row has waited longest.
      oldestWaitingDays: rows[0]?.waiting_days ?? 0,
      likelyDuplicates: rows.filter((row) => (row.duplicate_score ?? 0) >= DUPLICATE_FLAG)
        .length,
      studentsOver60Days: collection.data?.students_over_60_days ?? 0,
    });
  }, [suspense.data, structures.data, queue.data, collection.data]);

  // Only once every source that feeds it has answered. Rows appearing and
  // disappearing as requests land reads as somebody else clearing them.
  const attentionSettled =
    !suspense.isLoading && !structures.isLoading && !queue.isLoading && !collection.isLoading;

  return {
    greeting: greeting(fullName),
    today: asOf,
    termLine: termProgress(
      term.term
        ? {
            label: term.term.label,
            startsOn: term.term.starts_on,
            endsOn: term.term.ends_on,
          }
        : undefined,
      asOf,
    ),

    tiles: {
      enrolled: { value: enrolled.data, loading: enrolled.isLoading, shown: seesRoll },
      money: {
        billed: numberOr(collection.data?.billed),
        settled: numberOr(collection.data?.settled),
        outstanding: numberOr(collection.data?.outstanding),
        overdue: numberOr(collection.data?.overdue),
        percent: collection.data?.collected_percent ?? 0,
        inArrears: collection.data?.students_in_arrears ?? 0,
        over60: collection.data?.students_over_60_days ?? 0,
        loading: collection.isLoading,
        shown: seesMoney,
      },
      waiting: {
        value: queue.data?.total,
        oldestDays: queue.data?.items[0]?.waiting_days ?? 0,
        loading: queue.isLoading,
        shown: seesAdmissions,
      },
    },

    attention: attentionSettled ? attention : [],
    attentionLoading: !attentionSettled,

    payments: {
      rows: payments.data ?? [],
      loading: payments.isLoading,
      failed: payments.isError,
      shown: seesPayments,
    },

    funnel: {
      steps: funnelSteps(funnel.data),
      loading: funnel.isLoading,
      shown: seesAdmissions,
    },
  };
}

const sum = (values: readonly number[]): number => values.reduce((a, b) => a + b, 0);

/** The API sends money as a decimal string, on purpose. Parse it once, here. */
const numberOr = (value: string | undefined): number => (value ? Number(value) : 0);

export interface FunnelStep {
  readonly label: string;
  readonly count: number;
  readonly percent: number;
}

/**
 * The funnel as five bars.
 *
 * The API reports how many applications are *currently* in each state, which
 * is not a funnel: an application that reached "enrolled" left "submitted"
 * behind it, so drawing those counts directly gives Started 0 and Submitted 2,
 * which is not a drop-off but an upside-down staircase.
 *
 * So each bar is "reached at least this far" — the count at that stage plus
 * every stage after it. Declined and withdrawn applications are left out
 * entirely rather than guessed at: we know one was declined, we do not know
 * how far it got before it was, and a funnel is not worth inventing numbers
 * for.
 *
 * Bars are a share of the first stage, so the gap between offered and enrolled
 * is visible. That gap is the one a school acts on: children offered a place
 * who never paid the deposit.
 */
export function funnelSteps(funnel: Funnel | undefined): readonly FunnelStep[] {
  if (!funnel) return [];

  const stages: ReadonlyArray<[string, number]> = [
    ['Started', funnel.started],
    ['Submitted', funnel.submitted],
    ['Screened', funnel.screened],
    ['Offered', funnel.offered],
    ['Accepted', funnel.accepted],
    ['Enrolled', funnel.enrolled],
  ];

  // Walk backwards, accumulating: each stage carries everyone past it.
  const reached: number[] = [];
  let running = 0;
  for (let index = stages.length - 1; index >= 0; index -= 1) {
    running += stages[index]?.[1] ?? 0;
    reached[index] = running;
  }

  const widest = Math.max(reached[0] ?? 0, 1);

  // Accepted is dropped from the display: the design shows five bars, and
  // "accepted" and "enrolled" are minutes apart in practice — a deposit lands
  // and a registrar enrols the child the same morning.
  return [0, 1, 2, 3, 5].map((index) => {
    const count = reached[index] ?? 0;
    return {
      label: stages[index]?.[0] ?? '',
      count,
      percent: Math.min(Math.round((count / widest) * 100), 100),
    };
  });
}
