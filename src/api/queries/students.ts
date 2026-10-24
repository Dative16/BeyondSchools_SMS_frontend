/**
 * Transport for the roll and the review queue.
 *
 * The filters go to the server rather than being applied here, and that is not
 * a preference: the roll is 471 children and arrives a page at a time, so a
 * filter applied after the fetch would search one page of twenty-five and
 * confidently report that a child is not enrolled.
 */

import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { api } from '@/api/client';
import type { components } from '@/api/schema';

export type RollRow = components['schemas']['RollRowResponse'];
export type QueueRow = components['schemas']['QueueRowResponse'];
type RollPage = components['schemas']['Page_RollRowResponse_'];
type QueuePage = components['schemas']['Page_QueueRowResponse_'];
type ClassGroup = components['schemas']['ClassGroupResponse'];

export type FeeStatus = 'settled' | 'part_paid' | 'in_arrears';

export interface RollFilters {
  readonly q?: string;
  readonly classGroupId?: string;
  readonly feeStatus?: FeeStatus;
  readonly page: number;
}

export const studentKeys = {
  roll: (filters: RollFilters) => ['students', 'roll', filters] as const,
  classes: ['students', 'classes'] as const,
  queue: ['students', 'queue'] as const,
};

const PAGE_SIZE = 25;

function rollQuery(filters: RollFilters): string {
  const params = new URLSearchParams({
    page: String(filters.page),
    size: String(PAGE_SIZE),
  });
  if (filters.q?.trim()) params.set('q', filters.q.trim());
  if (filters.classGroupId) params.set('class_group_id', filters.classGroupId);
  if (filters.feeStatus) params.set('fee_status', filters.feeStatus);
  return params.toString();
}

/**
 * `keepPreviousData` is what stops the table blanking between pages. Without
 * it, pressing Next on a slow connection empties the screen and then refills
 * it, which reads as the filter having found nothing.
 */
export const useRoll = (filters: RollFilters) =>
  useQuery({
    queryKey: studentKeys.roll(filters),
    queryFn: () => api<RollPage>(`/students?${rollQuery(filters)}`),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

export const useClassGroups = () =>
  useQuery({
    queryKey: studentKeys.classes,
    queryFn: () => api<ClassGroup[]>('/academic/class-groups'),
    staleTime: 10 * 60_000,
  });

/** Everything a registrar still has to decide about, oldest first. */
export const useReviewQueue = (enabled: boolean) =>
  useQuery({
    queryKey: studentKeys.queue,
    queryFn: () => api<QueuePage>('/admissions?state=submitted&state=screened&size=50'),
    enabled,
    staleTime: 60_000,
  });

export const PAGE = PAGE_SIZE;
