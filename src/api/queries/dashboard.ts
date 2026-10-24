/**
 * Transport for the dashboard. Six reads, no arithmetic.
 *
 * Each is its own query rather than one combined call, so a slow one does not
 * hold up the rest of the screen: the tiles paint as their numbers arrive and
 * the cards fill in behind them. On a 3G connection that is the difference
 * between a dashboard and a spinner.
 */

import { useQuery } from '@tanstack/react-query';

import { api } from '@/api/client';
import type { components } from '@/api/schema';

type Collection = components['schemas']['CollectionResponse'];
type Funnel = components['schemas']['FunnelResponse'];
type RecentPayment = components['schemas']['RecentPayment'];
type Suspense = components['schemas']['SuspensePayment'];
type Structure = components['schemas']['FeeStructureRow'];
type Roll = components['schemas']['Page_RollRowResponse_'];
type Queue = components['schemas']['Page_QueueRowResponse_'];

export const dashboardKeys = {
  collection: ['dashboard', 'collection'] as const,
  roll: ['dashboard', 'roll'] as const,
  funnel: ['dashboard', 'funnel'] as const,
  payments: ['dashboard', 'payments'] as const,
  suspense: ['dashboard', 'suspense'] as const,
  structures: ['dashboard', 'structures'] as const,
  queue: ['dashboard', 'queue'] as const,
};

/** Money moves; the tiles should not be a minute stale when it does. */
const MONEY_STALE = 30_000;
/** The roll changes a few times a term. */
const SLOW_STALE = 5 * 60_000;

export const useCollection = (enabled: boolean) =>
  useQuery({
    queryKey: dashboardKeys.collection,
    queryFn: () => api<Collection>('/fees/collection'),
    enabled,
    staleTime: MONEY_STALE,
  });

/** One row fetched, one number used: the roll's size, not the roll. */
export const useEnrolledCount = (enabled: boolean) =>
  useQuery({
    queryKey: dashboardKeys.roll,
    queryFn: () => api<Roll>('/students?size=1'),
    enabled,
    staleTime: SLOW_STALE,
    select: (page) => page.total,
  });

export const useFunnel = (enabled: boolean) =>
  useQuery({
    queryKey: dashboardKeys.funnel,
    queryFn: () => api<Funnel>('/admissions/funnel'),
    enabled,
    staleTime: SLOW_STALE,
  });

export const useRecentPayments = (enabled: boolean) =>
  useQuery({
    queryKey: dashboardKeys.payments,
    queryFn: () => api<RecentPayment[]>('/payments/recent?limit=5'),
    enabled,
    staleTime: MONEY_STALE,
  });

export const useSuspense = (enabled: boolean) =>
  useQuery({
    queryKey: dashboardKeys.suspense,
    queryFn: () => api<Suspense[]>('/payments/suspense'),
    enabled,
    staleTime: MONEY_STALE,
  });

/** Only the drafts matter here: a published structure is not news. */
export const useDraftStructures = (enabled: boolean) =>
  useQuery({
    queryKey: dashboardKeys.structures,
    queryFn: () => api<Structure[]>('/fees/structures'),
    enabled,
    staleTime: SLOW_STALE,
    select: (rows) => rows.filter((row) => row.status === 'draft'),
  });

/**
 * The review queue, oldest first — which is how the server orders it, so the
 * first row is the one that has waited longest.
 */
export const useReviewQueue = (enabled: boolean) =>
  useQuery({
    queryKey: dashboardKeys.queue,
    queryFn: () => api<Queue>('/admissions?state=submitted&size=25'),
    enabled,
    staleTime: 60_000,
  });
