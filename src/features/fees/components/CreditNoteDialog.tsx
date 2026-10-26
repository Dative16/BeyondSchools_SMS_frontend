/**
 * Taking something off a bill without rewriting it.
 *
 * Another line, never an edit. The original charge stays exactly as it was, so
 * the bill a parent photographed in January and the bill the school holds in
 * March are one document — which is the whole reason a credit note exists
 * rather than a correction.
 *
 * Used when voiding is refused: money has been paid, the bill was right at the
 * time, and something has to come off it now.
 */

import { useState } from 'react';

import { Button, Dialog, Field, Notice, TextInput } from '@/components/ui';
import { amount } from '@/lib/format';

import { fieldOf, messageOf, useCreditNote } from '../hooks/useFeeActions';

export function CreditNoteDialog({
  invoiceId,
  billed,
  open,
  onClose,
}: {
  readonly invoiceId: string;
  readonly billed: number;
  readonly open: boolean;
  readonly onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const credit = useCreditNote(invoiceId);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    credit.mutate(
      { amount: fieldOf(form, 'amount') ?? '0', note: fieldOf(form, 'note') ?? '' },
      {
        onSuccess: onClose,
        onError: (caught: unknown) =>
          setError(messageOf(caught, 'That credit note did not save.')),
      },
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Write a credit note"
      note="A new line on the bill. The original charge is not touched."
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        {error ? <Notice>{error}</Notice> : null}

        <Field
          label="How much to take off, TZS"
          hint={`This bill is ${amount(billed)}. A credit note cannot be more than that.`}
          required
        >
          <TextInput
            name="amount"
            type="number"
            inputMode="decimal"
            min="1"
            max={String(billed)}
            step="0.01"
            required
            autoFocus
          />
        </Field>

        <Field
          label="Why"
          hint="It appears on the bill, so write it for the family to read."
          required
        >
          <TextInput
            name="note"
            required
            minLength={3}
            maxLength={120}
            placeholder="Sibling discount applied late"
          />
        </Field>

        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" busy={credit.isPending}>
            Add the credit note
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
