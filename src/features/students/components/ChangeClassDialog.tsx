/**
 * Moving a child between classes. Built to `ChangeClassDialog.dc.html`.
 *
 * Written to the enrolment rather than to the child, because every fact in it
 * is a fact about *this year*: the class, whether they board, whether they are
 * on the bus. Last year's row is untouched, which is what a closed year means
 * and what keeps an old report card reachable.
 *
 * The dialog says what the move will cost before it is made. A fee structure
 * follows the level, so moving between levels changes what a family is billed
 * at the next term run while moving between streams of one level does not —
 * and a registrar moving somebody for a timetable reason deserves to know
 * which of those they are about to do.
 */

import { useEffect, useState } from 'react';

import { useClassesOf } from '@/api/queries/setup';
import { useChangeEnrolment } from '@/api/queries/student';
import { Button, Dialog, Field, Notice, Select } from '@/components/ui';
import { moveConsequence, moveProblem } from '@/domain/profile';

export function ChangeClassDialog({
  open,
  onClose,
  studentId,
  enrolment,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly studentId: string;
  readonly enrolment: {
    readonly id: string;
    readonly academic_year_id: string;
    readonly class_group_id: string | null;
    readonly residency: string | null;
    readonly uses_transport: boolean | null;
  };
}) {
  const classes = useClassesOf(enrolment.academic_year_id);
  const change = useChangeEnrolment(studentId, enrolment.id);

  const [classId, setClassId] = useState('');
  const [residency, setResidency] = useState(enrolment.residency ?? 'day');
  const [bus, setBus] = useState(Boolean(enrolment.uses_transport));

  useEffect(() => {
    if (!open) return;
    setClassId('');
    setResidency(enrolment.residency ?? 'day');
    setBus(Boolean(enrolment.uses_transport));
  }, [open, enrolment.residency, enrolment.uses_transport]);

  const rows = classes.data ?? [];
  const from = rows.find((group) => group.id === enrolment.class_group_id);
  const to = rows.find((group) => group.id === classId);

  const problem = to
    ? moveProblem({
        fromClassId: enrolment.class_group_id,
        toClassId: to.id,
        toYearId: to.academic_year_id,
        enrolmentYearId: enrolment.academic_year_id,
        toCapacity: to.capacity,
        toPupils: to.pupils,
      })
    : null;

  const changed =
    (classId && classId !== enrolment.class_group_id) ||
    residency !== (enrolment.residency ?? 'day') ||
    bus !== Boolean(enrolment.uses_transport);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Change this year's class"
      note="A fact about this year. Last year's row is left exactly as it is."
    >
      <div className="flex flex-col gap-4">
        <Field label="Now in">
          <Select value={enrolment.class_group_id ?? ''} disabled>
            <option value={enrolment.class_group_id ?? ''}>
              {from?.name ?? 'Not in a class'}
            </option>
          </Select>
        </Field>

        <Field label="Moving to" hint="Only classes in the same academic year are listed.">
          <Select value={classId} onChange={(event) => setClassId(event.target.value)}>
            <option value="">Staying where they are</option>
            {rows
              .filter((group) => group.id !== enrolment.class_group_id)
              .map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                  {group.capacity !== null
                    ? ` — ${Math.max(group.capacity - group.pupils, 0)} places left`
                    : ''}
                </option>
              ))}
          </Select>
        </Field>

        {to && !problem ? (
          <Notice tone="info">
            {moveConsequence({
              fromLevelId: from?.level_id ?? null,
              toLevelId: to.level_id,
              toClassName: to.name,
            })}
          </Notice>
        ) : null}

        {problem ? <Notice tone="warn">{problem}</Notice> : null}

        <Field label="Day or boarding">
          <Select value={residency} onChange={(event) => setResidency(event.target.value)}>
            <option value="day">Day</option>
            <option value="boarder">Boarding</option>
          </Select>
        </Field>

        <label className="flex items-center gap-2.5 text-[13px] text-ink-soft">
          <input
            type="checkbox"
            checked={bus}
            onChange={(event) => setBus(event.target.checked)}
            className="h-4.5 w-4.5 flex-none"
          />
          Uses the school bus
        </label>

        {change.isError ? <Notice>{change.error.message}</Notice> : null}

        <div className="flex flex-wrap justify-end gap-2.5">
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!changed || Boolean(problem)}
            busy={change.isPending}
            onClick={() => {
              void change
                .mutateAsync({
                  ...(classId ? { class_group_id: classId } : {}),
                  residency: residency as 'day',
                  uses_transport: bus,
                })
                .then(onClose);
            }}
          >
            Save the change
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
