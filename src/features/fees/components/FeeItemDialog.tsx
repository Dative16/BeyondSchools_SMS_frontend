/**
 * One line of a fee structure, added or corrected.
 *
 * The three fields that are not the obvious two — category, frequency and
 * whether it is compulsory — are here because each changes what the term run
 * does, and none of them can be inferred from a name. "Transport, 60,000"
 * tells the system nothing about whether every child pays it or only the ones
 * on the bus, and getting that wrong bills a whole level for a bus they do not
 * take.
 *
 * It validates before it closes. A dialog that accepts an amount and shows the
 * server's 422 behind it has thrown away what was typed.
 */

import { useEffect, useState } from 'react';

import type { FeeItemBody } from '@/api/queries/fees';
import type { Term } from '@/api/queries/school';
import { Button, Dialog, Field, Notice, Select, TextInput } from '@/components/ui';
import { FEE_CATEGORY_OPTIONS } from '@/domain/fees';

/** "Every term" is the common case and the one a blank form should offer. */
const BLANK = {
  name: '',
  amount: '',
  category: 'tuition',
  frequency: 'per_term',
  term_index: '',
  is_mandatory: true,
};

type Draft = typeof BLANK;

const toDraft = (item: FeeItemBody | null): Draft =>
  item
    ? {
        name: item.name,
        amount: String(item.amount),
        category: item.category,
        frequency: item.frequency,
        term_index: item.term_index === null ? '' : String(item.term_index),
        is_mandatory: item.is_mandatory ?? true,
      }
    : BLANK;

export function FeeItemDialog({
  open,
  onClose,
  onSave,
  item,
  terms,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onSave: (item: FeeItemBody) => void;
  /** The item being corrected, or null to add a new one. */
  readonly item: FeeItemBody | null;
  readonly terms: readonly Term[];
}) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(item));
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({});

  // Reopening for a different row must not show the last one's values.
  useEffect(() => {
    if (open) {
      setDraft(toDraft(item));
      setErrors({});
    }
  }, [open, item]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  function submit() {
    const name = draft.name.trim();
    const amount = Number(draft.amount);
    const found: Partial<Record<keyof Draft, string>> = {};

    if (!name) found.name = 'Give it a name. It is printed on the invoice as it is typed here.';
    if (!draft.amount.trim()) found.amount = 'How much is it?';
    else if (!Number.isFinite(amount) || amount < 0) found.amount = 'Enter an amount in shillings, digits only.';

    setErrors(found);
    if (Object.keys(found).length > 0) return;

    onSave({
      name,
      amount: amount.toFixed(2),
      category: draft.category as FeeItemBody['category'],
      frequency: draft.frequency as FeeItemBody['frequency'],
      // Only a per-term item can be pinned to one term. An annual one is
      // billed in the first term by rule, and a one-off belongs to joining.
      term_index:
        draft.frequency === 'per_term' && draft.term_index ? Number(draft.term_index) : null,
      is_mandatory: draft.is_mandatory,
    });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={item ? 'Correct this fee item' : 'Add a fee item'}
      note="It becomes a line on every invoice this structure raises."
    >
      <div className="flex flex-col gap-4">
        <Field label="What is it" error={errors.name} required>
          <TextInput
            value={draft.name}
            onChange={(event) => set('name', event.target.value)}
            placeholder="Tuition"
            autoComplete="off"
          />
        </Field>

        <Field label="Amount, TZS" error={errors.amount} required>
          <TextInput
            value={draft.amount}
            onChange={(event) => set('amount', event.target.value)}
            inputMode="decimal"
            placeholder="240000"
          />
        </Field>

        <Field label="Category" hint="Used for reporting. It does not change what is billed.">
          <Select value={draft.category} onChange={(event) => set('category', event.target.value)}>
            {FEE_CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="When is it billed">
          <Select
            value={draft.frequency}
            onChange={(event) => set('frequency', event.target.value)}
          >
            <option value="per_term">Every term</option>
            <option value="annual">Once a year, with the first term</option>
            <option value="one_off">Once, when a child joins</option>
          </Select>
        </Field>

        {draft.frequency === 'per_term' ? (
          <Field
            label="Which term"
            hint="Leave it on every term unless this is charged in one term only."
          >
            <Select
              value={draft.term_index}
              onChange={(event) => set('term_index', event.target.value)}
            >
              <option value="">Every term</option>
              {terms.map((term) => (
                <option key={term.id} value={String(term.index)}>
                  {term.label} only
                </option>
              ))}
            </Select>
          </Field>
        ) : null}

        <label className="flex items-start gap-2.5 text-[13px] text-ink-soft">
          <input
            type="checkbox"
            checked={draft.is_mandatory}
            onChange={(event) => set('is_mandatory', event.target.checked)}
            className="mt-0.5 h-4.5 w-4.5 flex-none"
          />
          <span>
            Every pupil pays this.
            <span className="block text-muted">
              Clear it for something only some children take, such as the bus or boarding.
            </span>
          </span>
        </label>

        {draft.frequency === 'one_off' ? (
          <Notice tone="info">
            A one-off lands on the invoice a child joins with, and on no term invoice. It is how an
            admission fee is charged once and never again.
          </Notice>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2.5">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit}>
            {item ? 'Save the change' : 'Add it'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
