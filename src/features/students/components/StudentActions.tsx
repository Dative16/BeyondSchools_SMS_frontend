/**
 * The two buttons in the profile header, and what they open.
 *
 * Editing is ordinary. Transferring out is not: it closes a child's place at
 * the school, and the design of this dialog is mostly about making that hard
 * to do by accident and easy to undo by hand. It states what will happen, it
 * requires a reason in words rather than a dropdown, and it is a plain
 * destructive button rather than a filled red one, because a filled button
 * beside "Edit details" is a button somebody presses while meaning the other.
 *
 * Neither mutation decides anything. The server owns whether a transfer is
 * allowed; this asks, and shows what came back.
 */

import { useState } from 'react';

import type { Profile } from '@/api/queries/student';
import { Button, Dialog, Field, Notice, Select, TextInput } from '@/components/ui';
import { money } from '@/lib/format';

import {
  fieldOf,
  messageOf,
  useEditStudent,
  useTransferOut,
} from '../hooks/useStudentActions';

export function StudentActions({
  profile,
  canManage,
}: {
  readonly profile: Profile;
  readonly canManage: boolean;
}) {
  const [open, setOpen] = useState<'edit' | 'transfer' | null>(null);

  if (!canManage) return null;

  const stillHere = profile.student.status === 'active' || profile.student.status === 'prospective';

  return (
    <div className="flex flex-none flex-wrap gap-2">
      <Button size="sm" onClick={() => setOpen('edit')}>
        Edit details
      </Button>
      {stillHere ? (
        <Button size="sm" variant="danger" onClick={() => setOpen('transfer')}>
          Transfer out
        </Button>
      ) : null}

      <EditDialog
        profile={profile}
        open={open === 'edit'}
        onClose={() => setOpen(null)}
      />
      <TransferDialog
        profile={profile}
        open={open === 'transfer'}
        onClose={() => setOpen(null)}
      />
    </div>
  );
}

function EditDialog({
  profile,
  open,
  onClose,
}: {
  readonly profile: Profile;
  readonly open: boolean;
  readonly onClose: () => void;
}) {
  const { student } = profile;
  const [error, setError] = useState<string | null>(null);
  const save = useEditStudent(student.id, onClose);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    save.mutate(
      {
        first_name: fieldOf(form, 'first_name'),
        middle_name: fieldOf(form, 'middle_name'),
        surname: fieldOf(form, 'surname'),
        date_of_birth: fieldOf(form, 'date_of_birth'),
        sex: fieldOf(form, 'sex'),
        nationality: fieldOf(form, 'nationality'),
        birth_certificate_no: fieldOf(form, 'birth_certificate_no'),
        previous_school: fieldOf(form, 'previous_school'),
        special_needs: fieldOf(form, 'special_needs'),
      },
      {
        onError: (caught: unknown) => setError(messageOf(caught, 'That did not save.')),
      },
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Edit details"
      note="Changes are recorded against your name."
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        {error ? <Notice>{error}</Notice> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" required>
            <TextInput name="first_name" defaultValue={student.first_name} required />
          </Field>
          <Field label="Middle name">
            <TextInput name="middle_name" defaultValue={student.middle_name ?? ''} />
          </Field>
          <Field label="Surname" required>
            <TextInput name="surname" defaultValue={student.surname} required />
          </Field>
          <Field label="Date of birth" required>
            <TextInput
              name="date_of_birth"
              type="date"
              defaultValue={student.date_of_birth}
              required
            />
          </Field>
          <Field label="Sex" required>
            <Select name="sex" defaultValue={student.sex} required>
              <option value="f">Female</option>
              <option value="m">Male</option>
            </Select>
          </Field>
          <Field label="Nationality">
            <TextInput name="nationality" defaultValue={student.nationality} />
          </Field>
        </div>

        <Field
          label="Birth certificate number"
          hint="From the certificate itself, not the application."
        >
          <TextInput
            name="birth_certificate_no"
            defaultValue={student.birth_certificate_no ?? ''}
          />
        </Field>

        <Field label="Previous school">
          <TextInput name="previous_school" defaultValue={student.previous_school ?? ''} />
        </Field>

        <Field
          label="Special needs"
          hint="What a teacher needs to know in a classroom. Medical detail belongs in the medical record."
        >
          <TextInput name="special_needs" defaultValue={student.special_needs ?? ''} />
        </Field>

        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" busy={save.isPending}>
            Save changes
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function TransferDialog({
  profile,
  open,
  onClose,
}: {
  readonly profile: Profile;
  readonly open: boolean;
  readonly onClose: () => void;
}) {
  const { student } = profile;
  const [error, setError] = useState<string | null>(null);
  const transfer = useTransferOut(student.id, onClose);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    transfer.mutate(
      { reason: fieldOf(form, 'reason') ?? '', on: fieldOf(form, 'on') },
      {
        onError: (caught: unknown) =>
          setError(messageOf(caught, 'That did not go through.')),
      },
    );
  }

  const owes = Number(profile.balance) > 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Transfer ${student.first_name} out`}
      note="This closes their place at the school."
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        {error ? <Notice>{error}</Notice> : null}

        <Notice tone="warn">
          {student.first_name} comes off the roll and out of their class. The record, the
          enrolment history and every invoice stay — nothing is deleted, and a child who
          comes back is re-enrolled rather than re-admitted.
        </Notice>

        {owes ? (
          <Notice tone="bad">
            This family still owes {money(Number(profile.balance))}. Transferring out does not cancel it, and
            an unpaid balance is harder to collect once a child has left.
          </Notice>
        ) : null}

        <Field
          label="Why are they leaving?"
          hint="In words. This is what somebody reads in two years when the family asks for a transfer letter."
          required
        >
          <TextInput
            name="reason"
            required
            minLength={3}
            placeholder="Moved to Dodoma with the family"
          />
        </Field>

        <Field label="Last day" hint="Today, unless they have already left.">
          <TextInput name="on" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
        </Field>

        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="danger" busy={transfer.isPending}>
            Transfer out
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
