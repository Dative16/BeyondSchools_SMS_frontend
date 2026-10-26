/**
 * Money that arrived with nothing to credit.
 *
 * The artboard's version is close to right and one thing is deliberately
 * different. It says "the amount equals this invoice's balance exactly, and
 * the number is not on any guardian record", which reads as the system having
 * worked out where the money belongs. It has not, and it must not: nothing
 * picks between two siblings with open balances, because the wrong choice
 * takes an afternoon to unpick and a parent's phone call to discover.
 *
 * So the card says what it knows — the amount, the number it came from, the
 * reference, when — and points out an exact match as a hint rather than a
 * conclusion. A bursar decides, and the entry records that they did.
 */

import { useState } from 'react';

import type { SuspensePayment } from '@/api/queries/fees';
import { Button, Card, Notice } from '@/components/ui';
import { channelName } from '@/domain/fees';
import { amount, longDate, msisdn } from '@/lib/format';

import { messageOf, useMatchSuspense } from '../hooks/useFeeActions';

export function SuspenseCard({
  payments,
  loading,
  invoiceId,
  invoiceReference,
  balance,
  canMatch,
}: {
  readonly payments: readonly SuspensePayment[];
  readonly loading: boolean;
  readonly invoiceId: string;
  readonly invoiceReference: string;
  readonly balance: number;
  readonly canMatch: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const match = useMatchSuspense();

  if (loading || payments.length === 0) return null;

  return (
    <Card className="!border-bad-ink/40">
      <div className="mb-2.5 flex items-center gap-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-bad-ink" aria-hidden="true" />
        <h2 className="m-0 font-display text-[15px] font-semibold">
          Suspense account
          <span className="ml-2 text-xs font-medium text-muted">
            {payments.length} waiting
          </span>
        </h2>
      </div>

      <p className="m-0 mb-3.5 text-[12.5px] leading-relaxed text-ink-dim">
        Money arrived with no invoice to credit. It sits here until somebody matches it, and
        it never changes a balance on its own.
      </p>

      {error ? (
        <div className="mb-3">
          <Notice>{error}</Notice>
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        {payments.map((payment) => {
          const exact = Number(payment.amount) === balance && balance > 0;
          return (
            <div key={payment.id} className="rounded-[10px] border border-line p-[13px_14px]">
              <p className="m-0 mb-1.5 font-display text-[19px] font-semibold">
                {amount(Number(payment.amount))}{' '}
                <span className="text-[13px] font-medium text-muted">TZS</span>
              </p>
              <p className="m-0 mb-0.5 text-[12.5px] text-ink-dim">
                {longDate(payment.received_at)} · {channelName(payment.channel)}
              </p>
              {payment.msisdn ? (
                <p className="m-0 mb-0.5 text-[12.5px] text-ink-dim">
                  From {msisdn(payment.msisdn)}
                </p>
              ) : null}
              <p className="m-0 text-[12.5px] text-muted">
                ref {payment.external_ref.replace(/^MOCK-/, '')}
              </p>

              {exact ? (
                <p className="mt-2.5 mb-0 text-[12.5px] leading-relaxed text-warn-ink">
                  This is exactly the balance of {invoiceReference}. That is worth noticing
                  and is not proof — check the number against the family first.
                </p>
              ) : null}

              <Button
                variant="primary"
                size="sm"
                className="mt-3 w-full"
                disabled={!canMatch}
                busy={match.isPending}
                onClick={() => {
                  setError(null);
                  match.mutate(
                    { paymentId: payment.id, invoiceId },
                    {
                      onError: (caught: unknown) =>
                        setError(messageOf(caught, 'That did not go through.')),
                    },
                  );
                }}
              >
                Match to this invoice
              </Button>
            </div>
          );
        })}
      </div>

      {!canMatch ? (
        <p className="mt-3 mb-0 text-[12.5px] leading-relaxed text-muted">
          This bill has nothing outstanding, so there is nothing here to credit to it.
        </p>
      ) : null}
    </Card>
  );
}
