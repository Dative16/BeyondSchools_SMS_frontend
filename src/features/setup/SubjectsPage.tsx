/**
 * Subjects and teaching. Built to `Subjects.dc.html`.
 *
 * Who teaches what decides who may enter a mark, which is the whole reason
 * this screen exists before any mark sheet does: a subject teacher sees only
 * the classes they are assigned to and can enter marks for those subjects
 * alone.
 *
 * Two things the artboard shows that this does not.
 *
 * It lists **periods a week** against each subject. That number is kept here
 * only where a school has set it per level, because a period is a slot in a
 * timetable and there is no timetable yet — showing an invented one would make
 * the column a guess dressed as a fact.
 *
 * It has no delete, and neither does this: a report card from a closed year
 * names its subjects. Retiring a subject keeps every old record and stops it
 * appearing on new mark sheets, which is the honest version of removal.
 */

import { useEffect, useMemo, useState } from 'react';

import { useLevels } from '@/api/queries/academic';
import { useAcademicYears } from '@/api/queries/school';
import {
  useAddSubject,
  useAssignTeaching,
  useClassesOf,
  useSubjects,
  useTeachingAssignments,
  useTeachingStaff,
  useUnassignTeaching,
  useUpdateSubject,
} from '@/api/queries/setup';
import type { Subject } from '@/api/queries/setup';
import {
  Button,
  Card,
  CardHeader,
  Dialog,
  Field,
  Notice,
  Pill,
  Select,
  TextInput,
} from '@/components/ui';
import { teachingGaps } from '@/domain/setup';
import { useAuth } from '@/features/auth/AuthProvider';

type Tab = 'subjects' | 'teaching';

export default function SubjectsPage() {
  const { can } = useAuth();
  const mayManage = can('academic:manage');

  const subjects = useSubjects();
  const years = useAcademicYears();
  const year = (years.data ?? []).find((each) => each.is_current);
  const classes = useClassesOf(year?.id);
  const assignments = useTeachingAssignments(undefined);

  const [tab, setTab] = useState<Tab>('subjects');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);

  const active = (subjects.data ?? []).filter((subject) => subject.is_active);
  const gaps = useMemo(
    () =>
      teachingGaps({
        subjects: active.map((subject) => ({
          id: subject.id,
          name: subject.name,
          levelIds: subject.levels.map((level) => level.level_id),
        })),
        classes: (classes.data ?? []).map((group) => ({
          id: group.id,
          name: group.name,
          levelId: group.level_id,
        })),
        assigned: (assignments.data ?? []).map((row) => ({
          subjectId: row.subject_id,
          classGroupId: row.class_group_id,
        })),
      }),
    [active, classes.data, assignments.data],
  );

  return (
    <>
      <div className="mb-4.5 flex flex-wrap items-end justify-between gap-3.5">
        <div className="min-w-0">
          <h1 className="m-0 mb-1 font-display text-[26px] font-semibold tracking-[-0.02em]">
            Subjects and teaching
          </h1>
          <p className="m-0 text-sm text-muted">
            Who teaches what decides who may enter a mark.
          </p>
        </div>
        {mayManage ? (
          <Button variant="primary" onClick={() => setAdding(true)}>
            Add a subject
          </Button>
        ) : null}
      </div>

      <div
        role="group"
        aria-label="Subject views"
        className="mb-4.5 flex flex-wrap gap-1 border-b border-line"
      >
        <TabButton active={tab === 'subjects'} onClick={() => setTab('subjects')}>
          Subjects
        </TabButton>
        <TabButton active={tab === 'teaching'} onClick={() => setTab('teaching')}>
          Who teaches what{' '}
          <span className={gaps.length ? 'font-semibold text-bad-ink' : 'text-muted'}>
            {gaps.length}
          </span>
        </TabButton>
      </div>

      {tab === 'subjects' ? (
        <div className="grid grid-cols-1 items-start gap-4.5 xl:grid-cols-[minmax(0,1fr)_21rem]">
          <Card className="min-w-0 overflow-hidden !p-0">
            <div className="px-4.5 pt-4">
              <CardHeader
                title="Subjects taught here"
                note="Kiswahili in Standard 2 and Kiswahili in Standard 6 are the same subject with a different syllabus, so there is one row for it."
              />
            </div>

            {subjects.isLoading ? (
              <div className="mx-4.5 mb-4 h-32 animate-pulse rounded bg-line-soft" aria-hidden="true" />
            ) : (subjects.data ?? []).length === 0 ? (
              <div className="px-4.5 pb-4">
                <Notice tone="warn">
                  No subjects yet. Nobody can be assigned to teach, and no mark sheet can be
                  opened, until the school says what it teaches.
                </Notice>
              </div>
            ) : (
              <div className="overflow-x-auto px-4.5 pb-4">
                <table className="w-full border-collapse text-left text-[13px]">
                  <caption className="sr-only">Every subject and where it is taught</caption>
                  <thead>
                    <tr className="bg-canvas text-[11.5px] tracking-wide text-muted uppercase">
                      <th scope="col" className="px-2 py-2.5 font-semibold">Subject</th>
                      <th scope="col" className="px-2 py-2.5 font-semibold">Code</th>
                      <th scope="col" className="px-2 py-2.5 font-semibold">Levels</th>
                      <th scope="col" className="px-2 py-2.5 text-right font-semibold">
                        Periods a week
                      </th>
                      {mayManage ? (
                        <th scope="col" className="px-2 py-2.5 text-right font-semibold">
                          Change
                        </th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {(subjects.data ?? []).map((subject) => (
                      <tr key={subject.id} className="border-t border-line">
                        <td className="px-2 py-2.5">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-ink">{subject.name}</span>
                            {subject.is_core ? <Pill tone="info">Core</Pill> : null}
                            {!subject.is_active ? <Pill tone="neutral">No longer taught</Pill> : null}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 text-muted">{subject.code}</td>
                        <td className="px-2 py-2.5 text-ink-dim">
                          {subject.levels.length === 0
                            ? '—'
                            : subject.levels.map((level) => level.level_name).join(', ')}
                        </td>
                        <td className="px-2 py-2.5 text-right text-ink-dim">
                          {subject.levels.some((level) => level.periods_per_week !== null)
                            ? subject.levels
                                .map((level) => level.periods_per_week ?? '—')
                                .join(' / ')
                            : 'Not set'}
                        </td>
                        {mayManage ? (
                          <td className="px-2 py-2.5 text-right">
                            <Button size="sm" onClick={() => setEditing(subject)}>
                              Edit
                            </Button>
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Removing a subject" />
            <p className="m-0 mb-3 text-[13px] leading-relaxed text-ink-dim">
              A subject with marks against it cannot be removed, because a report card from a
              closed year would stop making sense. It can be marked as no longer taught, which
              keeps the old marks and stops it appearing on new mark sheets.
            </p>
            <p className="m-0 text-[13px] leading-relaxed text-muted">
              Renaming is safe: the code is what the records point at.
            </p>
          </Card>
        </div>
      ) : null}

      {tab === 'teaching' ? (
        <TeachingPanel
          gaps={gaps}
          subjects={active}
          classes={classes.data ?? []}
          mayManage={mayManage}
        />
      ) : null}

      <SubjectDialog
        open={adding || editing !== null}
        onClose={() => {
          setAdding(false);
          setEditing(null);
        }}
        subject={editing}
      />
    </>
  );
}

function TeachingPanel({
  gaps,
  subjects,
  classes,
  mayManage,
}: {
  readonly gaps: readonly { readonly subjectName: string; readonly className: string }[];
  readonly subjects: readonly Subject[];
  readonly classes: readonly { readonly id: string; readonly name: string; readonly level_id: string }[];
  readonly mayManage: boolean;
}) {
  const [classId, setClassId] = useState('');
  const chosen = classes.find((group) => group.id === classId) ?? classes.at(0);
  const assignments = useTeachingAssignments(chosen?.id);
  const staff = useTeachingStaff(undefined, mayManage);
  const assign = useAssignTeaching();
  const unassign = useUnassignTeaching();

  const forThisClass = subjects.filter((subject) =>
    subject.levels.some((level) => level.level_id === chosen?.level_id),
  );

  return (
    <div className="flex flex-col gap-4.5">
      {gaps.length > 0 ? (
        <Notice tone="warn">
          <span className="block font-semibold">
            {gaps.length} subject and class {gaps.length === 1 ? 'pair has' : 'pairs have'} nobody
            teaching them.
          </span>
          <span className="mt-1 block">
            Nobody can enter a mark for those, and the pupils have no lesson. Fill them before the
            term&rsquo;s first mark sheet is opened.
          </span>
        </Notice>
      ) : null}

      <Card>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 className="m-0 mb-1 font-display text-[15px] font-semibold">
              {chosen?.name ?? 'No classes yet'}
            </h2>
            <p className="m-0 text-[12.5px] text-muted">
              {forThisClass.length} {forThisClass.length === 1 ? 'subject' : 'subjects'} at this
              level
            </p>
          </div>
          {classes.length > 0 ? (
            <Select
              aria-label="Class"
              value={chosen?.id ?? ''}
              onChange={(event) => setClassId(event.target.value)}
              className="!w-auto"
            >
              {classes.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </Select>
          ) : null}
        </div>

        {forThisClass.length === 0 ? (
          <Notice tone="warn">
            No subject is recorded as taught at this level. Add the levels to a subject first, on
            the Subjects tab.
          </Notice>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
            {forThisClass.map((subject) => {
              const row = (assignments.data ?? []).find(
                (each) => each.subject_id === subject.id && each.class_group_id === chosen?.id,
              );
              const teacher = (staff.data ?? []).find((person) => person.id === row?.teacher_id);
              return (
                <li
                  key={subject.id}
                  className="flex flex-wrap items-center gap-3 rounded-[10px] border border-line p-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="m-0 text-sm font-semibold">{subject.name}</p>
                    <p className="m-0 text-xs text-muted">
                      {teacher
                        ? `${teacher.full_name} · may enter marks`
                        : 'Nobody — no mark can be entered'}
                    </p>
                  </div>
                  {mayManage ? (
                    row ? (
                      <Button
                        size="sm"
                        variant="danger"
                        busy={unassign.isPending}
                        onClick={() => void unassign.mutateAsync(row.id)}
                      >
                        Remove
                      </Button>
                    ) : (
                      <Select
                        aria-label={`Who teaches ${subject.name}`}
                        value=""
                        className="!w-auto"
                        onChange={(event) => {
                          if (!event.target.value || !chosen) return;
                          void assign.mutateAsync({
                            teacher_id: event.target.value,
                            subject_id: subject.id,
                            class_group_id: chosen.id,
                          });
                        }}
                      >
                        <option value="">Choose a teacher</option>
                        {(staff.data ?? []).map((person) => (
                          <option key={person.id} value={person.id}>
                            {person.full_name}
                          </option>
                        ))}
                      </Select>
                    )
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        {assign.isError ? (
          <div className="mt-3.5">
            <Notice>{assign.error.message}</Notice>
          </div>
        ) : null}

        <p className="mt-4 mb-0 border-t border-line pt-3.5 text-[12.5px] leading-relaxed text-muted">
          A subject teacher sees only the classes they are assigned to and can enter marks for
          those subjects alone. The class teacher sees every subject for the class but enters marks
          only for the ones they teach.
        </p>
      </Card>
    </div>
  );
}

function SubjectDialog({
  open,
  onClose,
  subject,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly subject: Subject | null;
}) {
  const levels = useLevels(open);
  const add = useAddSubject();
  const update = useUpdateSubject(subject?.id ?? 'none');

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [isCore, setIsCore] = useState(true);
  const [isExaminable, setIsExaminable] = useState(true);
  const [taughtAt, setTaughtAt] = useState<readonly string[]>([]);
  const [retired, setRetired] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCode(subject?.code ?? '');
    setName(subject?.name ?? '');
    setIsCore(subject?.is_core ?? true);
    setIsExaminable(subject?.is_examinable ?? true);
    setTaughtAt(subject?.levels.map((level) => level.level_id) ?? []);
    setRetired(subject ? !subject.is_active : false);
  }, [open, subject]);

  async function submit() {
    const levelBodies = taughtAt.map((id) => ({ level_id: id, periods_per_week: null }));
    if (subject) {
      await update.mutateAsync({
        name: name.trim(),
        is_core: isCore,
        is_examinable: isExaminable,
        is_active: !retired,
        levels: levelBodies,
      });
    } else {
      await add.mutateAsync({
        code: code.trim(),
        name: name.trim(),
        is_core: isCore,
        is_examinable: isExaminable,
        levels: levelBodies,
      });
    }
    onClose();
  }

  const busy = add.isPending || update.isPending;
  const error = add.error?.message ?? update.error?.message;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={subject ? `Edit ${subject.name}` : 'Add a subject'}
      note="One row per subject, however many syllabuses it has."
    >
      <div className="flex flex-col gap-4">
        <Field label="Name" required>
          <TextInput value={name} onChange={(event) => setName(event.target.value)} />
        </Field>

        {subject ? (
          <Field
            label="Code"
            hint="Not editable. The records point at it, which is what makes renaming safe."
          >
            <TextInput value={code} disabled />
          </Field>
        ) : (
          <Field label="Code" hint="Short, and what records will point at." required>
            <TextInput
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="KIS"
            />
          </Field>
        )}

        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-2 p-0 text-[13px] font-medium text-ink-soft">Taught at</legend>
          <div className="flex flex-col gap-2">
            {(levels.data ?? []).map((level) => (
              <label
                key={level.id}
                className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-control border border-line px-3"
              >
                <input
                  type="checkbox"
                  checked={taughtAt.includes(level.id)}
                  onChange={(event) =>
                    setTaughtAt((current) =>
                      event.target.checked
                        ? [...current, level.id]
                        : current.filter((id) => id !== level.id),
                    )
                  }
                  className="h-4.5 w-4.5 flex-none"
                />
                <span className="text-[13px] font-medium">{level.name}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="flex items-center gap-2.5 text-[13px] text-ink-soft">
          <input
            type="checkbox"
            checked={isCore}
            onChange={(event) => setIsCore(event.target.checked)}
            className="h-4.5 w-4.5 flex-none"
          />
          Every pupil at those levels takes it
        </label>
        <label className="flex items-center gap-2.5 text-[13px] text-ink-soft">
          <input
            type="checkbox"
            checked={isExaminable}
            onChange={(event) => setIsExaminable(event.target.checked)}
            className="h-4.5 w-4.5 flex-none"
          />
          It appears on a report card
        </label>

        {subject ? (
          <label className="flex items-start gap-2.5 text-[13px] text-ink-soft">
            <input
              type="checkbox"
              checked={retired}
              onChange={(event) => setRetired(event.target.checked)}
              className="mt-0.5 h-4.5 w-4.5 flex-none"
            />
            <span>
              No longer taught
              <span className="block text-muted">
                Keeps every mark already recorded against it, and stops it appearing on new mark
                sheets. This is how a subject is removed — there is no delete.
              </span>
            </span>
          </label>
        ) : null}

        {error ? <Notice>{error}</Notice> : null}

        <div className="flex flex-wrap justify-end gap-2.5">
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            busy={busy}
            disabled={!name.trim() || (!subject && !code.trim())}
            onClick={() => void submit()}
          >
            {subject ? 'Save' : 'Add it'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  readonly active: boolean;
  readonly onClick: () => void;
  readonly children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`-mb-px min-h-11 border-b-2 px-3.5 text-sm ${
        active
          ? 'border-brand-strong font-semibold text-brand-ink'
          : 'border-transparent font-medium text-ink-dim hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}
