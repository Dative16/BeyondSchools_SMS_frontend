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

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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

// ---------------------------------------------------------------------------
// The profile panels
// ---------------------------------------------------------------------------

export type StudentDocument = components['schemas']['DocumentResponse'];
export type UploadTicket = components['schemas']['UploadTicketResponse'];
export type Health = components['schemas']['HealthResponse'];
export type EmergencyContact = components['schemas']['EmergencyContactModel'];
export type GuardianOnStudent = components['schemas']['GuardianOnStudent'];

/** Everything about one child moves together, so it is invalidated together. */
function useRefreshStudent(studentId: string) {
  const client = useQueryClient();
  return () => {
    // Every key under this child, which is what the prefix matches.
    void client.invalidateQueries({ queryKey: ['student', studentId] });
    void client.invalidateQueries({ queryKey: ['students'] });
  };
}

export const useDocuments = (studentId: string, enabled: boolean) =>
  useQuery({
    queryKey: ['student', studentId, 'documents'],
    queryFn: () => api<StudentDocument[]>(`/students/${studentId}/documents`),
    enabled,
    staleTime: 60_000,
  });

/**
 * Attaching a document, in three steps and for a good reason.
 *
 * The file goes from the browser straight to object storage with a presigned
 * ticket, and only then is the record written. The API never holds the bytes:
 * a birth certificate passing through an application server is a birth
 * certificate in that server's logs, its memory and its crash dumps.
 */
export function useAttachDocument(studentId: string) {
  const refresh = useRefreshStudent(studentId);
  return useMutation({
    mutationFn: async (vars: { kind: string; file: File; note: string | null }) => {
      const ticket = await api<UploadTicket>(`/students/${studentId}/documents/upload-url`, {
        method: 'POST',
        body: JSON.stringify({
          kind: vars.kind,
          content_type: vars.file.type || 'application/octet-stream',
          size_bytes: vars.file.size,
        }),
      });

      // Straight to storage, not through `api`: this request carries no
      // session token and must not have one attached to it.
      const put = await fetch(ticket.url, {
        method: 'PUT',
        body: vars.file,
        headers: ticket.headers as Record<string, string>,
      });
      if (!put.ok) {
        throw new Error(
          'The upload did not reach storage. Check the connection and try again — nothing has been recorded.',
        );
      }

      return api<StudentDocument>(`/students/${studentId}/documents`, {
        method: 'POST',
        body: JSON.stringify({
          kind: vars.kind,
          object_key: ticket.object_key,
          file_name: vars.file.name,
          note: vars.note,
        }),
      });
    },
    onSuccess: refresh,
  });
}

/**
 * A short-lived link to one document.
 *
 * Fetched on demand and never cached: these are children's birth certificates
 * in a private bucket, and a URL that outlives the click is a URL that ends up
 * pasted into a chat.
 */
export const readDocumentUrl = (studentId: string, documentId: string) =>
  api<{ url: string; expires_in: number }>(
    `/students/${studentId}/documents/${documentId}/url`,
  );

export const useHealth = (studentId: string, enabled: boolean) =>
  useQuery({
    queryKey: ['student', studentId, 'health'],
    queryFn: () => api<Health | null>(`/students/${studentId}/health`),
    enabled,
    staleTime: 60_000,
  });

export function useSaveHealth(studentId: string) {
  const refresh = useRefreshStudent(studentId);
  return useMutation({
    mutationFn: (body: components['schemas']['HealthUpdateRequest']) =>
      api<Health>(`/students/${studentId}/health`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    onSuccess: refresh,
  });
}

export const useEmergencyContacts = (studentId: string, enabled: boolean) =>
  useQuery({
    queryKey: ['student', studentId, 'contacts'],
    queryFn: () => api<EmergencyContact[]>(`/students/${studentId}/emergency-contacts`),
    enabled,
    staleTime: 60_000,
  });

/** Replaces the whole list, which is what the endpoint does. */
export function useSaveEmergencyContacts(studentId: string) {
  const refresh = useRefreshStudent(studentId);
  return useMutation({
    mutationFn: (contacts: readonly EmergencyContact[]) =>
      api<EmergencyContact[]>(`/students/${studentId}/emergency-contacts`, {
        method: 'PUT',
        body: JSON.stringify({ contacts }),
      }),
    onSuccess: refresh,
  });
}

export function useSaveFieldValues(studentId: string) {
  const refresh = useRefreshStudent(studentId);
  return useMutation({
    mutationFn: (values: Record<string, string | null>) =>
      api<unknown>(`/students/${studentId}/fields`, {
        method: 'PUT',
        body: JSON.stringify({ values }),
      }),
    onSuccess: refresh,
  });
}

export function useLinkGuardian(studentId: string) {
  const refresh = useRefreshStudent(studentId);
  return useMutation({
    mutationFn: (body: components['schemas']['GuardianLinkRequest']) =>
      api<components['schemas']['GuardianLinkedResponse']>(
        `/students/${studentId}/guardians`,
        { method: 'POST', body: JSON.stringify(body) },
      ),
    onSuccess: refresh,
  });
}

export function useUnlinkGuardian(studentId: string) {
  const refresh = useRefreshStudent(studentId);
  return useMutation({
    mutationFn: (guardianId: string) =>
      api<void>(`/students/${studentId}/guardians/${guardianId}`, { method: 'DELETE' }),
    onSuccess: refresh,
  });
}

/**
 * Moving a child between classes, or on and off the bus.
 *
 * All of it is a fact about this year, so it is written to the enrolment
 * rather than to the child. Last year's row is untouched, which is what a
 * closed year means.
 */
export function useChangeEnrolment(studentId: string, enrolmentId: string) {
  const refresh = useRefreshStudent(studentId);
  return useMutation({
    mutationFn: (body: components['schemas']['EnrolmentUpdateRequest']) =>
      api<unknown>(`/enrolments/${enrolmentId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: refresh,
  });
}
