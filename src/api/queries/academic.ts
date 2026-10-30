/**
 * Transport for the school's own shape: its levels and its streams.
 *
 * Separate from `school.ts`, which fetches what the shell needs on every
 * screen. These two are asked for by the screens that set a school up and by
 * the fee structure editor, and nothing else should pay for them.
 *
 * Both are cached hard. A level is created once and then lives for years, so
 * re-fetching the ladder because a dialog opened is a request a phone on a
 * weak connection can be spared.
 */

import { useQuery } from '@tanstack/react-query';

import { api } from '@/api/client';
import type { components } from '@/api/schema';

export type Level = components['schemas']['LevelResponse'];
export type Stream = components['schemas']['StreamResponse'];

export const academicKeys = {
  levels: ['academic', 'levels'] as const,
  streams: ['academic', 'streams'] as const,
};

export function useLevels(enabled = true) {
  return useQuery({
    queryKey: academicKeys.levels,
    queryFn: () => api<Level[]>('/academic/levels'),
    enabled,
    staleTime: 30 * 60_000,
  });
}

/**
 * Every stream in the school, filtered by level on the client.
 *
 * One request rather than one per level: a school has a handful of streams in
 * total, and a picker that re-fetched each time the level changed would make
 * the form stutter on exactly the connection this app is built for.
 */
export function useStreams(enabled = true) {
  return useQuery({
    queryKey: academicKeys.streams,
    queryFn: () => api<Stream[]>('/academic/streams'),
    enabled,
    staleTime: 30 * 60_000,
  });
}
