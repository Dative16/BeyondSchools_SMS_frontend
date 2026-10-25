/**
 * Transport for one child's record.
 *
 * The profile is a single call that already carries the enrolment history, the
 * guardians, the fee totals and — when the account may read it — the medical
 * detail. That is the server's choice and the right one: the five pieces have
 * to agree, and five requests would let a screen show a class from one moment
 * and a balance from another.
 *
 * The statement and the checklist are separate because they are separately
 * permitted. A class teacher may open a child's profile and may not read what
 * the family owes.
 */

import { useQuery } from '@tanstack/react-query';

import { api } from '@/api/client';
import type { components } from '@/api/schema';

export type Profile = components['schemas']['StudentProfileResponse'];
export type Guardian = components['schemas']['GuardianOnStudent'];
export type HistoryRow = components['schemas']['EnrolmentHistoryRow'];
export type Statement = components['schemas']['StatementResponse'];
export type Checklist = components['schemas']['ChecklistResponse'];

export const studentKeys = {
  profile: (id: string) => ['student', id, 'profile'] as const,
  statement: (id: string) => ['student', id, 'statement'] as const,
  checklist: (id: string) => ['student', id, 'checklist'] as const,
};

export const useStudent = (studentId: string) =>
  useQuery({
    queryKey: studentKeys.profile(studentId),
    queryFn: () => api<Profile>(`/students/${studentId}`),
    staleTime: 60_000,
  });

export const useStatement = (studentId: string, enabled: boolean) =>
  useQuery({
    queryKey: studentKeys.statement(studentId),
    queryFn: () => api<Statement>(`/fees/students/${studentId}/statement`),
    enabled,
    staleTime: 30_000,
  });

/** What is still missing from the record — documents, a guardian, a contact. */
export const useChecklist = (studentId: string, enabled: boolean) =>
  useQuery({
    queryKey: studentKeys.checklist(studentId),
    queryFn: () => api<Checklist>(`/students/${studentId}/checklist`),
    enabled,
    staleTime: 60_000,
  });
