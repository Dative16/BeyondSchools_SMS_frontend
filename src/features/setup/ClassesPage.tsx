/**
 * Classes and streams. Built to `Classes.dc.html`.
 *
 * A class is where a child is actually enrolled, so until this screen exists a
 * school with a ladder still cannot take a single pupil.
 *
 * The class teacher is the part worth the care. It is an authorisation change
 * as much as an administrative one — a class teacher may read every child in
 * that class — which is why the picker offers only people the server would
 * accept, and says what each of them already holds. A teacher who already has
 * a class can take a second, but the register then falls to one person twice a
 * day, and that should be a decision rather than something nobody noticed.
 *
 * The artboard has "Close the class". There is no endpoint that closes one and
 * this does not pretend otherwise: a class with pupils in it must not vanish,
 * and the honest interim is to say so and point at moving them from the roll.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { useLevels, useStreams } from '@/api/queries/academic';
import { useAcademicYears } from '@/api/queries/school';
import {
  useAddClass,
  useAddStream,
  useClassesOf,
  useSetClassTeacher,
  useTeachingStaff,
  useUpdateClass,
} from '@/api/queries/setup';
import type { ClassGroup } from '@/api/queries/setup';
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
import type { Tone } from '@/components/ui';
import { classWarning, fillLabel, fillState, teacherLoad } from '@/domain/setup';
import type { Fill } from '@/domain/setup';
import { useAuth } from '@/features/auth/AuthProvider';

const FILL_TONES: Record<Fill, Tone> = {
  empty: 'neutral',
  room: 'ok',
  'nearly-full': 'warn',
  full: 'warn',
  over: 'bad',
};

const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

export default function ClassesPage() {
  const { can } = useAuth();
  const mayManage = can('academic:manage');

  const years = useAcademicYears();
  const [yearId, setYearId] = useState<string | null>(null);
  const open = (years.data ?? []).filter((year) => !year.is_closed);
  const year =
    open.find((each) => each.id === yearId) ?? open.find((each) => each.is_current) ?? open.at(0);

  const classes = useClassesOf(year?.id);
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const rows = classes.data ?? [];
  const chosen = rows.find((each) => each.id === chosenId) ?? rows.at(0);
  const pupils = rows.reduce((sum, group) => sum + group.pupils, 0);

  return (
    <>
      <div className="mb-4.5 flex flex-wrap items-end justify-between gap-3.5">
        <div className="min-w-0">
          <h1 className="m-0 mb-1 font-display text-[26px] font-semibold tracking-[-0.02em]">
            Classes and streams
          </h1>
          <p className="m-0 text-sm text-muted">
            {year?.label ?? '—'} &middot; {rows.length}{' '}
            {rows.length === 1 ? 'class' : 'classes'} &middot; {pupils} pupils
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {open.length > 1 ? (
            <Select
              aria-label="Academic year"
              value={year?.id ?? ''}
              onChange={(event) => {
                setYearId(event.target.value);
                setChosenId(null);
              }}
              className="!w-auto"
            >
              {open.map((each) => (
                <option key={each.id} value={each.id}>
                  {each.label}
                </option>
              ))}
            </Select>
          ) : null}
          {mayManage ? (
            <Button variant="primary" onClick={() => setAdding(true)}>
              Add a class
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-4.5 xl:grid-cols-[20rem_minmax(0,1fr)]">
        <Card>
          <CardHeader title="Classes" />
          {classes.isLoading ? (
            <div className="h-32 animate-pulse rounded bg-line-soft" aria-hidden="true" />
          ) : rows.length === 0 ? (
            <Notice tone="warn">
              No classes for {year?.label ?? 'this year'}. A child cannot be enrolled until one
              exists, because an enrolment is a child in a class.
            </Notice>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {rows.map((group) => (
                <li key={group.id}>
                  <button
                    type="button"
                    aria-pressed={group.id === chosen?.id}
                    onClick={() => setChosenId(group.id)}
                    className={`w-full rounded-[10px] px-3.5 py-3 text-left ${
                      group.id === chosen?.id
                        ? 'border-2 border-brand-strong bg-brand-soft'
                        : 'border border-line bg-white'
                    }`}
                  >
                    <span className="mb-0.5 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{group.name}</span>
                      <Pill
                        tone={FILL_TONES[fillState({ pupils: group.pupils, capacity: group.capacity })]}
                      >
                        {fillLabel({ pupils: group.pupils, capacity: group.capacity })}
                      </Pill>
                    </span>
                    <span className="block text-xs text-muted">
                      {group.class_teacher_id ? 'Has a class teacher' : 'No class teacher yet'}
                      {group.room ? ` · ${group.room}` : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {chosen ? (
          <ClassPanel key={chosen.id} group={chosen} yearId={year?.id} mayManage={mayManage} />
        ) : null}
      </div>

      <AddClassDialog
        open={adding}
        onClose={() => setAdding(false)}
        yearId={year?.id}
        onAdded={(group) => setChosenId(group.id)}
      />
    </>
  );
}

function ClassPanel({
  group,
  yearId,
  mayManage,
}: {
  readonly group: ClassGroup;
  readonly yearId: string | undefined;
  readonly mayManage: boolean;
}) {
  const staff = useTeachingStaff(yearId, mayManage);
  const update = useUpdateClass(group.id);
  const setTeacher = useSetClassTeacher(group.id);

  const [room, setRoom] = useState(group.room ?? '');
  const [capacity, setCapacity] = useState(group.capacity === null ? '' : String(group.capacity));
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    setRoom(group.room ?? '');
    setCapacity(group.capacity === null ? '' : String(group.capacity));
  }, [group.room, group.capacity]);

  const teacher = (staff.data ?? []).find((person) => person.id === group.class_teacher_id);
  const warning = classWarning({ pupils: group.pupils, capacity: group.capacity });
  const dirty =
    room !== (group.room ?? '') ||
    capacity !== (group.capacity === null ? '' : String(group.capacity));

  return (
    <div className="flex min-w-0 flex-col gap-4.5">
      <Card>
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="m-0 mb-1 font-display text-[17px] font-semibold">{group.name}</h2>
            <p className="m-0 text-[12.5px] text-muted">
              {fillLabel({ pupils: group.pupils, capacity: group.capacity })}
              {group.room ? ` · ${group.room}` : null}
            </p>
          </div>
          <Link
            to={`/students?class=${group.id}`}
            className="text-[12.5px] font-semibold text-ok-ink no-underline"
          >
            See the roll &rarr;
          </Link>
        </div>

        {warning ? (
          <div className="mb-4">
            <Notice tone={fillState({ pupils: group.pupils, capacity: group.capacity }) === 'over' ? 'bad' : 'warn'}>
              {warning}
            </Notice>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <Field
            label="Places"
            hint="Leave it empty for “nobody has said”, which the admission form treats as having room."
          >
            <TextInput
              type="number"
              min={1}
              max={300}
              value={capacity}
              disabled={!mayManage}
              onChange={(event) => setCapacity(event.target.value)}
            />
          </Field>
          <Field label="Classroom" hint="Optional.">
            <TextInput
              value={room}
              disabled={!mayManage}
              placeholder="Block B, Room 3"
              onChange={(event) => setRoom(event.target.value)}
            />
          </Field>
        </div>

        {update.isError ? (
          <div className="mt-3.5">
            <Notice>{update.error.message}</Notice>
          </div>
        ) : null}

        {mayManage ? (
          <div className="mt-4 flex flex-wrap gap-2.5 border-t border-line pt-4">
            <Button
              variant="primary"
              disabled={!dirty}
              busy={update.isPending}
              onClick={() =>
                void update.mutateAsync({
                  room: room.trim() || null,
                  capacity: capacity ? Number(capacity) : null,
                })
              }
            >
              Save this class
            </Button>
            {dirty ? (
              <Button
                variant="ghost"
                onClick={() => {
                  setRoom(group.room ?? '');
                  setCapacity(group.capacity === null ? '' : String(group.capacity));
                }}
              >
                Undo
              </Button>
            ) : null}
          </div>
        ) : null}
      </Card>

      <Card>
        <CardHeader
          title="Class teacher"
          note="Takes the register, sees every pupil in the class, and is the name a guardian is given when they ring. One per class."
        />

        {teacher ? (
          <div className="flex flex-wrap items-center gap-3">
            <span
              aria-hidden="true"
              className="grid h-10 w-10 flex-none place-items-center rounded-full bg-ink text-xs font-semibold text-white"
            >
              {initials(teacher.full_name)}
            </span>
            <div className="min-w-0">
              <p className="m-0 text-sm font-semibold">{teacher.full_name}</p>
              <p className="m-0 text-xs text-muted">
                {teacherLoad({
                  className: teacher.class_name,
                  subjectsTaught: teacher.subjects_taught,
                })}
              </p>
            </div>
            {mayManage ? (
              <Button size="sm" className="ml-auto" onClick={() => setPicking(true)}>
                Change
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            <Notice tone="warn">
              <span className="block font-semibold">No class teacher yet.</span>
              <span className="mt-1 block">
                Nobody can take the register for this class and guardians have no name to ask for.
                Assign somebody before term starts.
              </span>
            </Notice>
            {mayManage ? (
              <div className="mt-3.5">
                <Button variant="primary" onClick={() => setPicking(true)}>
                  Put a teacher in front of it
                </Button>
              </div>
            ) : null}
          </>
        )}

        {setTeacher.isError ? (
          <div className="mt-3.5">
            <Notice>{setTeacher.error.message}</Notice>
          </div>
        ) : null}
      </Card>

      <Card>
        <CardHeader title="Closing a class" />
        <p className="m-0 text-[13px] leading-relaxed text-muted">
          A class with pupils in it cannot be closed — move them first, from the roll. There is no
          button for closing an empty one yet either: nothing in the API does it, and a class that
          disappeared while an invoice still pointed at it would leave a bill nobody could explain.
        </p>
      </Card>

      <Dialog
        open={picking}
        onClose={() => setPicking(false)}
        title="Choose a teacher"
        note="Only people who can take a register are listed."
      >
        {staff.isLoading ? (
          <div className="h-24 animate-pulse rounded bg-line-soft" aria-hidden="true" />
        ) : (staff.data ?? []).length === 0 ? (
          <Notice tone="warn">
            There are no teaching accounts yet. Somebody has to have an account before they can be
            given a class.
          </Notice>
        ) : (
          <div className="flex flex-col gap-2">
            {(staff.data ?? []).map((person) => (
              <button
                key={person.id}
                type="button"
                className={`flex items-center gap-3 rounded-[10px] px-3.5 py-3 text-left ${
                  person.id === group.class_teacher_id
                    ? 'border-2 border-brand-strong bg-brand-soft'
                    : 'border border-line bg-white'
                }`}
                onClick={() => {
                  void setTeacher.mutateAsync(person.id).then(() => setPicking(false));
                }}
              >
                <span
                  aria-hidden="true"
                  className="grid h-9 w-9 flex-none place-items-center rounded-full bg-line-soft text-[11px] font-semibold text-ink-soft"
                >
                  {initials(person.full_name)}
                </span>
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-semibold">{person.full_name}</span>
                  <span className="block text-xs text-muted">
                    {teacherLoad({
                      className: person.class_name,
                      subjectsTaught: person.subjects_taught,
                    })}
                  </span>
                </span>
              </button>
            ))}
            <p className="m-0 mt-1.5 text-[12.5px] leading-relaxed text-muted">
              A teacher who already has a class can take a second, but the register then falls to
              one person twice a day.
            </p>
            {group.class_teacher_id ? (
              <Button
                variant="danger"
                busy={setTeacher.isPending}
                onClick={() => {
                  void setTeacher.mutateAsync(null).then(() => setPicking(false));
                }}
              >
                Leave the class without one
              </Button>
            ) : null}
          </div>
        )}
      </Dialog>
    </div>
  );
}

function AddClassDialog({
  open,
  onClose,
  yearId,
  onAdded,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly yearId: string | undefined;
  readonly onAdded: (group: ClassGroup) => void;
}) {
  const levels = useLevels(open);
  const streams = useStreams(open);
  const add = useAddClass();
  const addStream = useAddStream();

  const [levelId, setLevelId] = useState('');
  const [streamId, setStreamId] = useState('');
  const [capacity, setCapacity] = useState('40');
  const [room, setRoom] = useState('');
  const [newStream, setNewStream] = useState('');

  useEffect(() => {
    if (!open) return;
    setLevelId((current) => current || ((levels.data ?? []).at(0)?.id ?? ''));
  }, [open, levels.data]);

  useEffect(() => setStreamId(''), [levelId]);

  const forLevel = (streams.data ?? []).filter((stream) => stream.level_id === levelId);

  async function submit() {
    if (!yearId || !levelId) return;
    let chosenStream = streamId || null;

    // A stream typed here is created first. The alternative is sending a
    // registrar to another screen in the middle of making a class, which is
    // how a school ends up with "Standard 1" and no streams at all.
    if (!chosenStream && newStream.trim()) {
      const created = await addStream.mutateAsync({
        level_id: levelId,
        name: newStream.trim(),
        capacity: null,
        is_boarding: false,
      });
      chosenStream = created.id;
    }

    const group = await add.mutateAsync({
      academic_year_id: yearId,
      level_id: levelId,
      stream_id: chosenStream,
      class_teacher_id: null,
      room: room.trim() || null,
      capacity: capacity ? Number(capacity) : null,
    });
    onAdded(group);
    onClose();
    setNewStream('');
    setRoom('');
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add a class"
      note="A class is a level, optionally one stream of it, in one year."
    >
      <div className="flex flex-col gap-4">
        <Field label="Level" required>
          <Select value={levelId} onChange={(event) => setLevelId(event.target.value)}>
            {(levels.data ?? []).map((level) => (
              <option key={level.id} value={level.id}>
                {level.name}
              </option>
            ))}
          </Select>
        </Field>

        {forLevel.length > 0 ? (
          <Field
            label="Stream"
            hint="Leave it on none where a level has one class. The name is written from both."
          >
            <Select value={streamId} onChange={(event) => setStreamId(event.target.value)}>
              <option value="">No stream</option>
              {forLevel.map((stream) => (
                <option key={stream.id} value={stream.id}>
                  {stream.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}

        {!streamId ? (
          <Field
            label="Or name a new stream"
            hint="Blue, Green, Boarding. Needed only where a level has more than one class."
          >
            <TextInput
              value={newStream}
              onChange={(event) => setNewStream(event.target.value)}
              placeholder="Blue"
            />
          </Field>
        ) : null}

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <Field label="Places" hint="Leave empty if nobody has said.">
            <TextInput
              type="number"
              min={1}
              max={300}
              value={capacity}
              onChange={(event) => setCapacity(event.target.value)}
            />
          </Field>
          <Field label="Classroom" hint="Optional.">
            <TextInput value={room} onChange={(event) => setRoom(event.target.value)} />
          </Field>
        </div>

        {add.isError ? <Notice>{add.error.message}</Notice> : null}
        {addStream.isError ? <Notice>{addStream.error.message}</Notice> : null}

        <div className="flex flex-wrap justify-end gap-2.5">
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            busy={add.isPending || addStream.isPending}
            disabled={!yearId || !levelId}
            onClick={() => void submit()}
          >
            Add it
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
