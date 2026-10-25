/**
 * Step four: check and send.
 *
 * The whole form on one screen, with a way back to the step that holds each
 * line. A review that cannot be corrected without starting again is a review
 * nobody reads.
 *
 * Two different lists, and keeping them apart is the point of this screen.
 * `missing_to_submit` is the shortest list the server will not accept a form
 * without, and it is what disables the button. `missing` is the school's
 * checklist — a birth certificate, a photograph — which is worth saying and
 * must never block anything: a document between a parent and a submission the
 * server would have taken is an application the school never receives.
 *
 * The disabling is a courtesy either way. The server checks the same list
 * again, and it is the one that counts.
 */

import { useState } from 'react';

import type { ApplyState } from '@/api/queries/apply';
import { useSubmit } from '@/api/queries/apply';
import { Button, Notice } from '@/components/ui';
import { missingInWords } from '@/domain/apply';
import type { StepId } from '@/domain/apply';
import { longDate, msisdn } from '@/lib/format';

export function ReviewStep({
  state,
  onBack,
}: {
  readonly state: ApplyState;
  readonly onBack: (to: StepId) => void;
}) {
  const application = state.application;
  const submit = useSubmit();
  const [error, setError] = useState<string | null>(null);

  const needed = missingInWords(state.missing_to_submit);
  const wanted = state.missing;

  return (
    <div className="flex min-h-0 flex-1 flex-col px-5 pt-1 pb-5">
      <h1 className="m-0 mb-1.5 font-display text-[21px] font-semibold tracking-[-0.02em]">
        Check and send
      </h1>
      <p className="m-0 mb-5 text-[13.5px] leading-relaxed text-muted">
        Have a look before it goes to the school. You can change anything.
      </p>

      {error ? (
        <div className="mb-4">
          <Notice>{error}</Notice>
        </div>
      ) : null}

      {needed.length > 0 ? (
        <div className="mb-4">
          <Notice tone="warn">
            <span className="font-semibold">Still needed:</span> {needed.join(', ')}.
          </Notice>
        </div>
      ) : null}

      {wanted.length > 0 ? (
        <div className="mb-4">
          <Notice tone="info">
            The school will also ask for {wanted.join(', ').toLowerCase()}. You can send the
            form without them and bring them later.
          </Notice>
        </div>
      ) : null}

      <div className="flex flex-col gap-4">
        <Group
          title="Your child"
          onEdit={() => onBack('child')}
          rows={[
            [
              'Name',
              [application.child_first_name, application.child_surname]
                .filter(Boolean)
                .join(' '),
            ],
            [
              'Born',
              application.date_of_birth ? longDate(application.date_of_birth) : null,
            ],
            ['Sex', application.sex === 'f' ? 'Girl' : application.sex === 'm' ? 'Boy' : null],
            ['Class', state.level_name],
            ['Previous school', application.previous_school ?? 'None'],
          ]}
        />

        <Group
          title="You"
          onEdit={() => onBack('guardian')}
          rows={[
            ['Name', application.guardian_name],
            ['Relationship', titleCase(application.guardian_relationship)],
            [
              'Phone',
              application.guardian_phone ? msisdn(application.guardian_phone) : null,
            ],
            ['Email', application.guardian_email ?? 'Not given'],
          ]}
        />

        <Group
          title="Documents"
          onEdit={() => onBack('child')}
          rows={
            state.documents.length === 0
              ? [['Attached', 'None yet — the school will ask at the desk']]
              : state.documents.map(
                  (document) =>
                    [titleCase(document.kind) ?? document.kind, 'Photo added'] as const,
                )
          }
        />
      </div>

      <div className="mt-auto flex gap-2.5 pt-5">
        <Button onClick={() => onBack('guardian')} className="min-h-[50px]">
          Back
        </Button>
        <Button
          variant="primary"
          disabled={!state.can_submit}
          busy={submit.isPending}
          className="min-h-[50px] flex-1"
          onClick={() => {
            setError(null);
            submit.mutate(undefined, {
              onError: () =>
                setError('That did not send. Check your connection and try again.'),
            });
          }}
        >
          Send to the school
        </Button>
      </div>
      <p className="mt-2.5 mb-0 text-center text-[11.5px] leading-relaxed text-muted">
        Nothing is decided today. The school will read it and send you an SMS.
      </p>
    </div>
  );
}

function Group({
  title,
  rows,
  onEdit,
}: {
  readonly title: string;
  readonly rows: ReadonlyArray<readonly [string, string | null | undefined]>;
  readonly onEdit: () => void;
}) {
  return (
    <section className="rounded-[10px] border border-line p-[14px_15px]">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <h2 className="m-0 font-display text-sm font-semibold">{title}</h2>
        <button
          type="button"
          onClick={onEdit}
          className="text-[12.5px] font-semibold text-ok-ink"
        >
          Change
        </button>
      </div>
      <dl className="m-0 flex flex-col gap-1.5 text-[13px]">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3">
            <dt className="flex-none text-muted">{label}</dt>
            <dd className={`m-0 text-right ${value ? 'font-medium' : 'text-warn-ink'}`}>
              {value || 'Not filled in'}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

const titleCase = (value: string | null | undefined): string | null =>
  value ? value.replace(/_/g, ' ').replace(/^./, (first) => first.toUpperCase()) : null;
