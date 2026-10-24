/**
 * Transport for invoices. Fetching and cache keys, nothing else.
 *
 * Note what is absent: no balance arithmetic, no overdue check, no decision
 * about whether a pay button shows. Those are rules, they live in @/domain, and
 * a query file that starts making them is the beginning of logic scattered
 * across three layers.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/api/client';

export interface InvoiceDto {
  id: string;
  reference: string;
  studentId: string;
  studentName: string;
  className: string;
  termLabel: string;
  billed: number;
  settled: number;
  dueDate: string;
  isVoid: boolean;
  lines: ReadonlyArray<{ item: string; amount: number }>;
}

export const invoiceKeys = {
  all: ['invoices'] as const,
  list: (filters: Record<string, string>) => [...invoiceKeys.all, 'list', filters] as const,
  detail: (id: string) => [...invoiceKeys.all, 'detail', id] as const,
};

export function useInvoice(id: string) {
  return useQuery({
    queryKey: invoiceKeys.detail(id),
    queryFn: () => api<InvoiceDto>(`/fees/invoices/${id}`),
  });
}

export function useInvoices(filters: Record<string, string> = {}) {
  return useQuery({
    queryKey: invoiceKeys.list(filters),
    queryFn: () => api<InvoiceDto[]>(`/fees/invoices?${new URLSearchParams(filters)}`),
  });
}

/** Matching a suspense payment is a server decision; the UI only asks for it. */
export function useMatchSuspensePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { paymentId: string; invoiceId: string }) =>
      api<{ ok: true }>(`/payments/${vars.paymentId}/match`, {
        method: 'POST',
        body: JSON.stringify({ invoice_id: vars.invoiceId }),
      }),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: invoiceKeys.detail(vars.invoiceId) });
    },
  });
}
