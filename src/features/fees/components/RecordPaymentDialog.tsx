/**
 * Recording money a bursar has in hand.
 *
 * Phase 1 has no aggregator, so this is the only way fees get settled: somebody
 * holds an M-Pesa confirmation or a bank slip and types its receipt. Two things
 * make that safe enough to be the only path, and both are the server's: the
 * entry names its author, and the receipt is unique per school, so entering the
 * same one twice is caught rather than doubling a credit.
 *
 * The amount is pre-filled with the balance, because settling a bill in full is
 * what happens most of the time — but it is editable, and an overpayment is not
 * refused. The remainder is the family's credit and stays visible on the
 * payment rather than being quietly absorbed.
 */

import { useState } from 'react';

import { Button, Dialog, Field, Notice, Select, TextInput } from '@/components/ui';
import { PAYMENT_CHANNELS } from '@/domain/fees';
import { amount } from '@/lib/format';

import { fieldOf, messageOf, useRecordPayment } from '../hooks/useFeeActions';

export function RecordPaymentDialog({
  invoiceId,
  balance,
  open,
  onClose,
}: {
  readonly invoiceId: string;
  readonly balance: number;
  readonly open: boolean;
  readonly onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const record = useRecordPayment(invoiceId);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    record.mutate(
      {
        amount: fieldOf(form, 'amount') ?? '0',
        receipt: fieldOf(form, 'receipt') ?? '',
        channel: fieldOf(form, 'channel') ?? 'counter',
        received_on: fieldOf(form, 'received_on'),
        msisdn: fieldOf(form, 'msisdn'),
        note: fieldOf(form, 'note'),
      },
      {
        onSuccess: onClose,
        onError: (caught: unknown) =>
          setError(messageOf(caught, 'That payment did not save.')),
      },
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Record a payment"
      note="Entered against your name, and the receipt can only be used once."
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        {error ? <Notice>{error}</Notice> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Amount, TZS" hint={`Balance is ${amount(balance)}.`} required>
            <TextInput
              name="amount"
              type="number"
              inputMode="decimal"
              min="1"
              step="0.01"
              required
              autoFocus
              defaultValue={balance > 0 ? String(balance) : ''}
            />
          </Field>

          <Field
            label="Receipt number"
            hint="From the M-Pesa message or the bank slip."
            required
          >
            <TextInput name="receipt" required maxLength={64} autoComplete="off" />
          </Field>

          <Field label="How it was paid" required>
            <Select name="channel" defaultValue="mpesa" required>
              {PAYMENT_CHANNELS.map((channel) => (
                <option key={channel.value} value={channel.value}>
                  {channel.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="When" hint="Today, unless it arrived earlier.">
            <TextInput
              name="received_on"
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
          </Field>
        </div>

        <Field
          label="Phone it came from"
          hint="Optional. Recorded so the next payment from that number matches itself."
        >
          <TextInput name="msisdn" type="tel" inputMode="tel" maxLength={20} />
        </Field>

        <Field label="Note" hint="Optional. Anything the next person should know.">
          <TextInput name="note" maxLength={500} />
        </Field>

        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" busy={record.isPending}>
            Record the payment
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
