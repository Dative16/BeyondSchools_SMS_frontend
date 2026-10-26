/**
 * Transport for fees. Fetching and cache keys, no arithmetic.
 *
 * Every mutation here invalidates the whole `fees` tree rather than patching
 * a cache entry. Money is the one place where a stale figure is worse than a
 * second request: recording a payment changes the invoice, the arrears list,
 * the collection tiles and the suspense list at once, and a bursar who sees
 * one of them move and not the others starts counting by hand.
 */

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/api/client';
import type { components } from '@/api/schema';

export type InvoiceRow = components['schemas']['InvoiceRow'];
export type InvoiceDetail = components['schemas']['InvoiceDetailResponse'];
export type ArrearsRow = components['schemas']['ArrearsRow'];
export type SuspensePayment = components['schemas']['SuspensePayment'];
export type Collection = components['schemas']['CollectionResponse'];
export type FeeStructureRow = components['schemas']['FeeStructureRow'];
export type TermRun = components['schemas']['TermRunResponse'];
type InvoicePage = components['schemas']['Page_InvoiceRow_'];
type ArrearsPage = components['schemas']['Page_ArrearsRow_'];

export const PAGE = 25;

export interface InvoiceFilters {
  readonly q?: string;
  readonly termId?: string;
  readonly unpaidOnly?: boolean;
  readonly page: number;
}

export const feeKeys = {
  all: ['fees'] as const,
  invoices: (filters: InvoiceFilters) => ['fees', 'invoices', filters] as const,
  invoice: (id: string) => ['fees', 'invoice', id] as const,
  arrears: (page: number) => ['fees', 'arrears', page] as const,
  collection: ['fees', 'collection'] as const,
  structures: ['fees', 'structures'] as const,
  suspense: ['fees', 'suspense'] as const,
};

function invoiceQuery(filters: InvoiceFilters): string {
  const params = new URLSearchParams({
    page: String(filters.page),
    size: String(PAGE),
  });
  if (filters.q?.trim()) params.set('q', filters.q.trim());
  if (filters.termId) params.set('term_id', filters.termId);
  if (filters.unpaidOnly) params.set('unpaid_only', 'true');
  return params.toString();
}

export const useInvoices = (filters: InvoiceFilters) =>
  useQuery({
    queryKey: feeKeys.invoices(filters),
    queryFn: () => api<InvoicePage>(`/fees/invoices?${invoiceQuery(filters)}`),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

export const useInvoice = (invoiceId: string) =>
  useQuery({
    queryKey: feeKeys.invoice(invoiceId),
    queryFn: () => api<InvoiceDetail>(`/fees/invoices/${invoiceId}`),
    staleTime: 15_000,
  });

export const useArrears = (page: number, enabled = true) =>
  useQuery({
    queryKey: feeKeys.arrears(page),
    queryFn: () => api<ArrearsPage>(`/fees/arrears?page=${page}&size=${PAGE}`),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

export const useCollection = () =>
  useQuery({
    queryKey: feeKeys.collection,
    queryFn: () => api<Collection>('/fees/collection'),
    staleTime: 30_000,
  });

export const useStructures = (enabled: boolean) =>
  useQuery({
    queryKey: feeKeys.structures,
    queryFn: () => api<FeeStructureRow[]>('/fees/structures'),
    enabled,
    staleTime: 5 * 60_000,
  });

export const useSuspense = (enabled: boolean) =>
  useQuery({
    queryKey: feeKeys.suspense,
    queryFn: () => api<SuspensePayment[]>('/payments/suspense'),
    enabled,
    staleTime: 30_000,
  });

/** Everything money touches, because it all moves together. */
function useRefreshFees() {
  const client = useQueryClient();
  return () => void client.invalidateQueries({ queryKey: feeKeys.all });
}

export function useRecordPayment(invoiceId: string) {
  const refresh = useRefreshFees();
  return useMutation({
    mutationFn: (body: {
      amount: string;
      receipt: string;
      channel: string;
      received_on: string | null;
      msisdn: string | null;
      note: string | null;
    }) =>
      api<unknown>(`/payments/invoices/${invoiceId}/payments`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: refresh,
  });
}

export function useMatchSuspense() {
  const refresh = useRefreshFees();
  return useMutation({
    mutationFn: (vars: { paymentId: string; invoiceId: string }) =>
      api<unknown>(`/payments/${vars.paymentId}/match`, {
        method: 'POST',
        body: JSON.stringify({ invoice_id: vars.invoiceId }),
      }),
    onSuccess: refresh,
  });
}

export function useVoidInvoice(invoiceId: string) {
  const refresh = useRefreshFees();
  return useMutation({
    mutationFn: (reason: string) =>
      api<void>(`/fees/invoices/${invoiceId}/void`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    onSuccess: refresh,
  });
}

export function useCreditNote(invoiceId: string) {
  const refresh = useRefreshFees();
  return useMutation({
    mutationFn: (body: { amount: string; note: string }) =>
      api<unknown>(`/fees/invoices/${invoiceId}/credit-note`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: refresh,
  });
}

/**
 * The term run. Previewing and raising are the same call with one flag, and
 * that is the point: the preview is the run, decided and not written.
 */
export function useTermRun(termId: string) {
  const refresh = useRefreshFees();
  return useMutation({
    mutationFn: (dryRun: boolean) =>
      api<TermRun>(`/fees/terms/${termId}/run`, {
        method: 'POST',
        body: JSON.stringify({ dry_run: dryRun }),
      }),
    onSuccess: (_result, dryRun) => {
      if (!dryRun) refresh();
    },
  });
}
