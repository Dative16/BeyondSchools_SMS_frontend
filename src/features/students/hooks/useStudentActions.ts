/**
 * The two mutations behind the profile header.
 *
 * Here rather than in the component, because a feature's components may not
 * reach `@/api/client` at all — a component that fetches can only be tested by
 * rendering it, and these two are the ones most worth testing without a DOM.
 * Turning a failure into a sentence belongs here for the same reason.
 *
 * Both invalidate the roll as well as the profile. The roll carries the name,
 * the class and the status, so a rename that left it alone would show one
 * child under two names until something else happened to refresh it.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ApiError, api } from '@/api/client';
import { studentKeys } from '@/api/queries/student';

/**
 * What to put on screen when a mutation fails.
 *
 * The server's own sentence when it gave one — it knows why, and "that child
 * already has an open enrolment" is worth more than anything written here.
 * The fallback covers a network that simply went away.
 */
export const messageOf = (caught: unknown, fallback: string): string =>
  caught instanceof ApiError ? caught.detail : fallback;

export type EditableStudent = Partial<{
  first_name: string | null;
  middle_name: string | null;
  surname: string | null;
  date_of_birth: string | null;
  sex: string | null;
  nationality: string | null;
  birth_certificate_no: string | null;
  previous_school: string | null;
  special_needs: string | null;
}>;

function useRefreshStudent(studentId: string) {
  const client = useQueryClient();
  return () => {
    void client.invalidateQueries({ queryKey: studentKeys.profile(studentId) });
    void client.invalidateQueries({ queryKey: ['students'] });
  };
}

export function useEditStudent(studentId: string, onDone: () => void) {
  const refresh = useRefreshStudent(studentId);
  return useMutation({
    mutationFn: (body: EditableStudent) =>
      api<unknown>(`/students/${studentId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      refresh();
      onDone();
    },
  });
}

export function useTransferOut(studentId: string, onDone: () => void) {
  const refresh = useRefreshStudent(studentId);
  return useMutation({
    mutationFn: (body: { reason: string; on: string | null }) =>
      api<unknown>(`/students/${studentId}/transfer-out`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      refresh();
      onDone();
    },
  });
}

/**
 * One field out of a form, trimmed, with empty meaning "not set".
 *
 * `FormData.get` can return a File, and stringifying one gives "[object File]"
 * — which would be saved as a child's middle name without anything
 * complaining about it.
 */
export function fieldOf(form: FormData, key: string): string | null {
  const raw = form.get(key);
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed === '' ? null : trimmed;
}
