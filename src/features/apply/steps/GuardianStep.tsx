/**
 * Step three: who you are.
 *
 * The phone number is pre-filled with the verified one, because in almost
 * every case it is the same number — but it is editable, because it is not
 * always. A grandmother verifying on her own phone for a mother who is the
 * guardian is a real case, and a form that assumed otherwise would record the
 * wrong person as the contact for the next seven years.
 */

import type { ApplyState } from '@/api/queries/apply';
import { useSaveProgress } from '@/api/queries/apply';
import { Button, Field, Notice, Select, TextInput } from '@/components/ui';
import { normalisePhone } from '@/domain/apply';

import { useState } from 'react';

const RELATIONSHIPS = [
  ['mother', 'Mother'],
  ['father', 'Father'],
  ['guardian', 'Guardian'],
  ['grandparent', 'Grandparent'],
  ['sibling', 'Brother or sister'],
  ['other', 'Someone else'],
] as const;

export function GuardianStep({
  state,
  phone,
  onBack,
  onNext,
}: {
  readonly state: ApplyState;
  readonly phone: string;
  readonly onBack: () => void;
  readonly onNext: () => void;
}) {
  const application = state.application;
  const save = useSaveProgress();
  const [error, setError] = useState<string | null>(null);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const text = (key: string) => {
      const raw = form.get(key);
      if (typeof raw !== 'string') return null;
      const trimmed = raw.trim();
      return trimmed === '' ? null : trimmed;
    };

    const typedPhone = text('guardian_phone');
    save.mutate(
      {
        guardian_name: text('guardian_name'),
        guardian_phone: typedPhone ? normalisePhone(typedPhone) : null,
        guardian_relationship: text('guardian_relationship') as never,
        guardian_email: text('guardian_email'),
        guardian_national_id: text('guardian_national_id'),
        guardian_address: text('guardian_address'),
      },
      {
        onSuccess: onNext,
        onError: () =>
          setError('That did not save. Check your connection and try again — nothing is lost.'),
      },
    );
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col px-5 pt-1 pb-5">
      <h1 className="m-0 mb-1.5 font-display text-[21px] font-semibold tracking-[-0.02em]">
        About you
      </h1>
      <p className="m-0 mb-5 text-[13.5px] leading-relaxed text-muted">
        The school needs one person it can reach. You can add others once your child has a
        place.
      </p>

      {error ? (
        <div className="mb-4">
          <Notice>{error}</Notice>
        </div>
      ) : null}

      <div className="flex flex-col gap-4">
        <Field label="Your full name">
          <TextInput
            name="guardian_name"
            defaultValue={application.guardian_name ?? ''}
            autoComplete="name"
            className="min-h-12 rounded-[10px] text-[15px]"
          />
        </Field>

        <Field label="How are you related to the child?">
          <Select
            name="guardian_relationship"
            defaultValue={application.guardian_relationship ?? ''}
            className="min-h-12 rounded-[10px] text-[15px]"
          >
            <option value="">Choose one</option>
            {RELATIONSHIPS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Phone number"
          hint="The number the school will ring. Usually the one you verified."
        >
          <TextInput
            name="guardian_phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            defaultValue={application.guardian_phone ?? (phone || application.phone)}
            className="min-h-12 rounded-[10px] text-[15px]"
          />
        </Field>

        <Field label="Email" hint="Optional. Invoices and results can be sent here too.">
          <TextInput
            name="guardian_email"
            type="email"
            autoComplete="email"
            defaultValue={application.guardian_email ?? ''}
            className="min-h-12 rounded-[10px] text-[15px]"
          />
        </Field>

        <Field label="National ID" hint="Optional.">
          <TextInput
            name="guardian_national_id"
            defaultValue={application.guardian_national_id ?? ''}
            className="min-h-12 rounded-[10px] text-[15px]"
          />
        </Field>

        <Field label="Where you live" hint="Optional. A street, a ward, or a landmark.">
          <TextInput
            name="guardian_address"
            defaultValue={application.guardian_address ?? ''}
            className="min-h-12 rounded-[10px] text-[15px]"
          />
        </Field>
      </div>

      <div className="mt-auto flex gap-2.5 pt-5">
        <Button onClick={onBack} className="min-h-[50px]">
          Back
        </Button>
        <Button
          type="submit"
          variant="primary"
          busy={save.isPending}
          className="min-h-[50px] flex-1"
        >
          Check and send
        </Button>
      </div>
    </form>
  );
}
