/**
 * The seam between transport and rules.
 *
 * A feature hook is allowed to touch both: it fetches with a query hook, runs
 * the facts through @/domain, and hands a component a view model it can render
 * without deciding anything. Components below this line contain no `if` that
 * encodes a school rule.
 */

import { useMemo } from 'react';

import { useInvoice } from '@/api/queries/invoices';
import { arrearsBucket, balanceOf, canAcceptPayment, daysOverdue, feeState } from '@/domain/fees';

export function useInvoiceView(invoiceId: string, asOf: Date = new Date()) {
  const query = useInvoice(invoiceId);

  const view = useMemo(() => {
    if (!query.data) return null;
    const facts = query.data;
    const overdue = daysOverdue(facts, asOf);
    return {
      ...facts,
      balance: balanceOf(facts),
      state: feeState(facts, asOf),
      daysOverdue: overdue,
      bucket: arrearsBucket(overdue),
      payable: canAcceptPayment(facts),
    };
  }, [query.data, asOf]);

  return { ...query, view };
}
