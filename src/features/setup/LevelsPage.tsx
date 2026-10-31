/**
 * Levels and the ladder. Built to `Levels.dc.html`.
 *
 * The ladder is data, not code — and this is the screen where that pays off.
 * Tanzania is moving from a seven-year primary cycle to six under the
 * Education and Training Policy 2014 (2023 edition), so a school holds two
 * leaving cohorts at the same time: in December 2027 both Standard 6 and
 * Standard 7 sit the same national examination. A promotion run told there is
 * one leaving class would get that year wrong for one of the two.
 *
 * Which levels leave is therefore a property of the **year**, not of the
 * level, and the exit rule below is set per year for exactly that reason.
 *
 * The outcome per level comes from the server's own reading of the ladder
 * rather than being worked out here, so what the table says is what the
 * promotion run will do.
 */

import { useEffect, useMemo, useState } from 'react';

import { useStructures } from '@/api/queries/fees';
import { useAcademicYears } from '@/api/queries/school';
import { useAddLevel, useClassesOf, useLadder, useSetExitLevels } from '@/api/queries/setup';
import type { Level } from '@/api/queries/setup';
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
import { exitSummary, goesOnTo } from '@/domain/setup';
import { useAuth } from '@/features/auth/AuthProvider';

const STAGES = [
  { value: 'pre_primary', label: 'Pre-primary' },
  { value: 'primary', label: 'Primary' },
  { value: 'lower_secondary', label: 'Lower secondary' },
  { value: 'upper_secondary', label: 'Upper secondary' },
] as const;

export default function LevelsPage() {
  const { can } = useAuth();
  const mayManage = can('academic:manage');

  const years = useAcademicYears();
  const [yearId, setYearId] = useState<string | null>(null);
  const open = (years.data ?? []).filter((year) => !year.is_closed);
  const year = open.find((each) => each.id === yearId) ?? open.find((each) => each.is_current) ?? open.at(0);

  const ladder = useLadder(year?.id);
  const classes = useClassesOf(year?.id);
  const structures = useStructures(can('fee_structure:manage'));
  const [adding, setAdding] = useState(false);

  const levels = (ladder.data?.levels ?? []).filter((level) => level.is_active);
  const byId = new Map(levels.map((level) => [level.id, level]));
  const steps = new Map((ladder.data?.steps ?? []).map((step) => [step.level_id, step]));

  /** Pupils per level, counted from the classes rather than stored anywhere. */
  const pupils = useMemo(() => {
    const counts = new Map<string, number>();
    for (const group of classes.data ?? []) {
      counts.set(group.level_id, (counts.get(group.level_id) ?? 0) + group.pupils);
    }
    return counts;
  }, [classes.data]);

  const feeStatus = useMemo(() => {
    const status = new Map<string, string>();
    for (const row of structures.data ?? []) {
      if (row.academic_year_id === year?.id) status.set(row.level_id, row.status);
    }
    return status;
  }, [structures.data, year?.id]);

  const exits = levels.filter((level) => (ladder.data?.exit_level_ids ?? []).includes(level.id));

  return (
    <>
      <div className="mb-4.5 flex flex-wrap items-end justify-between gap-3.5">
        <div className="min-w-0">
          <h1 className="m-0 mb-1 font-display text-[26px] font-semibold tracking-[-0.02em]">
            Levels and the ladder
          </h1>
          <p className="m-0 text-sm text-muted">
            What the promotion run reads to decide where each pupil goes next.
          </p>
        </div>
        {mayManage ? <Button onClick={() => setAdding(true)}>Add a level</Button> : null}
      </div>

      <Card className="mb-4.5">
        <p className="m-0 text-[13px] leading-relaxed text-ink-dim">
          The ladder is data, not code. Tanzania is moving from a seven-year primary cycle to six
          under the Education and Training Policy 2014, 2023 edition, so a school can hold two
          leaving cohorts at the same time. The exit rule is set per year rather than assuming one
          leaving class.
        </p>
      </Card>

      {(ladder.data?.problems ?? []).length > 0 ? (
        <div className="mb-4.5">
          <Notice tone="warn">
            <span className="block font-semibold">
              The promotion run cannot read this ladder yet.
            </span>
            <span className="mt-1 block">{(ladder.data?.problems ?? []).join(' ')}</span>
          </Notice>
        </div>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-4.5 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <Card className="min-w-0 overflow-hidden !p-0">
          <div className="px-4.5 pt-4">
            <CardHeader
              title="The ladder"
              note="Order decides what comes next. Change a level's order to move it."
            />
          </div>

          {ladder.isLoading ? (
            <div className="mx-4.5 mb-4 h-40 animate-pulse rounded bg-line-soft" aria-hidden="true" />
          ) : levels.length === 0 ? (
            <div className="px-4.5 pb-4">
              <Notice tone="warn">
                No levels yet. Nothing can be enrolled, billed or promoted until the school&rsquo;s
                ladder exists — start with the class a child joins at.
              </Notice>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto px-4.5 sm:block">
                <table className="w-full border-collapse text-left text-[13px]">
                  <caption className="sr-only">
                    Every level, in order, and where each one leads
                  </caption>
                  <thead>
                    <tr className="bg-canvas text-[11.5px] tracking-wide text-muted uppercase">
                      <th scope="col" className="px-2 py-2.5 font-semibold">Order</th>
                      <th scope="col" className="px-2 py-2.5 font-semibold">Level</th>
                      <th scope="col" className="px-2 py-2.5 font-semibold">Goes on to</th>
                      <th scope="col" className="px-2 py-2.5 text-right font-semibold">Pupils</th>
                      {structures.data ? (
                        <th scope="col" className="px-2 py-2.5 font-semibold">Fee structure</th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {levels.map((level) => {
                      const step = steps.get(level.id);
                      const next = goesOnTo(
                        step?.outcome ?? 'undefined',
                        step?.next_level_id ? byId.get(step.next_level_id)?.name : undefined,
                      );
                      const leaves = step?.outcome === 'graduate';
                      return (
                        <tr
                          key={level.id}
                          className={`border-t border-line ${leaves ? 'bg-warn-bg/40' : ''}`}
                        >
                          <td className="px-2 py-2.5 text-muted">{level.order_index}</td>
                          <td className="px-2 py-2.5 whitespace-nowrap">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-ink">{level.name}</span>
                              {leaves ? <Pill tone="warn">Leaves school</Pill> : null}
                            </span>
                          </td>
                          <td
                            className={`px-2 py-2.5 whitespace-nowrap ${
                              next.isProblem ? 'font-medium text-bad-ink' : 'text-ink-dim'
                            }`}
                          >
                            {next.text}
                          </td>
                          <td className="px-2 py-2.5 text-right">{pupils.get(level.id) ?? 0}</td>
                          {structures.data ? (
                            <td className="px-2 py-2.5 whitespace-nowrap">
                              <Pill
                                tone={feeStatus.get(level.id) === 'published' ? 'ok' : 'warn'}
                              >
                                {feeStatus.get(level.id) === 'published'
                                  ? 'Published'
                                  : feeStatus.get(level.id) === 'draft'
                                    ? 'Draft'
                                    : 'None'}
                              </Pill>
                            </td>
                          ) : null}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <ul className="m-0 flex list-none flex-col gap-2.5 px-4.5 pb-4 sm:hidden">
                {levels.map((level) => {
                  const step = steps.get(level.id);
                  const next = goesOnTo(
                    step?.outcome ?? 'undefined',
                    step?.next_level_id ? byId.get(step.next_level_id)?.name : undefined,
                  );
                  return (
                    <li key={level.id} className="rounded-[10px] border border-line p-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="m-0 text-sm font-semibold">{level.name}</p>
                        <span className="text-xs whitespace-nowrap text-muted">
                          {pupils.get(level.id) ?? 0} pupils
                        </span>
                      </div>
                      <p
                        className={`mt-1 mb-0 text-xs ${
                          next.isProblem ? 'font-medium text-bad-ink' : 'text-muted'
                        }`}
                      >
                        Goes on to {next.text}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </Card>

        <div className="flex min-w-0 flex-col gap-4.5">
          {exits.length > 1 ? (
            <Card>
              <CardHeader
                title={`Two cohorts leave at the end of ${year?.label ?? 'this year'}`}
              />
              <p className="m-0 mb-3 text-[12.5px] leading-relaxed text-ink-dim">
                Both sit the national primary examination. The December run has to move both out
                and must not be told there is one leaving class.
              </p>
              <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                {exits.map((level) => (
                  <li key={level.id} className="rounded-[10px] border border-line p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="m-0 text-sm font-semibold">{level.name}</p>
                      <Pill tone="neutral">{pupils.get(level.id) ?? 0} pupils</Pill>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-3 mb-0 text-[12.5px] leading-relaxed text-warn-ink">
                {exits.reduce((sum, level) => sum + (pupils.get(level.id) ?? 0), 0)} school leavers
                in one December. Worth telling the office before they order certificates.
              </p>
            </Card>
          ) : null}

          {mayManage && year ? (
            <ExitRule
              key={year.id}
              yearId={year.id}
              yearLabel={year.label}
              years={open}
              onYear={setYearId}
              levels={levels}
              chosen={ladder.data?.exit_level_ids ?? []}
              pupils={pupils}
            />
          ) : null}
        </div>
      </div>

      <AddLevelDialog open={adding} onClose={() => setAdding(false)} levels={levels} />
    </>
  );
}

function ExitRule({
  yearId,
  yearLabel,
  years,
  onYear,
  levels,
  chosen,
  pupils,
}: {
  readonly yearId: string;
  readonly yearLabel: string;
  readonly years: readonly { readonly id: string; readonly label: string }[];
  readonly onYear: (id: string) => void;
  readonly levels: readonly Level[];
  readonly chosen: readonly string[];
  readonly pupils: Map<string, number>;
}) {
  const [picked, setPicked] = useState<readonly string[]>(chosen);
  const save = useSetExitLevels(yearId);

  useEffect(() => setPicked(chosen), [chosen]);

  const dirty =
    [...picked].sort().join() !== [...chosen].sort().join();
  const summary = exitSummary(
    levels
      .filter((level) => picked.includes(level.id))
      .map((level) => ({ name: level.name, pupils: pupils.get(level.id) ?? 0 })),
    yearLabel,
  );

  return (
    <Card>
      <CardHeader title="Set the exit for a year" />
      <div className="flex flex-col gap-3.5">
        <Field label="Academic year">
          <Select value={yearId} onChange={(event) => onYear(event.target.value)}>
            {years.map((year) => (
              <option key={year.id} value={year.id}>
                {year.label}
              </option>
            ))}
          </Select>
        </Field>

        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-2 p-0 text-[13px] font-medium text-ink-soft">
            Levels that leave at the end of it
          </legend>
          <div className="flex flex-col gap-2">
            {levels.map((level) => (
              <label
                key={level.id}
                className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-control border border-line px-3"
              >
                <input
                  type="checkbox"
                  checked={picked.includes(level.id)}
                  onChange={(event) =>
                    setPicked((current) =>
                      event.target.checked
                        ? [...current, level.id]
                        : current.filter((id) => id !== level.id),
                    )
                  }
                  className="h-4.5 w-4.5 flex-none"
                />
                <span className="text-[13px] font-medium">{level.name}</span>
                <span className="ml-auto text-xs text-muted">
                  {pupils.get(level.id) ?? 0} pupils
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <p
          className={`m-0 text-[12.5px] leading-relaxed ${
            picked.length === 0 ? 'text-warn-ink' : 'text-muted'
          }`}
        >
          {summary}
        </p>

        {save.isError ? <Notice>{save.error.message}</Notice> : null}

        <Button
          variant="primary"
          className="w-full"
          disabled={!dirty}
          busy={save.isPending}
          onClick={() =>
            void save.mutateAsync(picked.map((id) => ({ level_id: id, note: null })))
          }
        >
          Save the exit rule
        </Button>
      </div>
    </Card>
  );
}

function AddLevelDialog({
  open,
  onClose,
  levels,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly levels: readonly Level[];
}) {
  const add = useAddLevel();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [stage, setStage] = useState<string>('primary');
  const [order, setOrder] = useState('');

  useEffect(() => {
    if (!open) return;
    setCode('');
    setName('');
    setStage('primary');
    setOrder(String((levels.at(-1)?.order_index ?? 0) + 1));
  }, [open, levels]);

  const taken = levels.some((level) => level.order_index === Number(order));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add a level"
      note="A rung on the ladder. Order decides what comes after what."
    >
      <div className="flex flex-col gap-4">
        <Field label="Name" hint="What a parent and a register call it: “Standard 1”." required>
          <TextInput value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field
          label="Code"
          hint="Short, and what records point at. Renaming the level later is safe; changing this is not."
          required
        >
          <TextInput
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="STD1"
          />
        </Field>
        <Field label="Stage">
          <Select value={stage} onChange={(event) => setStage(event.target.value)}>
            {STAGES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Order"
          hint={
            taken
              ? 'Another level already has this order. Both will be listed, and the promotion run will not know which comes first.'
              : 'Lower comes first. A child in this level is promoted to the next one up.'
          }
          error={undefined}
        >
          <TextInput
            type="number"
            min={0}
            max={100}
            value={order}
            onChange={(event) => setOrder(event.target.value)}
          />
        </Field>
        {taken ? (
          <Notice tone="warn">
            That order is already used. The server records it and reports the clash rather than
            refusing, but the ladder will have a gap in it until one of them is changed.
          </Notice>
        ) : null}
        {add.isError ? <Notice>{add.error.message}</Notice> : null}
        <div className="flex flex-wrap justify-end gap-2.5">
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            busy={add.isPending}
            disabled={!name.trim() || !code.trim() || !order}
            onClick={() => {
              void submit();
            }}
          >
            Add it
          </Button>
        </div>
      </div>
    </Dialog>
  );

  async function submit() {
    await add.mutateAsync({
      code: code.trim(),
      name: name.trim(),
      stage: stage as 'primary',
      order_index: Number(order),
      entry_age: null,
      next_level_id: null,
    });
    onClose();
  }
}
