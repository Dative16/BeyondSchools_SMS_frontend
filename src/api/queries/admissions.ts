/**
 * Transport for the admissions funnel.
 *
 * Every action invalidates the whole `admissions` tree and the dashboard
 * besides. An offer raises an invoice, a deposit settles it and an enrolment
 * creates a pupil — so the queue, the funnel, the nav badge, the roll and the
 * money tiles all move at once, and a registrar who sees one of them change
 * and not the others starts refreshing the page by hand.
 */

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/api/client';
import type { components } from '@/api/schema';

export type QueueRow = components['schemas']['QueueRowResponse'];
export type ApplicationDetail = components['schemas']['ApplicationDetailResponse'];
export type Funnel = components['schemas']['FunnelResponse'];
export type AdmitByHandBody = components['schemas']['AdmitByHandRequest'];
export type Admitted = components['schemas']['AdmittedResponse'];
export type GuardianAtNumber = components['schemas']['GuardianAtThisNumber'];
type QueuePage = components['schemas']['Page_QueueRowResponse_'];

export const PAGE = 25;

/** Every state the funnel has, in the order an application moves through them. */
export const STATES = [
  'started',
  'submitted',
  'screened',
  'offered',
  'accepted',
  'enrolled',
  'declined',
  'withdrawn',
] as const;

export type ApplicationState = (typeof STATES)[number];

export interface QueueFilters {
  readonly states: readonly ApplicationState[];
  readonly q?: string;
  readonly page: number;
}

export const admissionKeys = {
  all: ['admissions'] as const,
  queue: (filters: QueueFilters) => ['admissions', 'queue', filters] as const,
  one: (id: string) => ['admissions', 'one', id] as const,
  funnel: ['admissions', 'funnel'] as const,
};

function queueQuery(filters: QueueFilters): string {
  const params = new URLSearchParams({
    page: String(filters.page),
    size: String(PAGE),
  });
  for (const state of filters.states) params.append('state', state);
  if (filters.q?.trim()) params.set('q', filters.q.trim());
  return params.toString();
}

export const useQueue = (filters: QueueFilters) =>
  useQuery({
    queryKey: admissionKeys.queue(filters),
    queryFn: () => api<QueuePage>(`/admissions?${queueQuery(filters)}`),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

export const useApplication = (applicationId: string) =>
  useQuery({
    queryKey: admissionKeys.one(applicationId),
    queryFn: () => api<ApplicationDetail>(`/admissions/${applicationId}`),
    staleTime: 15_000,
  });

export const useFunnel = () =>
  useQuery({
    queryKey: admissionKeys.funnel,
    queryFn: () => api<Funnel>('/admissions/funnel'),
    staleTime: 60_000,
  });

/**
 * An application moving is never only an application moving: an offer raises
 * an invoice, a deposit settles one, an enrolment makes a pupil.
 */
function useRefreshEverythingItTouches() {
  const client = useQueryClient();
  return () => {
    void client.invalidateQueries({ queryKey: admissionKeys.all });
    void client.invalidateQueries({ queryKey: ['dashboard'] });
    void client.invalidateQueries({ queryKey: ['fees'] });
    void client.invalidateQueries({ queryKey: ['students'] });
  };
}

function useStep<TBody>(applicationId: string, step: string) {
  const refresh = useRefreshEverythingItTouches();
  return useMutation({
    mutationFn: (body: TBody) =>
      api<unknown>(`/admissions/${applicationId}/${step}`, {
        method: 'POST',
        body: JSON.stringify(body ?? {}),
      }),
    onSuccess: refresh,
  });
}

export const useScreen = (id: string) => useStep<{ note: string | null }>(id, 'screen');
export const useOffer = (id: string) => useStep<Record<string, never>>(id, 'offer');
export const useDecline = (id: string) => useStep<{ reason: string }>(id, 'decline');

export const useRecordDeposit = (id: string) =>
  useStep<{
    amount: string;
    receipt: string;
    channel: string;
    received_on: string | null;
    note: string | null;
  }>(id, 'deposit');

export const useEnrol = (id: string) =>
  useStep<{ class_group_id: string; residency?: string }>(id, 'enrol');

/**
 * Admitting a child at the counter.
 *
 * One call, because it is one transaction on the server: the pupil record,
 * the enrolment, the guardian, the link, the family's login and this term's
 * invoice. A sequence of calls from here could leave a child on the roll with
 * no bill, and there is a parent standing at the desk.
 *
 * It invalidates the roll, the admissions queue and everything money touches,
 * all three of which it has just changed.
 */
export function useAdmitByHand() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: AdmitByHandBody) =>
      api<Admitted>('/admissions/by-hand', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['students'] });
      void client.invalidateQueries({ queryKey: admissionKeys.all });
      void client.invalidateQueries({ queryKey: ['fees'] });
    },
  });
}

/**
 * Who already uses a phone number, asked while the registrar is typing it.
 *
 * Null is the ordinary answer and is not an error. When it is not null the
 * form says whose number it is, because the admission matches a guardian on
 * phone and the record on file wins on every field — so a name typed here
 * against a number the school already holds is silently discarded, and a
 * registrar deserves to know that before they submit rather than never.
 */
export function useGuardianAtNumber(phone: string) {
  return useQuery({
    queryKey: ['guardians', 'at-number', phone],
    queryFn: () =>
      api<GuardianAtNumber | null>(`/guardians/at-number?phone=${encodeURIComponent(phone)}`),
    enabled: phone.length >= 10,
    staleTime: 60_000,
  });
}
