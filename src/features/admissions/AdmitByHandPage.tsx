/**
 * Admit a child by hand. Built to `AdmitByHand.dc.html` and
 * `AdmitByHandPhone.dc.html`.
 *
 * For a family standing at the office counter who did not use the public
 * form. One submit creates six things — the pupil record, the enrolment, the
 * guardian, the link, the family's login and this term's invoice — because on
 * the server it is one transaction, and half of it is a child the roll cannot
 * find or a bill nobody can sign in to pay.
 *
 * Three steps, as the phone artboard draws them, at every width. The desktop
 * artboard is one long form; the wizard is used for both because the registrar
 * is reading each answer back to a parent as they go, and three short screens
 * with a running summary beside them is the same information with less to
 * scroll past. The step lives in the URL, so the browser's own back button
 * steps back through the form rather than leaving it.
 *
 * Unlike the public application form, this one blocks on each step. A parent
 * at home who abandons a half-filled form has still told the school their
 * child exists; a registrar here is creating a pupil, an enrolment and a bill
 * in one irreversible go, and a half-typed name off a birth certificate is
 * not something to discover in March.
 */

import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { useAdmitByHand, useGuardianAtNumber } from '@/api/queries/admissions';
import type { Admitted } from '@/api/queries/admissions';
import { useLevels } from '@/api/queries/academic';
import { useCurrentTerm } from '@/api/queries/school';
import { useAuth } from '@/features/auth/AuthProvider';
import { useClassGroups } from '@/api/queries/students';
import {
  Button,
  ButtonLink,
  Card,
  CardHeader,
  Field,
  Notice,
  Pill,
  Select,
  TextInput,
} from '@/components/ui';
import {
  RELATIONSHIPS,
  STEPS,
  STEP_NAMES,
  hasRoom,
  loginOutcome,
  normalisePhone,
  placesLabel,
  stepAfter,
  stepBefore,
  stepIndex,
  stepProblem,
} from '@/domain/admit';
import type { Sex, StepId } from '@/domain/admit';
import { amount } from '@/lib/format';

const BLANK_CHILD = {
  firstName: '',
  middleName: '',
  surname: '',
  dateOfBirth: '',
  sex: null as Sex | null,
  previousSchool: '',
  birthCertificateNo: '',
};

const BLANK_GUARDIAN = {
  fullName: '',
  phone: '',
  relationship: 'mother',
  nationalId: '',
};

export default function AdmitByHandPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { can } = useAuth();

  const term = useCurrentTerm();
  const levels = useLevels();
  const classes = useClassGroups();
  const admit = useAdmitByHand();

  const [child, setChild] = useState(BLANK_CHILD);
  const [guardian, setGuardian] = useState(BLANK_GUARDIAN);
  const [levelId, setLevelId] = useState('');
  const [classId, setClassId] = useState('');
  const [residency, setResidency] = useState<'day' | 'boarder'>('day');
  const [problem, setProblem] = useState<string | null>(null);
  const [done, setDone] = useState<Admitted | null>(null);

  const asked = params.get('step') as StepId | null;
  const step: StepId = asked && STEPS.includes(asked) ? asked : 'child';

  const existing = useGuardianAtNumber(normalisePhone(guardian.phone));

  // The three buttons that reach here are already gated on this. The guard is
  // for the typed URL, and it says so plainly rather than letting a registrar
  // fill in a family and meet a 403 at the end of it.
  if (!can('student:manage')) {
    return (
      <Card>
        <CardHeader title="This account cannot admit a child" />
        <p className="m-0 text-sm leading-relaxed text-muted">
          Admitting creates a pupil record, an enrolment and a bill. Ask a registrar or the school
          admin.
        </p>
      </Card>
    );
  }

  if (done) return <Admittance outcome={done} />;

  const year = term.year;
  // Only this year's classes, and only ones with a place left. A full class
  // has to be opened up under Classes first — which is a decision about a
  // room, not something to make by accident while a parent waits.
  const forYear = (classes.data ?? []).filter(
    (group) => group.academic_year_id === year?.id && (!levelId || group.level_id === levelId),
  );
  const open = forYear.filter((group) => hasRoom({ capacity: group.capacity, pupils: group.pupils }));
  const full = forYear.length - open.length;
  const chosen = open.find((group) => group.id === classId);

  const facts = {
    child: {
      firstName: child.firstName,
      surname: child.surname,
      dateOfBirth: child.dateOfBirth,
      sex: child.sex,
    },
    guardian: { fullName: guardian.fullName, phone: guardian.phone },
    classId,
  };

  /**
   * Moving between steps clears whatever was being complained about, because
   * the complaint was about the step being left. `keepProblem` is for the
   * other direction — sending a registrar *back* to the step that is
   * incomplete, where clearing the message would remove the only explanation
   * of why they were moved.
   */
  function go(next: StepId, keepProblem = false) {
    const updated = new URLSearchParams(params);
    updated.set('step', next);
    setParams(updated);
    if (!keepProblem) setProblem(null);
  }

  function onwards() {
    const found = stepProblem(step, facts, new Date());
    if (found) {
      setProblem(found);
      return;
    }
    const next = stepAfter(step);
    if (next) {
      go(next);
      return;
    }
    void submit();
  }

  async function submit() {
    // Every step is checked again here, not just the last one. A registrar can
    // reach the end through the URL, and this form writes a bill.
    for (const each of STEPS) {
      const found = stepProblem(each, facts, new Date());
      if (found) {
        go(each, true);
        setProblem(found);
        return;
      }
    }

    try {
      const outcome = await admit.mutateAsync({
        child: {
          first_name: child.firstName.trim(),
          middle_name: child.middleName.trim() || null,
          surname: child.surname.trim(),
          date_of_birth: child.dateOfBirth,
          sex: child.sex as Sex,
          nationality: 'Tanzanian',
          birth_certificate_no: child.birthCertificateNo.trim() || null,
          previous_school: child.previousSchool.trim() || null,
        },
        class_group_id: classId,
        residency,
        guardian: {
          full_name: guardian.fullName.trim(),
          phone: normalisePhone(guardian.phone),
          relationship: guardian.relationship as 'mother',
          national_id: guardian.nationalId.trim() || null,
        },
        enrolled_on: null,
      });
      setDone(outcome);
    } catch {
      // The mutation's own error is rendered below; nothing is lost and the
      // form still holds everything that was typed.
    }
  }

  const at = stepIndex(step);
  const previous = stepBefore(step);
  const last = stepAfter(step) === null;

  return (
    <>
      <p className="mt-0 mb-3">
        <Link
          to="/students"
          className="text-[12.5px] font-semibold text-ink-dim no-underline hover:text-ink"
        >
          &larr; Students
        </Link>
      </p>

      <div className="mb-4.5">
        <h1 className="m-0 mb-1 font-display text-[26px] font-semibold tracking-[-0.02em]">
          Admit a child by hand
        </h1>
        <p className="m-0 text-sm text-muted">
          For a family at the office counter who did not use the public form. This creates the
          pupil record and the {year?.label ?? 'current year'} enrolment in one step, so use it
          only when the child is actually joining.
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-4.5 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <Card className="min-w-0">
          <div className="mb-4.5">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="m-0 text-xs font-semibold text-ink-dim">
                Step {at + 1} of {STEPS.length} &middot; {STEP_NAMES[step]}
              </p>
              <p className="m-0 text-xs text-muted">{last ? 'Last step' : 'About a minute'}</p>
            </div>
            <div className="flex gap-1.5" aria-hidden="true">
              {STEPS.map((each, index) => (
                <span
                  key={each}
                  className={`h-1.5 flex-1 rounded-sm ${
                    index <= at ? 'bg-brand-strong' : 'bg-line'
                  }`}
                />
              ))}
            </div>
          </div>

          {step === 'child' ? (
            <fieldset className="m-0 flex flex-col gap-4 border-0 p-0">
              <legend className="sr-only">The child</legend>
              <p className="m-0 text-[13px] text-muted">
                Copy the names exactly as they appear on the cheti cha kuzaliwa (birth
                certificate).
              </p>
              <Field label="First name" required>
                <TextInput
                  value={child.firstName}
                  onChange={(event) => setChild({ ...child, firstName: event.target.value })}
                  autoComplete="off"
                  className="min-h-12"
                />
              </Field>
              <Field label="Middle name" hint="Leave it empty if there is none.">
                <TextInput
                  value={child.middleName}
                  onChange={(event) => setChild({ ...child, middleName: event.target.value })}
                  autoComplete="off"
                  className="min-h-12"
                />
              </Field>
              <Field label="Surname" required>
                <TextInput
                  value={child.surname}
                  onChange={(event) => setChild({ ...child, surname: event.target.value })}
                  autoComplete="off"
                  className="min-h-12"
                />
              </Field>
              <Field label="Date of birth" required>
                <TextInput
                  type="date"
                  max={new Date().toISOString().slice(0, 10)}
                  value={child.dateOfBirth}
                  onChange={(event) => setChild({ ...child, dateOfBirth: event.target.value })}
                  className="min-h-12"
                />
              </Field>
              <fieldset className="m-0 border-0 p-0">
                <legend className="mb-2 p-0 text-[13px] font-medium text-ink-soft">Sex</legend>
                <div className="flex gap-2.5">
                  <Chip
                    label="Girl"
                    chosen={child.sex === 'f'}
                    onChoose={() => setChild({ ...child, sex: 'f' })}
                  />
                  <Chip
                    label="Boy"
                    chosen={child.sex === 'm'}
                    onChoose={() => setChild({ ...child, sex: 'm' })}
                  />
                </div>
              </fieldset>
              <Field
                label="Birth certificate number"
                hint="Optional. It can be added from the pupil record later."
              >
                <TextInput
                  value={child.birthCertificateNo}
                  onChange={(event) =>
                    setChild({ ...child, birthCertificateNo: event.target.value })
                  }
                  autoComplete="off"
                  className="min-h-12"
                />
              </Field>
              <Field label="Previous school" hint="Leave it empty if this is their first school.">
                <TextInput
                  value={child.previousSchool}
                  onChange={(event) => setChild({ ...child, previousSchool: event.target.value })}
                  autoComplete="off"
                  className="min-h-12"
                />
              </Field>
            </fieldset>
          ) : null}

          {step === 'class' ? (
            <fieldset className="m-0 flex flex-col gap-4 border-0 p-0">
              <legend className="sr-only">Class</legend>
              <p className="m-0 text-[13px] text-muted">
                Only classes with a place left are shown.
                {full > 0
                  ? ` ${full} ${full === 1 ? 'class is' : 'classes are'} full — open one up under Classes first.`
                  : null}
              </p>
              <Field label="Level">
                <Select
                  value={levelId}
                  onChange={(event) => {
                    setLevelId(event.target.value);
                    setClassId('');
                  }}
                  className="min-h-12"
                >
                  <option value="">Every level</option>
                  {(levels.data ?? []).map((level) => (
                    <option key={level.id} value={level.id}>
                      {level.name}
                    </option>
                  ))}
                </Select>
              </Field>

              {open.length === 0 ? (
                <Notice tone="warn">
                  {forYear.length === 0
                    ? `No classes exist for ${year?.label ?? 'this year'} yet. Create them under Classes before admitting anybody.`
                    : 'Every class at this level is full. Raise a capacity under Classes, or choose another level.'}
                </Notice>
              ) : (
                <fieldset className="m-0 border-0 p-0">
                  <legend className="mb-2 p-0 text-[13px] font-medium text-ink-soft">Class</legend>
                  <div className="flex flex-col gap-2.5">
                    {open.map((group) => (
                      <label
                        key={group.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-[10px] p-3.5 ${
                          classId === group.id
                            ? 'border-2 border-brand-strong bg-brand-soft'
                            : 'border border-line bg-white'
                        }`}
                      >
                        <input
                          type="radio"
                          name="class_group"
                          value={group.id}
                          checked={classId === group.id}
                          onChange={() => setClassId(group.id)}
                          className="mt-0.5 h-4.5 w-4.5 flex-none"
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold">{group.name}</span>
                          <span className="mt-0.5 block text-xs text-muted">
                            {placesLabel({ capacity: group.capacity, pupils: group.pupils })}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}

              <fieldset className="m-0 border-0 p-0">
                <legend className="mb-2 p-0 text-[13px] font-medium text-ink-soft">
                  Day or boarding
                </legend>
                <div className="flex gap-2.5">
                  <Chip
                    label="Day"
                    chosen={residency === 'day'}
                    onChoose={() => setResidency('day')}
                  />
                  <Chip
                    label="Boarding"
                    chosen={residency === 'boarder'}
                    onChoose={() => setResidency('boarder')}
                  />
                </div>
              </fieldset>
            </fieldset>
          ) : null}

          {step === 'guardian' ? (
            <fieldset className="m-0 flex flex-col gap-4 border-0 p-0">
              <legend className="sr-only">The guardian</legend>
              <p className="m-0 text-[13px] leading-relaxed text-muted">
                One is enough to start. This person receives the invoices and the SMS, and the
                phone number is how they sign in &mdash; check it with them twice. Others can be
                linked later from the pupil record.
              </p>
              <Field label="Full name" required>
                <TextInput
                  value={guardian.fullName}
                  onChange={(event) =>
                    setGuardian({ ...guardian, fullName: event.target.value })
                  }
                  autoComplete="off"
                  className="min-h-12"
                />
              </Field>
              <Field label="Relationship">
                <Select
                  value={guardian.relationship}
                  onChange={(event) =>
                    setGuardian({ ...guardian, relationship: event.target.value })
                  }
                  className="min-h-12"
                >
                  {RELATIONSHIPS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Phone number" required>
                <TextInput
                  type="tel"
                  inputMode="numeric"
                  placeholder="0754 000 000"
                  value={guardian.phone}
                  onChange={(event) => setGuardian({ ...guardian, phone: event.target.value })}
                  autoComplete="off"
                  className="min-h-12"
                />
              </Field>

              {existing.data ? (
                <Notice tone="info">
                  <strong>This number is already on a pupil&rsquo;s record.</strong>{' '}
                  {existing.data.guardian.full_name}
                  {existing.data.children.length > 0
                    ? `, guardian of ${existing.data.children
                        .map((kid) => `${kid.full_name}${kid.class_name ? ` in ${kid.class_name}` : ''}`)
                        .join(', ')}`
                    : null}
                  . Linking this child to the same guardian keeps one person, two children &mdash;
                  so the name on file is kept and the one typed above is not used.
                </Notice>
              ) : null}

              <Field label="National ID" hint="Optional.">
                <TextInput
                  value={guardian.nationalId}
                  onChange={(event) =>
                    setGuardian({ ...guardian, nationalId: event.target.value })
                  }
                  autoComplete="off"
                  className="min-h-12"
                />
              </Field>
            </fieldset>
          ) : null}

          {problem ? (
            <div className="mt-4">
              <Notice>{problem}</Notice>
            </div>
          ) : null}
          {admit.isError ? (
            <div className="mt-4">
              <Notice>{admit.error.message}</Notice>
            </div>
          ) : null}

          <div className="mt-5 flex gap-2.5 border-t border-line pt-4">
            {previous ? (
              <Button onClick={() => go(previous)} className="min-h-12">
                Back
              </Button>
            ) : (
              <Button onClick={() => void navigate('/students')} className="min-h-12">
                Cancel
              </Button>
            )}
            <Button
              variant="primary"
              className="min-h-12 flex-1"
              busy={admit.isPending}
              onClick={onwards}
            >
              {last ? 'Enrol this child' : 'Continue'}
            </Button>
          </div>
        </Card>

        <Card className="xl:sticky xl:top-6">
          <CardHeader title="What this will create" />
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-[13px] text-ink-dim">
            <li>
              A pupil record for{' '}
              <strong className="font-semibold text-ink">
                {[child.firstName, child.surname].filter(Boolean).join(' ') || 'the child'}
              </strong>
              , with an admission number issued when you enrol them.
            </li>
            <li>
              {chosen ? (
                <>
                  {year?.label ? `A ${year.label} enrolment` : 'An enrolment'} in{' '}
                  <strong className="font-semibold text-ink">{chosen.name}</strong>
                  {residency === 'boarder' ? ', boarding' : ''}.
                </>
              ) : (
                'An enrolment, once a class is chosen.'
              )}
            </li>
            <li>A guardian link marked primary and set to receive invoices.</li>
            <li>
              A login for{' '}
              {normalisePhone(guardian.phone) || 'the guardian’s number'}, so the family can see
              what they owe.
            </li>
            <li>
              {term.term
                ? `The ${term.term.label} invoice from this level’s published fee structure, plus the one-off joining charges.`
                : 'This term’s invoice from the published fee structure.'}
            </li>
          </ul>
          <p className="mt-3.5 mb-0 rounded-control bg-canvas px-3 py-2.5 text-[12.5px] leading-relaxed text-muted">
            No deposit is recorded here. If the family is paying at the counter today, enrol first
            and then enter the receipt on the invoice.
          </p>
        </Card>
      </div>
    </>
  );
}

/**
 * What was created, named, with somewhere to go next.
 *
 * A screen that only said "done" would send a registrar hunting through the
 * roll for the admission number they have to read out, and through the
 * invoice list for the bill they are about to take money against.
 */
function Admittance({ outcome }: { readonly outcome: Admitted }) {
  return (
    <>
      <div className="mb-4.5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="m-0 mb-1 font-display text-[26px] font-semibold tracking-[-0.02em]">
            Admitted
          </h1>
          <p className="m-0 text-sm text-muted">
            On the roll in {outcome.class_name}, and billed.
          </p>
        </div>
        <Pill tone="ok">Enrolled</Pill>
      </div>

      <Card className="mb-4.5">
        <CardHeader
          title="Admission number"
          note="Read this out to the family. They will be asked for it at the counter for years."
        />
        <p className="m-0 font-display text-[28px] font-semibold tracking-[-0.01em]">
          {outcome.admission_no}
        </p>
      </Card>

      <Card className="mb-4.5">
        <CardHeader title="The bill" note="No deposit was recorded. Enter a receipt against it." />
        <p className="m-0 mb-1 text-sm">
          <strong className="font-semibold">{outcome.invoice_reference}</strong> &middot;{' '}
          {amount(Number(outcome.billed))} TZS
        </p>
        <p className="m-0 text-[12.5px] text-muted">
          This term&rsquo;s fees and the one-off joining charges.
        </p>
        <div className="mt-3.5 flex flex-wrap gap-2.5">
          <ButtonLink to={`/fees/${outcome.invoice_id}`} variant="primary">
            Open the invoice
          </ButtonLink>
          <ButtonLink to={`/students/${outcome.student_id}`}>Open the pupil record</ButtonLink>
        </div>
      </Card>

      <Card>
        <CardHeader title="The family" />
        <p className="m-0 text-[13px] leading-relaxed text-ink-dim">
          {outcome.guardian_existed
            ? 'That phone number was already a guardian here, so this child was linked to the record the school already holds — one person, more than one child.'
            : 'A guardian record was created for that phone number.'}{' '}
          {loginOutcome(outcome.login)}
        </p>
        <p className="mt-3.5 mb-0">
          <Link to="/students/new" className="text-sm font-semibold text-ok-ink no-underline">
            Admit another child &rarr;
          </Link>
        </p>
      </Card>
    </>
  );
}

/** A two-way choice on a phone. A `<select>` for two options is four taps. */
function Chip({
  label,
  chosen,
  onChoose,
}: {
  readonly label: string;
  readonly chosen: boolean;
  readonly onChoose: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={chosen}
      onClick={onChoose}
      className={`min-h-12 flex-1 rounded-control text-sm ${
        chosen
          ? 'border-2 border-brand-strong bg-brand-soft font-semibold text-brand-ink'
          : 'border border-line bg-white font-medium text-ink-soft'
      }`}
    >
      {label}
    </button>
  );
}
