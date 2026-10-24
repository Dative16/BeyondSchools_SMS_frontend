/**
 * Transport for the things the shell itself needs: which school, which term,
 * and how many applications are waiting.
 *
 * All three are typed off the server's generated schema rather than a DTO
 * written by hand here. That matters more than it looks: the API sends money as
 * a decimal string and dates as ISO strings, and a hand-written interface that
 * says `number` compiles happily and is wrong at runtime.
 */

import { useQuery } from '@tanstack/react-query';

import { api } from '@/api/client';
import type { components } from '@/api/schema';

type School = components['schemas']['SchoolResponse'];
type AcademicYear = components['schemas']['AcademicYearResponse'];
type Term = components['schemas']['TermResponse'];
type Queue = components['schemas']['Page_QueueRowResponse_'];

export const schoolKeys = {
  profile: ['school', 'profile'] as const,
  years: ['school', 'years'] as const,
  terms: (yearId: string) => ['school', 'terms', yearId] as const,
  waiting: ['admissions', 'waiting'] as const,
};

/** A school's own details change about once a year, so they are cached hard. */
export function useSchool() {
  return useQuery({
    queryKey: schoolKeys.profile,
    queryFn: () => api<School>('/schools/me'),
    staleTime: 30 * 60_000,
  });
}

/**
 * The term the school is in, resolved in two hops.
 *
 * There is no single endpoint for it, and inventing one on the server to save a
 * request here would have put a presentation concern into the API. Both
 * responses are small and both are cached for half an hour.
 */
export function useCurrentTerm() {
  const years = useQuery({
    queryKey: schoolKeys.years,
    queryFn: () => api<AcademicYear[]>('/academic/years'),
    staleTime: 30 * 60_000,
  });

  const currentYear = years.data?.find((year) => year.is_current);

  const terms = useQuery({
    queryKey: schoolKeys.terms(currentYear?.id ?? 'none'),
    queryFn: () => api<Term[]>(`/academic/years/${currentYear?.id}/terms`),
    enabled: Boolean(currentYear),
    staleTime: 30 * 60_000,
  });

  const currentTerm = terms.data?.find((term) => term.is_current);

  return {
    year: currentYear,
    term: currentTerm,
    /** "Term 1, 2027" — what the design puts in the top bar. */
    label: currentTerm && currentYear ? `${currentTerm.label}, ${currentYear.label}` : undefined,
    isLoading: years.isLoading || terms.isLoading,
  };
}

/**
 * How many applications are sitting unreviewed, for the badge on the nav.
 *
 * Asks for one row and reads the total — the count is the only part used, and
 * fetching a page of twenty-five to discard twenty-four of them on a phone
 * connection is not free.
 */
export function useWaitingApplications(enabled: boolean) {
  return useQuery({
    queryKey: schoolKeys.waiting,
    queryFn: () => api<Queue>('/admissions?state=submitted&size=1'),
    enabled,
    staleTime: 60_000,
    select: (page) => page.total,
  });
}
