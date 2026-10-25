/**
 * Step two: the child, as the artboard draws it.
 *
 * Nothing here is required to leave the step. The parent can go on with half
 * of it filled, and what they have typed is already on the server — the whole
 * list is checked once, at the end, where a missing field can be explained
 * rather than guessed at. A form that blocks on step two is a form that gets
 * abandoned on step two.
 *
 * Sex is two large chips rather than a dropdown. It is a two-way choice on a
 * phone, and a `<select>` for two options is a tap, a sheet, a scroll and a
 * second tap.
 */

import { useState } from 'react';

import type { ApplyOptions, ApplyState } from '@/api/queries/apply';
import { useSaveProgress } from '@/api/queries/apply';
import { Button, Field, Notice, Select, TextInput } from '@/components/ui';

import { DocumentTiles } from '../components/DocumentTiles';

export function ChildStep({
  state,
  options,
  onNext,
}: {
  readonly state: ApplyState;
  readonly options: ApplyOptions | undefined;
  readonly onNext: () => void;
}) {
  const application = state.application;
  const save = useSaveProgress();
  const [sex, setSex] = useState<'f' | 'm' | null>(
    application.sex === 'f' || application.sex === 'm' ? application.sex : null,
  );
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

    save.mutate(
      {
        child_first_name: text('child_first_name'),
        child_surname: text('child_surname'),
        date_of_birth: text('date_of_birth'),
        sex,
        level_applied_id: text('level_applied_id'),
        previous_school: text('previous_school'),
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
      <div className="mb-4.5 flex items-center gap-2 rounded-[10px] border border-ok-bg bg-brand-soft px-3 py-2.5">
        <TickIcon />
        <p className="m-0 text-[12.5px] font-medium text-brand-ink">
          {application.phone} confirmed
        </p>
      </div>

      <h1 className="m-0 mb-1.5 font-display text-[21px] font-semibold tracking-[-0.02em]">
        Tell us about your child
      </h1>
      <p className="m-0 mb-5 text-[13.5px] leading-relaxed text-muted">
        You can stop at any point. We keep what you have filled in against your phone number.
      </p>

      {error ? (
        <div className="mb-4">
          <Notice>{error}</Notice>
        </div>
      ) : null}

      <div className="flex flex-col gap-4">
        <Field label="First name">
          <TextInput
            name="child_first_name"
            defaultValue={application.child_first_name ?? ''}
            autoComplete="off"
            className="min-h-12 rounded-[10px] text-[15px]"
          />
        </Field>

        <Field label="Surname">
          <TextInput
            name="child_surname"
            defaultValue={application.child_surname ?? ''}
            autoComplete="off"
            className="min-h-12 rounded-[10px] text-[15px]"
          />
        </Field>

        <Field label="Date of birth" hint="As written on the birth certificate.">
          <TextInput
            name="date_of_birth"
            type="date"
            max={new Date().toISOString().slice(0, 10)}
            defaultValue={application.date_of_birth ?? ''}
            className="min-h-12 rounded-[10px] text-[15px]"
          />
        </Field>

        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-2 p-0 text-[13px] font-semibold">Sex</legend>
          <div className="flex gap-2.5">
            <SexChip label="Girl" value="f" chosen={sex === 'f'} onChoose={setSex} />
            <SexChip label="Boy" value="m" chosen={sex === 'm'} onChoose={setSex} />
          </div>
        </fieldset>

        <Field label="Class applying for">
          <Select
            name="level_applied_id"
            defaultValue={application.level_applied_id ?? ''}
            className="min-h-12 rounded-[10px] text-[15px]"
          >
            <option value="">Choose a class</option>
            {(options?.levels ?? []).map((level) => (
              <option key={level.id} value={level.id}>
                {level.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Previous school">
          <TextInput
            name="previous_school"
            defaultValue={application.previous_school ?? ''}
            placeholder="Leave empty if this is the first school"
            className="min-h-12 rounded-[10px] text-[15px]"
          />
        </Field>

        <DocumentTiles state={state} options={options} />
      </div>

      <div className="mt-auto pt-5">
        <Button
          type="submit"
          variant="primary"
          busy={save.isPending}
          className="min-h-[50px] w-full"
        >
          Continue to your details
        </Button>
        <p className="mt-2.5 mb-0 text-center text-[11.5px] leading-relaxed text-muted">
          Saved automatically. Return any time with the code we send you.
        </p>
      </div>
    </form>
  );
}

function SexChip({
  label,
  value,
  chosen,
  onChoose,
}: {
  readonly label: string;
  readonly value: 'f' | 'm';
  readonly chosen: boolean;
  readonly onChoose: (value: 'f' | 'm') => void;
}) {
  return (
    <label
      className={`relative flex min-h-12 flex-1 cursor-pointer items-center justify-center rounded-[10px] text-[14.5px] ${
        chosen
          ? 'border-2 border-brand-strong bg-brand-soft font-semibold text-brand-ink'
          : 'border border-line font-medium text-ink-soft'
      }`}
    >
      <input
        type="radio"
        name="sex"
        value={value}
        checked={chosen}
        onChange={() => onChoose(value)}
        className="absolute h-px w-px opacity-0"
      />
      {label}
    </label>
  );
}

function TickIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="7.3" stroke="#166534" strokeWidth="1.5" />
      <path
        d="M5.8 9.2l2.2 2.2 4.2-4.6"
        stroke="#166534"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
