/**
 * Transport for the parent and student portal.
 *
 * Everything here is scoped by the token rather than by an id the client
 * chooses. `/guardians/me/children` takes no parameter at all, which is the
 * point: there is nothing for a caller to change, so there is nothing to probe.
 *
 * Caches are short. A parent refreshes this screen the morning after paying at
 * the counter to see whether the receipt has landed, and a stale balance is
 * the one thing that would send them back to the office for nothing.
 */

import { useMutation, useQuery } from '@tanstack/react-query';

import { api } from '@/api/client';
import type { components } from '@/api/schema';

export type Child = components['schemas']['GuardianChildResponse'];
export type Statement = components['schemas']['StatementResponse'];
export type StudentProfile = components['schemas']['StudentProfileResponse'];
export type Handoff = components['schemas']['HandoffResponse'];

export const portalKeys = {
  children: ['portal', 'children'] as const,
  statement: (studentId: string) => ['portal', 'statement', studentId] as const,
  record: (studentId: string) => ['portal', 'record', studentId] as const,
};

/** Every child this account is linked to, with what each owes. */
export const useMyChildren = (enabled = true) =>
  useQuery({
    queryKey: portalKeys.children,
    queryFn: () => api<Child[]>('/guardians/me/children'),
    enabled,
    staleTime: 30_000,
  });

/** Every bill one child has had. Scoped by the family's link to that child. */
export const useChildStatement = (studentId: string | undefined) =>
  useQuery({
    queryKey: portalKeys.statement(studentId ?? 'none'),
    queryFn: () => api<Statement>(`/fees/students/${studentId}/statement`),
    enabled: Boolean(studentId),
    staleTime: 30_000,
  });

/**
 * One child's record, as the family may read it.
 *
 * The same endpoint the office uses. It hands out the health record and the
 * emergency contacts only on `health:read`, which neither a guardian nor a
 * pupil has — so this is the full profile minus the sensitive half, decided on
 * the server rather than filtered here.
 */
export const useChildRecord = (studentId: string | undefined) =>
  useQuery({
    queryKey: portalKeys.record(studentId ?? 'none'),
    queryFn: () => api<StudentProfile>(`/students/${studentId}`),
    enabled: Boolean(studentId),
    staleTime: 60_000,
  });

/**
 * Crossing to the AI platform already signed in.
 *
 * The route the whole project rests on. A two-minute token is minted here and
 * the destination is built by the server — a signed token plus a destination
 * the client chose would be an open redirect that leaks the token to whoever
 * asked for it.
 *
 * Not a query: it must not be prefetched, cached or retried. Each press mints
 * one token and spends it immediately.
 */
export function useHandoff() {
  return useMutation({
    mutationFn: (studentId: string) =>
      api<Handoff>('/auth/ai-handoff', {
        method: 'POST',
        body: JSON.stringify({ student_id: studentId }),
      }),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (body: { current_password: string; new_password: string }) =>
      api<unknown>('/auth/password', { method: 'POST', body: JSON.stringify(body) }),
  });
}
