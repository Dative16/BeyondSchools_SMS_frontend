/**
 * Voiding a bill that should never have been raised.
 *
 * Voided, not deleted. A bill a parent has already seen has to stay visible,
 * with a reason — "that invoice was cancelled because it was raised against
 * the wrong term" is an answer, and a bill that silently disappeared is not.
 *
 * The button only appears when nothing has been paid, and the server refuses
 * it anyway: a payment attached to a bill that officially does not exist is
 * worse than the mistake it was meant to fix.
 */

import { useState } from 'react';

import { Button, Dialog, Field, Notice, TextInput } from '@/components/ui';

import { fieldOf, messageOf, useVoidInvoice } from '../hooks/useFeeActions';

export function VoidDialog({
  invoiceId,
  reference,
  open,
  onClose,
}: {
  readonly invoiceId: string;
  readonly reference: string;
  readonly open: boolean;
  readonly onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const voidIt = useVoidInvoice(invoiceId);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    voidIt.mutate(fieldOf(form, 'reason') ?? '', {
      onSuccess: onClose,
      onError: (caught: unknown) => setError(messageOf(caught, 'That did not go through.')),
    });
  }

  return (
    <Dialog open={open} onClose={onClose} title={`Void ${reference}`}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        {error ? <Notice>{error}</Notice> : null}

        <Notice tone="warn">
          The bill stays on the child&rsquo;s statement with your reason against it, and
          counts for nothing from now on. Nothing is deleted.
        </Notice>

        <Field
          label="Why should it not have been raised?"
          hint="A parent may have already seen this bill. This is what they are told."
          required
        >
          <TextInput
            name="reason"
            required
            minLength={3}
            maxLength={500}
            autoFocus
            placeholder="Raised against the wrong term"
          />
        </Field>

        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="danger" busy={voidIt.isPending}>
            Void this bill
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
