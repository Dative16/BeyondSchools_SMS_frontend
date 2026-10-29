/**
 * The one thing a registrar can do next.
 *
 * Exactly one card is shown at a time, and which one depends on where the
 * application stands. The step between "offered" and "enrolled" is the one
 * worth reading twice: it is a receipt, not an approval. A place is accepted
 * when the deposit is on the ledger, so there is no accept button anywhere in
 * this app — and the card says so, because every other school system has one
 * and somebody will go looking.
 *
 * Declining sits at the bottom, plain and in red text rather than a red fill.
 * It tells a family no, and it should not be adjacent in weight to the button
 * that tells them yes.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';

import type { ApplicationDetail } from '@/api/queries/admissions';
import { useClassGroups } from '@/api/queries/students';
import { Button, Card, CardHeader, Field, Notice, Select, TextInput } from '@/components/ui';
import type { Actions } from '@/domain/admissions';
import { PAYMENT_CHANNELS } from '@/domain/fees';
import { amount } from '@/lib/format';

import {
  fieldOf,
  messageOf,
  useDecline,
  useEnrol,
  useOffer,
  useRecordDeposit,
  useScreen,
} from '../hooks/useApplicationActions';

export function ApplicationActions({
  applicationId,
  detail,
  actions,
}: {
  readonly applicationId: string;
  readonly detail: ApplicationDetail;
  readonly actions: Actions;
}) {
  const [error, setError] = useState<string | null>(null);
  const fail = (fallback: string) => ({
    onError: (caught: unknown) => setError(messageOf(caught, fallback)),
  });

  return (
    <>
      {error ? <Notice>{error}</Notice> : null}

      {actions.canScreen ? (
        <ScreenCard id={applicationId} onFail={fail} clear={() => setError(null)} />
      ) : null}

      {actions.canOffer ? (
        <OfferCard
          id={applicationId}
          level={detail.level_name}
          onFail={fail}
          clear={() => setError(null)}
        />
      ) : null}

      {actions.canRecordDeposit ? (
        <DepositCard
          id={applicationId}
          due={detail.deposit_billed}
          onFail={fail}
          clear={() => setError(null)}
        />
      ) : null}

      {actions.canEnrol ? (
        <EnrolCard
          id={applicationId}
          settled={detail.deposit_settled}
          onFail={fail}
          clear={() => setError(null)}
        />
      ) : null}

      {detail.application.state === 'enrolled' ? (
        <Card>
          <CardHeader title="Enrolled" />
          <p className="m-0 mb-3 text-[12.5px] leading-relaxed text-muted">
            Admission number {detail.application.admission_no ?? 'issued'}. The guardian can
            sign in with the phone number they verified.
          </p>
          <Link
            to="/students"
            className="flex min-h-11 items-center justify-center rounded-control border border-line bg-white text-sm font-semibold text-ink no-underline hover:bg-canvas"
          >
            Find the pupil record
          </Link>
        </Card>
      ) : null}

      {actions.canDecline ? (
        <DeclineCard id={applicationId} onFail={fail} clear={() => setError(null)} />
      ) : null}
    </>
  );
}

type Fail = (fallback: string) => { onError: (caught: unknown) => void };
interface CardProps {
  readonly id: string;
  readonly onFail: Fail;
  readonly clear: () => void;
}

function ScreenCard({ id, onFail, clear }: CardProps) {
  const screen = useScreen(id);
  return (
    <Card>
      <CardHeader title="Screen this application" />
      <p className="m-0 mb-3.5 text-[12.5px] leading-relaxed text-muted">
        Confirm the documents are readable and the duplicate check has been dealt with.
        Screening promises the family nothing.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          clear();
          const form = new FormData(event.currentTarget);
          screen.mutate(
            { note: fieldOf(form, 'note') },
            onFail('That did not go through.'),
          );
        }}
        className="flex flex-col gap-3.5"
      >
        <Field label="Note" hint="Optional. What you checked, for whoever reads this next.">
          <TextInput name="note" maxLength={500} />
        </Field>
        <Button type="submit" variant="primary" busy={screen.isPending} className="w-full">
          Mark as screened
        </Button>
      </form>
    </Card>
  );
}

function OfferCard({
  id,
  level,
  onFail,
  clear,
}: CardProps & { readonly level: string | null }) {
  const offer = useOffer(id);
  return (
    <Card>
      <CardHeader title="Offer a place" />
      <p className="m-0 mb-3.5 text-[12.5px] leading-relaxed text-muted">
        Issues an admission number and raises the first invoice with a deposit line. It does
        not enrol the child, and it does not take the place off anybody else.
      </p>
      <Button
        variant="primary"
        busy={offer.isPending}
        className="w-full"
        onClick={() => {
          clear();
          offer.mutate({}, onFail('The offer did not go out.'));
        }}
      >
        Offer a place{level ? ` in ${level}` : ''}
      </Button>
    </Card>
  );
}

function DepositCard({
  id,
  due,
  onFail,
  clear,
}: CardProps & { readonly due: string | null }) {
  const deposit = useRecordDeposit(id);
  return (
    <Card>
      <CardHeader title="Record the deposit" />
      <p className="m-0 mb-3.5 text-[12.5px] leading-relaxed text-muted">
        There is no accept button. The place is accepted when the deposit is on the ledger,
        so this is a money entry: type what was actually received.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          clear();
          const form = new FormData(event.currentTarget);
          deposit.mutate(
            {
              amount: fieldOf(form, 'amount') ?? '0',
              receipt: fieldOf(form, 'receipt') ?? '',
              channel: fieldOf(form, 'channel') ?? 'counter',
              received_on: fieldOf(form, 'received_on'),
              note: fieldOf(form, 'note'),
            },
            onFail('That receipt did not save.'),
          );
        }}
        className="flex flex-col gap-3.5"
      >
        <Field
          label="Amount received, TZS"
          hint={due ? `Deposit on the offer: ${amount(Number(due))}.` : undefined}
          required
        >
          <TextInput
            name="amount"
            type="number"
            inputMode="decimal"
            min="1"
            step="0.01"
            required
            defaultValue={due ? String(Number(due)) : ''}
          />
        </Field>

        <Field label="Receipt number" hint="From the school receipt book." required>
          <TextInput name="receipt" required maxLength={64} autoComplete="off" />
        </Field>

        <Field label="Received as" required>
          <Select name="channel" defaultValue="counter" required>
            {PAYMENT_CHANNELS.map((channel) => (
              <option key={channel.value} value={channel.value}>
                {channel.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Date received">
          <TextInput
            name="received_on"
            type="date"
            max={new Date().toISOString().slice(0, 10)}
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </Field>

        <Button type="submit" variant="primary" busy={deposit.isPending} className="w-full">
          Record this receipt
        </Button>
        <p className="m-0 text-[11.5px] leading-relaxed text-muted">
          Your name and the time are stored against the entry and cannot be edited
          afterwards.
        </p>
      </form>
    </Card>
  );
}

function EnrolCard({
  id,
  settled,
  onFail,
  clear,
}: CardProps & { readonly settled: string | null }) {
  const enrol = useEnrol(id);
  const classes = useClassGroups();

  return (
    <Card>
      <CardHeader title="Deposit received, place accepted" />
      <p className="m-0 mb-3.5 text-[12.5px] leading-relaxed text-muted">
        {settled ? `${amount(Number(settled))} is on the ledger. ` : null}
        Enrolling creates the pupil record, the guardian link and this year&rsquo;s
        enrolment, in one go.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          clear();
          const form = new FormData(event.currentTarget);
          const classGroupId = fieldOf(form, 'class_group_id');
          if (!classGroupId) return;
          enrol.mutate(
            { class_group_id: classGroupId, residency: fieldOf(form, 'residency') ?? 'day' },
            onFail('The enrolment did not go through.'),
          );
        }}
        className="flex flex-col gap-3.5"
      >
        <Field label="Which class" required>
          <Select name="class_group_id" required defaultValue="">
            <option value="" disabled>
              Choose a class
            </option>
            {(classes.data ?? []).map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
                {group.pupils ? ` — ${group.pupils} already` : ''}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Day or boarding">
          <Select name="residency" defaultValue="day">
            <option value="day">Day</option>
            <option value="boarder">Boarder</option>
          </Select>
        </Field>

        <Button type="submit" variant="primary" busy={enrol.isPending} className="w-full">
          Enrol this child
        </Button>
      </form>
    </Card>
  );
}

function DeclineCard({ id, onFail, clear }: CardProps) {
  const decline = useDecline(id);
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <CardHeader title="Decline" />
      <p className="m-0 mb-3.5 text-[12.5px] leading-relaxed text-muted">
        The application stays on file and can be reopened. The family are told, so write the
        reason for them to read.
      </p>
      {open ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            clear();
            const form = new FormData(event.currentTarget);
            decline.mutate(
              { reason: fieldOf(form, 'reason') ?? '' },
              onFail('That did not go through.'),
            );
          }}
          className="flex flex-col gap-3.5"
        >
          <Field label="Why" required>
            <TextInput
              name="reason"
              required
              minLength={3}
              maxLength={500}
              autoFocus
              placeholder="No places left in Standard 1 this year"
            />
          </Field>
          <div className="flex gap-2">
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              type="submit"
              variant="danger"
              busy={decline.isPending}
              className="flex-1"
            >
              Decline this application
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="danger" className="w-full" onClick={() => setOpen(true)}>
          Decline this application
        </Button>
      )}
    </Card>
  );
}
