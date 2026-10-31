/**
 * Academic years and terms. Built to `AcademicYears.dc.html`.
 *
 * The screen that has to exist before any other: term dates decide when fees
 * fall due and which term a mark belongs to, so until a year has them the
 * school cannot be billed or marked.
 *
 * Two things the artboard shows that are deliberately different here.
 *
 * It draws a **fees due** date per term. There is no such field, and adding
 * one would mean two places could disagree about when a bill is late. The due
 * date is worked out from the day an invoice is issued plus the school's grace
 * period, which is one rule in one place — so this shows that rule, read-only,
 * and says where to change it.
 *
 * It offers no way to reopen a closed year, and neither does this. Reopening
 * one would change what a report card means after it was handed to a family.
 */

import { useEffect, useState } from 'react';

import { useLadder, useMakeTermCurrent, useMakeYearCurrent, useOpenYear, useSaveTerms, useTermsOf } from '@/api/queries/setup';
import type { AcademicYear, Term } from '@/api/queries/setup';
import { useAcademicYears, useSchool } from '@/api/queries/school';
import { useStructures } from '@/api/queries/fees';
import {
  Button,
  Card,
  CardHeader,
  Dialog,
  Field,
  Notice,
  Pill,
  TextInput,
} from '@/components/ui';
import type { Tone } from '@/components/ui';
import {
  YEAR_STATE_LABELS,
  beforeYearCanBeCurrent,
  termProblems,
  yearIsEditable,
  yearState,
} from '@/domain/setup';
import type { YearState } from '@/domain/setup';
import { useAuth } from '@/features/auth/AuthProvider';
import { longDate } from '@/lib/format';

const TONES: Record<YearState, Tone> = {
  closed: 'neutral',
  current: 'ok',
  open: 'info',
  'not-set-up': 'warn',
};

interface Draft {
  readonly index: number;
  readonly label: string;
  readonly startsOn: string;
  readonly endsOn: string;
}

const fromTerms = (terms: readonly Term[]): Draft[] =>
  terms
    .map((term) => ({
      index: term.index,
      label: term.label,
      startsOn: term.starts_on,
      endsOn: term.ends_on,
    }))
    .sort((a, b) => a.index - b.index);

export default function YearsPage() {
  const { can } = useAuth();
  const mayManage = can('academic:manage');

  const years = useAcademicYears();
  const school = useSchool();
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);

  const sorted = [...(years.data ?? [])].sort((a, b) => a.label.localeCompare(b.label));
  const year = sorted.find((each) => each.id === chosenId) ?? sorted.find((each) => each.is_current) ?? sorted.at(-1);

  const terms = useTermsOf(year?.id);
  const ladder = useLadder(year?.id);
  const structures = useStructures(can('fee_structure:manage'));

  return (
    <>
      <div className="mb-4.5 flex flex-wrap items-end justify-between gap-3.5">
        <div className="min-w-0">
          <h1 className="m-0 mb-1 font-display text-[26px] font-semibold tracking-[-0.02em]">
            Academic years and terms
          </h1>
          <p className="m-0 text-sm text-muted">
            Term dates decide when invoices fall due and which term a mark belongs to.
          </p>
        </div>
        {mayManage ? (
          <Button variant="primary" onClick={() => setOpening(true)}>
            Open a new year
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 items-start gap-4.5 xl:grid-cols-[20rem_minmax(0,1fr)]">
        <Card>
          <CardHeader
            title="Years"
            note="Exactly one year is current at a time. A year closes when its promotion run is committed, not on a date."
          />
          {years.isLoading ? (
            <div className="h-24 animate-pulse rounded bg-line-soft" aria-hidden="true" />
          ) : sorted.length === 0 ? (
            <p className="m-0 text-[13px] text-muted">
              No years yet. Open one — nothing can be billed or marked until a year has terms.
            </p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
              {sorted.map((each) => (
                <li key={each.id}>
                  <YearRow
                    year={each}
                    chosen={each.id === year?.id}
                    onChoose={() => setChosenId(each.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="flex min-w-0 flex-col gap-4.5">
          {year ? (
            <TermsPanel
              key={year.id}
              year={year}
              terms={terms.data ?? []}
              loading={terms.isLoading}
              mayManage={mayManage}
              graceDays={school.data?.invoice_grace_days ?? 14}
            />
          ) : null}

          {year && !year.is_closed && !year.is_current && mayManage ? (
            <BeforeItCanBeCurrent
              year={year}
              terms={terms.data ?? []}
              levelsWithoutFees={(ladder.data?.levels ?? [])
                .filter(
                  (level) =>
                    level.is_active &&
                    !(structures.data ?? []).some(
                      (row) =>
                        row.level_id === level.id &&
                        row.academic_year_id === year.id &&
                        row.status === 'published',
                    ),
                )
                .map((level) => level.name)}
              knowsAboutFees={Boolean(structures.data)}
              hasLadderProblems={(ladder.data?.problems ?? []).length > 0}
            />
          ) : null}

          {year?.is_closed ? (
            <Card>
              <CardHeader title="This year is closed" />
              <p className="m-0 text-[13px] leading-relaxed text-muted">
                Its term dates, marks and invoices are fixed. Reopening a closed year would change
                what a report card means after it was handed to a family, so there is no button for
                it: ask a platform administrator, who will record why.
              </p>
            </Card>
          ) : null}
        </div>
      </div>

      <OpenYearDialog
        open={opening}
        onClose={() => setOpening(false)}
        existing={sorted}
        onOpened={(created) => setChosenId(created.id)}
      />
    </>
  );
}

function YearRow({
  year,
  chosen,
  onChoose,
}: {
  readonly year: AcademicYear;
  readonly chosen: boolean;
  readonly onChoose: () => void;
}) {
  const terms = useTermsOf(year.id);
  const state = yearState({
    label: year.label,
    isCurrent: year.is_current,
    isClosed: year.is_closed,
    termCount: terms.data?.length ?? 0,
  });

  return (
    <button
      type="button"
      aria-pressed={chosen}
      onClick={onChoose}
      className={`w-full rounded-[10px] px-3.5 py-3 text-left ${
        chosen ? 'border-2 border-brand-strong bg-brand-soft' : 'border border-line bg-white'
      }`}
    >
      <span className="mb-0.5 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">{year.label}</span>
        <Pill tone={TONES[state]}>{YEAR_STATE_LABELS[state]}</Pill>
      </span>
      <span className="block text-xs text-muted">
        {terms.isLoading
          ? '…'
          : terms.data?.length
            ? `${terms.data.length} ${terms.data.length === 1 ? 'term' : 'terms'} · ${longDate(year.starts_on)} to ${longDate(year.ends_on)}`
            : 'Term dates not set'}
      </span>
    </button>
  );
}

function TermsPanel({
  year,
  terms,
  loading,
  mayManage,
  graceDays,
}: {
  readonly year: AcademicYear;
  readonly terms: readonly Term[];
  readonly loading: boolean;
  readonly mayManage: boolean;
  readonly graceDays: number;
}) {
  const [drafts, setDrafts] = useState<Draft[]>(() => fromTerms(terms));
  const save = useSaveTerms(year.id);
  const makeCurrent = useMakeTermCurrent();

  // Switching year, or a save landing, replaces what is being edited.
  useEffect(() => setDrafts(fromTerms(terms)), [terms]);

  const editable = mayManage && yearIsEditable({
    label: year.label,
    isCurrent: year.is_current,
    isClosed: year.is_closed,
    termCount: terms.length,
  });
  const problems = termProblems(drafts, year);
  const dirty = JSON.stringify(drafts) !== JSON.stringify(fromTerms(terms));

  function set(index: number, field: 'startsOn' | 'endsOn' | 'label', value: string) {
    setDrafts((current) =>
      current.map((draft, at) => (at === index ? { ...draft, [field]: value } : draft)),
    );
  }

  function addTerm() {
    setDrafts((current) => [
      ...current,
      {
        index: (current.at(-1)?.index ?? 0) + 1,
        label: `Term ${(current.at(-1)?.index ?? 0) + 1}`,
        startsOn: '',
        endsOn: '',
      },
    ]);
  }

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="m-0 font-display text-[15px] font-semibold">{year.label} terms</h2>
        {year.is_current ? <Pill tone="ok">Current</Pill> : null}
      </div>
      <p className="m-0 mb-4 text-[12.5px] leading-relaxed text-muted">
        {year.is_closed
          ? 'Fixed when the year closed. Shown for reference.'
          : 'A mark entered on a day outside every range is refused rather than guessed at.'}
      </p>

      {loading ? (
        <div className="h-32 animate-pulse rounded bg-line-soft" aria-hidden="true" />
      ) : drafts.length === 0 ? (
        <Notice tone="warn">
          No terms yet. A year without them cannot have a fee due date worked out or a mark filed,
          so the school cannot be moved into it.
        </Notice>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {drafts.map((draft, index) => {
            const saved = terms.find((term) => term.index === draft.index);
            return (
              <li key={draft.index} className="rounded-[10px] border border-line p-3.5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="m-0 text-sm font-semibold">{draft.label}</p>
                    {saved?.is_current ? <Pill tone="ok">Current term</Pill> : null}
                  </div>
                  {mayManage && saved && !saved.is_current && !year.is_closed ? (
                    <Button
                      size="sm"
                      busy={makeCurrent.isPending}
                      onClick={() => void makeCurrent.mutateAsync(saved.id)}
                    >
                      Make current
                    </Button>
                  ) : null}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Starts">
                    <TextInput
                      type="date"
                      value={draft.startsOn}
                      disabled={!editable}
                      onChange={(event) => set(index, 'startsOn', event.target.value)}
                    />
                  </Field>
                  <Field label="Ends">
                    <TextInput
                      type="date"
                      value={draft.endsOn}
                      disabled={!editable}
                      onChange={(event) => set(index, 'endsOn', event.target.value)}
                    />
                  </Field>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-3.5 mb-0 rounded-control bg-canvas px-3 py-2.5 text-[12.5px] leading-relaxed text-muted">
        <strong className="font-semibold text-ink-soft">When fees fall due</strong> is not set per
        term. A bill is due {graceDays} days after it is issued, which is one rule in one place
        rather than three dates that can disagree. Change it under School settings.
      </p>

      {problems.length > 0 && dirty ? (
        <div className="mt-3.5">
          <Notice tone="warn">
            <span className="block font-semibold">These dates cannot be saved yet.</span>
            <span className="mt-1 block">{problems.join(' ')}</span>
          </Notice>
        </div>
      ) : null}

      {save.isError ? (
        <div className="mt-3.5">
          <Notice>{save.error.message}</Notice>
        </div>
      ) : null}

      {editable ? (
        <div className="mt-4 flex flex-wrap gap-2.5 border-t border-line pt-4">
          <Button
            variant="primary"
            disabled={!dirty || problems.length > 0}
            busy={save.isPending}
            onClick={() =>
              void save.mutateAsync(
                drafts.map((draft) => ({
                  index: draft.index,
                  label: draft.label,
                  starts_on: draft.startsOn,
                  ends_on: draft.endsOn,
                })),
              )
            }
          >
            Save term dates
          </Button>
          <Button onClick={addTerm}>Add a term</Button>
          {dirty ? (
            <Button variant="ghost" onClick={() => setDrafts(fromTerms(terms))}>
              Undo
            </Button>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

/**
 * What a school admin has to go and do before this year can be the one the
 * school is in. A list, not a block: the server refuses the switch on its own
 * terms, and what is useful here is knowing where to go.
 */
function BeforeItCanBeCurrent({
  year,
  terms,
  levelsWithoutFees,
  knowsAboutFees,
  hasLadderProblems,
}: {
  readonly year: AcademicYear;
  readonly terms: readonly Term[];
  readonly levelsWithoutFees: readonly string[];
  readonly knowsAboutFees: boolean;
  readonly hasLadderProblems: boolean;
}) {
  const makeCurrent = useMakeYearCurrent();
  const needed = beforeYearCanBeCurrent({
    termCount: terms.length,
    termProblems: termProblems(fromTerms(terms), year),
    levelsWithoutFees: knowsAboutFees ? levelsWithoutFees : [],
    hasLadderProblems,
  });

  return (
    <Card>
      <CardHeader
        title={needed.length === 0 ? `${year.label} is ready` : `Before ${year.label} can be current`}
      />
      {needed.length === 0 ? (
        <p className="m-0 mb-3.5 text-[13px] leading-relaxed text-ink-dim">
          Its terms are set and every level can be billed. Moving the school into it changes what
          the top bar says, which term a mark lands in and which year a new child is enrolled into.
        </p>
      ) : (
        <ul className="m-0 mb-3.5 flex list-none flex-col gap-2.5 p-0">
          {needed.map((item) => (
            <li key={item} className="flex gap-2.5 text-[12.5px] leading-relaxed text-warn-ink">
              <span
                className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-warn-ink"
                aria-hidden="true"
              />
              {item}
            </li>
          ))}
        </ul>
      )}
      {makeCurrent.isError ? (
        <div className="mb-3.5">
          <Notice>{makeCurrent.error.message}</Notice>
        </div>
      ) : null}
      <Button
        variant="primary"
        disabled={needed.length > 0}
        busy={makeCurrent.isPending}
        onClick={() => void makeCurrent.mutateAsync(year.id)}
      >
        Move the school into {year.label}
      </Button>
    </Card>
  );
}

function OpenYearDialog({
  open,
  onClose,
  existing,
  onOpened,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly existing: readonly AcademicYear[];
  readonly onOpened: (year: AcademicYear) => void;
}) {
  const next = String(
    Math.max(
      new Date().getFullYear(),
      ...existing.map((year) => Number(year.label)).filter(Number.isFinite),
    ) + 1,
  );
  const [label, setLabel] = useState(next);
  const [startsOn, setStartsOn] = useState(`${next}-01-08`);
  const [endsOn, setEndsOn] = useState(`${next}-12-04`);
  const openYear = useOpenYear();

  useEffect(() => {
    if (!open) return;
    setLabel(next);
    setStartsOn(`${next}-01-08`);
    setEndsOn(`${next}-12-04`);
  }, [open, next]);

  async function submit() {
    const created = await openYear.mutateAsync({
      label: label.trim(),
      starts_on: startsOn,
      ends_on: endsOn,
      // Never on creation. A year becomes current once its terms are set and
      // every level can be billed, which is a separate decision with its own
      // checklist — and doing it here would move the whole school by accident.
      make_current: false,
    });
    onOpened(created);
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Open a new year"
      note="It does not become the current year until its terms are set."
    >
      <div className="flex flex-col gap-4">
        <Field label="Year" hint="What the office calls it, and what appears on an invoice.">
          <TextInput value={label} onChange={(event) => setLabel(event.target.value)} />
        </Field>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <Field label="First day">
            <TextInput
              type="date"
              value={startsOn}
              onChange={(event) => setStartsOn(event.target.value)}
            />
          </Field>
          <Field label="Last day">
            <TextInput
              type="date"
              value={endsOn}
              onChange={(event) => setEndsOn(event.target.value)}
            />
          </Field>
        </div>
        {openYear.isError ? <Notice>{openYear.error.message}</Notice> : null}
        <div className="flex flex-wrap justify-end gap-2.5">
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            busy={openYear.isPending}
            disabled={!label.trim() || !startsOn || !endsOn}
            onClick={() => void submit()}
          >
            Open it
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
