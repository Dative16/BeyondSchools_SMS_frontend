/**
 * Raising a term's invoices.
 *
 * Two buttons for one call, and the difference between them is a flag. The
 * preview *is* the run: the same decisions, taken and not written. That is
 * what makes it worth looking at, and it is how a bursar finds out that
 * Standard 6's structure is still a draft before thirty-eight invoices go out
 * rather than after.
 *
 * Raising is behind the preview on purpose. A run over 500 children is not
 * something to start by accident, so the second button only appears once the
 * first has been pressed and its answer is on screen.
 *
 * Running it twice is safe and says so. A child who already has an invoice for
 * the term is skipped — an interrupted run is recovered by running it again,
 * not by working out where it stopped.
 */

import { useState } from 'react';

import type { TermRun } from '@/api/queries/fees';
import { Button, Card, Notice } from '@/components/ui';
import { amount } from '@/lib/format';

import { messageOf, useTermRun } from '../hooks/useFeeActions';

export function TermRunPanel({
  termId,
  termLabel,
}: {
  readonly termId: string;
  readonly termLabel: string;
}) {
  const [preview, setPreview] = useState<TermRun | null>(null);
  const [done, setDone] = useState<TermRun | null>(null);
  const [error, setError] = useState<string | null>(null);
  const run = useTermRun(termId);

  function go(dryRun: boolean) {
    setError(null);
    run.mutate(dryRun, {
      onSuccess: (result) => (dryRun ? setPreview(result) : (setDone(result), setPreview(null))),
      onError: (caught: unknown) => setError(messageOf(caught, 'The run did not start.')),
    });
  }

  return (
    <Card className="mb-4.5">
      <div className="flex flex-wrap items-start justify-between gap-3.5">
        <div className="min-w-0">
          <h2 className="m-0 mb-1 font-display text-[15px] font-semibold">
            Raise {termLabel} invoices
          </h2>
          <p className="m-0 max-w-[62ch] text-[12.5px] leading-relaxed text-muted">
            Look first. The preview takes every decision the run would take and writes
            nothing, including naming any class whose fee structure is still a draft.
          </p>
        </div>
        <div className="flex flex-none flex-wrap gap-2.5">
          <Button size="sm" busy={run.isPending && !done} onClick={() => go(true)}>
            Preview the run
          </Button>
          {preview && preview.raised > 0 ? (
            <Button size="sm" variant="primary" busy={run.isPending} onClick={() => go(false)}>
              Raise {preview.raised} {preview.raised === 1 ? 'invoice' : 'invoices'}
            </Button>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="mt-3.5">
          <Notice>{error}</Notice>
        </div>
      ) : null}

      {done ? (
        <div className="mt-3.5">
          <Notice tone="ok">
            Raised {done.raised} {done.raised === 1 ? 'invoice' : 'invoices'} for{' '}
            {amount(Number(done.total_billed))} TZS.
            {done.skipped > 0
              ? ` ${done.skipped} ${
                  done.skipped === 1 ? 'child was' : 'children were'
                } skipped — they already had a bill for this term.`
              : null}
          </Notice>
        </div>
      ) : null}

      {preview ? <Preview result={preview} /> : null}
    </Card>
  );
}

function Preview({ result }: { readonly result: TermRun }) {
  const nothing = result.raised === 0 && result.problems.length === 0;

  return (
    <div className="mt-3.5 flex flex-col gap-3">
      {nothing ? (
        <Notice tone="info">
          Nothing to raise. Every child on the roll already has a bill for this term, which
          means running it again is safe and would do nothing.
        </Notice>
      ) : (
        <div className="flex flex-wrap gap-5 rounded-[10px] border border-line bg-canvas p-[13px_15px]">
          <Figure label="Would raise" value={String(result.raised)} />
          <Figure label="Worth" value={`${amount(Number(result.total_billed))} TZS`} />
          <Figure
            label="Already billed"
            value={String(result.skipped)}
            note={result.skipped > 0 ? 'skipped, not billed twice' : undefined}
          />
        </div>
      )}

      {result.problems.length > 0 ? (
        <Notice tone="warn">
          <span className="font-semibold">
            {result.problems.length}{' '}
            {result.problems.length === 1 ? 'child cannot' : 'children cannot'} be billed.
          </span>{' '}
          {result.problems[0]?.reason}. Publish the structure for that class and preview
          again — raising now would leave them out.
        </Notice>
      ) : null}
    </div>
  );
}

function Figure({
  label,
  value,
  note,
}: {
  readonly label: string;
  readonly value: string;
  readonly note?: string;
}) {
  return (
    <div>
      <p className="m-0 mb-0.5 text-xs font-medium text-muted">{label}</p>
      <p className="m-0 font-display text-lg font-semibold">{value}</p>
      {note ? <p className="m-0 text-[11.5px] text-muted">{note}</p> : null}
    </div>
  );
}
