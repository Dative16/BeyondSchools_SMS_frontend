/**
 * Transport for setting the school up: years, terms, the ladder, classes.
 *
 * These are the slowest-changing things in the system and the most dangerous
 * to show stale. A term date decides when fees fall due; a ladder decides
 * where a pupil goes in December. So every write here invalidates the whole
 * setup tree rather than patching one entry, and the roll and the fee screens
 * with it where a change reaches that far.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/api/client';
import { academicKeys } from '@/api/queries/academic';
import { schoolKeys } from '@/api/queries/school';
import type { components } from '@/api/schema';

export type AcademicYear = components['schemas']['AcademicYearResponse'];
export type Term = components['schemas']['TermResponse'];
export type Ladder = components['schemas']['LadderResponse'];
export type Level = components['schemas']['LevelResponse'];
export type ClassGroup = components['schemas']['ClassGroupResponse'];
export type Stream = components['schemas']['StreamResponse'];
export type TeachingStaff = components['schemas']['TeachingStaffResponse'];
export type TermDraft = components['schemas']['TermDraftRequest'];
export type NewLevel = components['schemas']['LevelCreateRequest'];
export type NewClass = components['schemas']['ClassGroupCreateRequest'];
export type NewStream = components['schemas']['StreamCreateRequest'];

export const setupKeys = {
  all: ['setup'] as const,
  ladder: (yearId: string | undefined) => ['setup', 'ladder', yearId ?? 'current'] as const,
  classes: (yearId: string | undefined) => ['setup', 'classes', yearId ?? 'current'] as const,
  staff: (yearId: string | undefined) => ['setup', 'staff', yearId ?? 'any'] as const,
  streams: ['setup', 'streams'] as const,
};

/** Everything setup touches, plus the screens that read it. */
function useRefreshSetup() {
  const client = useQueryClient();
  return () => {
    void client.invalidateQueries({ queryKey: setupKeys.all });
    void client.invalidateQueries({ queryKey: academicKeys.levels });
    void client.invalidateQueries({ queryKey: academicKeys.streams });
    // The term and the year are in the top bar on every screen, and the roll
    // and the fee tiles are scoped to them.
    void client.invalidateQueries({ queryKey: schoolKeys.years });
    void client.invalidateQueries({ queryKey: ['students'] });
    void client.invalidateQueries({ queryKey: ['fees'] });
  };
}

export const useTermsOf = (yearId: string | undefined) =>
  useQuery({
    queryKey: schoolKeys.terms(yearId ?? 'none'),
    queryFn: () => api<Term[]>(`/academic/years/${yearId}/terms`),
    enabled: Boolean(yearId),
    staleTime: 5 * 60_000,
  });

/**
 * The ladder, which the server works out rather than the screen.
 *
 * It comes back with the outcome per level and the problems it found, so the
 * page shows the promotion run's own reading of the ladder instead of a second
 * opinion about it.
 */
export const useLadder = (yearId: string | undefined) =>
  useQuery({
    queryKey: setupKeys.ladder(yearId),
    queryFn: () =>
      api<Ladder>(yearId ? `/academic/ladder?year_id=${yearId}` : '/academic/ladder'),
    staleTime: 60_000,
  });

export const useClassesOf = (yearId: string | undefined) =>
  useQuery({
    queryKey: setupKeys.classes(yearId),
    queryFn: () =>
      api<ClassGroup[]>(
        yearId ? `/academic/class-groups?year_id=${yearId}` : '/academic/class-groups',
      ),
    staleTime: 60_000,
  });

/** Who can be put in front of a class. The same roles the save accepts. */
export const useTeachingStaff = (yearId: string | undefined, enabled = true) =>
  useQuery({
    queryKey: setupKeys.staff(yearId),
    queryFn: () =>
      api<TeachingStaff[]>(
        yearId ? `/academic/teaching-staff?year_id=${yearId}` : '/academic/teaching-staff',
      ),
    enabled,
    staleTime: 5 * 60_000,
  });

export function useOpenYear() {
  const refresh = useRefreshSetup();
  return useMutation({
    mutationFn: (body: {
      label: string;
      starts_on: string;
      ends_on: string;
      make_current: boolean;
    }) => api<AcademicYear>('/academic/years', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: refresh,
  });
}

export function useMakeYearCurrent() {
  const refresh = useRefreshSetup();
  return useMutation({
    mutationFn: (yearId: string) =>
      api<AcademicYear>(`/academic/years/${yearId}/current`, { method: 'POST' }),
    onSuccess: refresh,
  });
}

/** Replaces the year's whole set of terms, which is what the endpoint does. */
export function useSaveTerms(yearId: string) {
  const refresh = useRefreshSetup();
  return useMutation({
    mutationFn: (terms: readonly TermDraft[]) =>
      api<Term[]>(`/academic/years/${yearId}/terms`, {
        method: 'PUT',
        body: JSON.stringify({ terms }),
      }),
    onSuccess: refresh,
  });
}

export function useMakeTermCurrent() {
  const refresh = useRefreshSetup();
  return useMutation({
    mutationFn: (termId: string) =>
      api<Term>(`/academic/terms/${termId}/current`, { method: 'POST' }),
    onSuccess: refresh,
  });
}

export function useAddLevel() {
  const refresh = useRefreshSetup();
  return useMutation({
    mutationFn: (body: NewLevel) =>
      api<Ladder>('/academic/levels', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: refresh,
  });
}

export function useUpdateLevel(levelId: string) {
  const refresh = useRefreshSetup();
  return useMutation({
    mutationFn: (body: Partial<NewLevel> & { is_active?: boolean }) =>
      api<Ladder>(`/academic/levels/${levelId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: refresh,
  });
}

/**
 * Which levels leave at the end of a year.
 *
 * A property of the year, not of the level — which is the whole point. In
 * December 2027 two cohorts sit the same examination because the country is
 * moving from a seven-year primary cycle to six, and a rule stored on the
 * level could not say that.
 */
export function useSetExitLevels(yearId: string) {
  const refresh = useRefreshSetup();
  return useMutation({
    mutationFn: (levels: readonly { level_id: string; note: string | null }[]) =>
      api<Ladder>(`/academic/years/${yearId}/exit-levels`, {
        method: 'PUT',
        body: JSON.stringify({ levels }),
      }),
    onSuccess: refresh,
  });
}

export function useAddClass() {
  const refresh = useRefreshSetup();
  return useMutation({
    mutationFn: (body: NewClass) =>
      api<ClassGroup>('/academic/class-groups', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: refresh,
  });
}

export function useUpdateClass(groupId: string) {
  const refresh = useRefreshSetup();
  return useMutation({
    mutationFn: (body: { room?: string | null; capacity?: number | null }) =>
      api<ClassGroup>(`/academic/class-groups/${groupId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: refresh,
  });
}

/**
 * Putting a teacher in front of a class is an authorisation change as much as
 * an administrative one: a class teacher may read every child in that class.
 */
export function useSetClassTeacher(groupId: string) {
  const refresh = useRefreshSetup();
  return useMutation({
    mutationFn: (teacherId: string | null) =>
      api<ClassGroup>(`/academic/class-groups/${groupId}/class-teacher`, {
        method: 'PUT',
        body: JSON.stringify({ teacher_id: teacherId }),
      }),
    onSuccess: refresh,
  });
}

export function useAddStream() {
  const refresh = useRefreshSetup();
  return useMutation({
    mutationFn: (body: NewStream) =>
      api<Stream>('/academic/streams', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: refresh,
  });
}
