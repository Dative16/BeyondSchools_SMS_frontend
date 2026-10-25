/**
 * Transport for the public form.
 *
 * Everything here is reached by somebody with no account. A verified phone
 * number buys a session scoped to one application, which is why none of these
 * takes an id — there is nothing for a caller to change.
 *
 * `save` is a mutation rather than a query because it is called as the parent
 * types, and it answers with the whole form state: the checklist on screen
 * updates from the same response that stored the change, so the two cannot
 * disagree.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, setAccessToken } from '@/api/client';
import type { components } from '@/api/schema';

export type ApplyOptions = components['schemas']['ApplyOptionsResponse'];
export type ApplyState = components['schemas']['ApplyStateResponse'];
export type ApplySave = components['schemas']['ApplySaveRequest'];
type OtpSent = components['schemas']['ApplySentResponse'];
type Token = components['schemas']['TokenResponse'];
type Ticket = components['schemas']['UploadTicketResponse'];

export const applyKeys = {
  options: ['apply', 'options'] as const,
  me: ['apply', 'me'] as const,
};

/** The school's name, its levels, and what it asks for. No account needed. */
export const useApplyOptions = () =>
  useQuery({
    queryKey: applyKeys.options,
    queryFn: () => api<ApplyOptions>('/apply/options'),
    staleTime: 10 * 60_000,
    retry: false,
  });

export const useMyApplication = (enabled: boolean) =>
  useQuery({
    queryKey: applyKeys.me,
    queryFn: () => api<ApplyState>('/apply/me'),
    enabled,
    staleTime: 0,
  });

export const sendCode = (phone: string): Promise<OtpSent> =>
  api<OtpSent>('/apply/start', { method: 'POST', body: JSON.stringify({ phone }) });

/**
 * Verify the code and start or resume the form.
 *
 * The token goes into the API client the same way a staff sign-in does, and
 * the refresh cookie comes with it — which is what lets a parent close the
 * browser on a bus and come back to the same half-filled form.
 */
export async function verifyCode(phone: string, code: string): Promise<Token> {
  const token = await api<Token>('/apply/verify', {
    method: 'POST',
    body: JSON.stringify({ phone, code }),
  });
  setAccessToken(token.access_token);
  return token;
}

/**
 * Is there already a form open on this device?
 *
 * A parent who filled in half of it last night has an httpOnly refresh cookie
 * and no access token — the token lives in memory and died with the tab. One
 * request for the form is enough to find out: if the cookie is still good the
 * client renews behind it and this succeeds, and if it is not, this is a
 * stranger who needs to verify a number.
 *
 * Failing is the ordinary case for a first visit, not an error.
 */
export async function tryResume(): Promise<ApplyState | null> {
  try {
    return await api<ApplyState>('/apply/me');
  } catch {
    return null;
  }
}

export function useSaveProgress() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (changes: ApplySave) =>
      api<ApplyState>('/apply/me', { method: 'PATCH', body: JSON.stringify(changes) }),
    // The response is the whole state, so it replaces the cache rather than
    // invalidating it: one request, and nothing refetches behind the parent.
    onSuccess: (state) => client.setQueryData(applyKeys.me, state),
  });
}

export function useSubmit() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api<ApplyState>('/apply/me/submit', { method: 'POST' }),
    onSuccess: (state) => client.setQueryData(applyKeys.me, state),
  });
}

/**
 * The two-step upload: ask for a URL, PUT the file straight to storage, then
 * confirm. The bytes never pass through the API.
 */
export function useAttachDocument() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ kind, file }: { kind: string; file: File }) => {
      const ticket = await api<Ticket>('/apply/me/documents/upload-url', {
        method: 'POST',
        body: JSON.stringify({
          kind,
          content_type: file.type,
          size_bytes: file.size,
        }),
      });

      const put = await fetch(ticket.url, {
        method: 'PUT',
        body: file,
        headers: ticket.headers,
      });
      if (!put.ok) throw new Error('The photo did not upload. Try again.');

      return api<ApplyState>('/apply/me/documents', {
        method: 'POST',
        body: JSON.stringify({
          kind,
          object_key: ticket.object_key,
          file_name: file.name,
        }),
      });
    },
    onSuccess: (state) => client.setQueryData(applyKeys.me, state),
  });
}
