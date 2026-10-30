/**
 * Starting a fee structure: which year, which class, and what to call it.
 *
 * It creates an empty draft and goes straight to it rather than collecting the
 * fee items here. Prices are the part that gets checked twice, and they belong
 * on a screen where the totals are visible, not in a modal.
 *
 * The year defaults to the one the school is in and the label writes itself,
 * because a bursar setting up eleven levels should be typing amounts, not
 * repeating "Standard 4 2027" eleven times.
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useLevels, useStreams } from '@/api/queries/academic';
import { useCreateStructure, useStructures } from '@/api/queries/fees';
import { useAcademicYears } from '@/api/queries/school';
import { Button, Dialog, Field, Notice, Select, TextInput } from '@/components/ui';

export function StartStructureDialog({
  open,
  onClose,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
}) {
  const navigate = useNavigate();
  const years = useAcademicYears();
  const levels = useLevels(open);
  const streams = useStreams(open);
  const create = useCreateStructure();
  // What is already priced. One structure per level per year is a database
  // constraint, and the reason is worth knowing: two for one level merge in
  // the term run and bill the whole level the sum of both. Showing it here
  // means the bursar does not meet that as a refusal after typing a label.
  const existing = useStructures(open);

  const [yearId, setYearId] = useState('');
  const [levelId, setLevelId] = useState('');
  const [streamId, setStreamId] = useState('');
  const [label, setLabel] = useState('');
  const [touchedLabel, setTouchedLabel] = useState(false);

  const openYears = (years.data ?? []).filter((year) => !year.is_closed);
  const alreadyPriced = (existing.data ?? []).filter(
    (row) => row.academic_year_id === yearId,
  );
  const takenBy = (candidateLevel: string, candidateStream: string) =>
    alreadyPriced.find(
      (row) =>
        row.level_id === candidateLevel && (row.stream_id ?? '') === candidateStream,
    );
  const clash = levelId ? takenBy(levelId, streamId) : undefined;
  const year = openYears.find((candidate) => candidate.id === yearId);
  const level = (levels.data ?? []).find((candidate) => candidate.id === levelId);
  const forLevel = (streams.data ?? []).filter((stream) => stream.level_id === levelId);

  // Default to the current year once the years arrive, and to the first level.
  useEffect(() => {
    if (!open) return;
    setYearId((current) => current || (openYears.find((y) => y.is_current)?.id ?? ''));
    setLevelId((current) => current || ((levels.data ?? []).at(0)?.id ?? ''));
  }, [open, openYears, levels.data]);

  // The label follows the choices until somebody types their own.
  useEffect(() => {
    if (touchedLabel) return;
    const stream = forLevel.find((candidate) => candidate.id === streamId);
    const parts = [level?.name, stream?.name, year?.label].filter(Boolean);
    setLabel(parts.join(' '));
  }, [touchedLabel, level?.name, year?.label, streamId, forLevel]);

  // A level with no streams must not keep a stream chosen for another one.
  useEffect(() => {
    if (!forLevel.some((stream) => stream.id === streamId)) setStreamId('');
  }, [forLevel, streamId]);

  async function submit() {
    if (!yearId || !levelId) return;
    const detail = await create.mutateAsync({
      academic_year_id: yearId,
      level_id: levelId,
      stream_id: streamId || null,
      label: label.trim() || `${level?.name ?? 'Structure'} ${year?.label ?? ''}`.trim(),
    });
    onClose();
    void navigate(`/fees/structures/${detail.structure.id}`);
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Start a fee structure"
      note="It begins as a draft. Nothing is billed from a draft."
    >
      <div className="flex flex-col gap-4">
        <Field label="Academic year" required>
          <Select value={yearId} onChange={(event) => setYearId(event.target.value)}>
            {openYears.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
                {option.is_current ? ' (this year)' : ''}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Class level" required>
          <Select value={levelId} onChange={(event) => setLevelId(event.target.value)}>
            {(levels.data ?? []).map((option) => {
              const taken = takenBy(option.id, '');
              return (
                <option key={option.id} value={option.id}>
                  {option.name}
                  {taken ? ` — already ${taken.status}` : ''}
                </option>
              );
            })}
          </Select>
        </Field>

        {forLevel.length > 0 ? (
          <Field
            label="Stream"
            hint="Leave it on the whole level unless one stream is charged differently — boarders, usually."
          >
            <Select value={streamId} onChange={(event) => setStreamId(event.target.value)}>
              <option value="">The whole level</option>
              {forLevel.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}

        <Field label="Name it" hint="What the office will look for in the list.">
          <TextInput
            value={label}
            onChange={(event) => {
              setTouchedLabel(true);
              setLabel(event.target.value);
            }}
            placeholder="Standard 4 2027"
          />
        </Field>

        {clash ? (
          <Notice tone="warn">
            {streamId ? 'That stream' : 'That level'} already has a structure for the year
            &mdash; &ldquo;{clash.label}&rdquo;, {clash.status}. One level can only be priced
            once, because two structures would bill every child in it from both.{' '}
            <Link
              to={`/fees/structures/${clash.id}`}
              className="font-semibold text-warn-ink underline"
              onClick={onClose}
            >
              Open that one instead
            </Link>
            {clash.status === 'draft' ? ', or discard it there if it was a mistake' : null}.
          </Notice>
        ) : null}

        {create.isError ? <Notice>{create.error.message}</Notice> : null}

        <div className="flex flex-wrap justify-end gap-2.5">
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            busy={create.isPending}
            disabled={!yearId || !levelId || Boolean(clash)}
            onClick={() => void submit()}
          >
            Start the draft
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
