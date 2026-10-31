/**
 * School settings. Built to `SchoolSettings.dc.html`.
 *
 * The artboard's own warning is the right frame for the whole screen: these
 * change how the system behaves, not just how it looks. The deposit decides
 * what an offer asks a family for; the grace period decides when a balance
 * becomes arrears; the two arrears switches decide whether a child's results
 * or promotion are withheld over money. So each one says what it will do in a
 * sentence, with the school's own figures in it, rather than leaving a number
 * in a box.
 *
 * Nothing already raised is touched. An invoice keeps the figures it was
 * raised with, which is the same rule that freezes a published fee structure.
 *
 * The logo is a URL rather than an upload. There is no endpoint that takes a
 * school logo — the presigned upload that exists is scoped to a pupil's
 * documents — and inventing one here would mean a button that cannot work.
 */

import { useEffect, useState } from 'react';

import { useSchool } from '@/api/queries/school';
import {
  useAddSchoolField,
  useSchoolFields,
  useUpdateSchool,
  useUpdateSchoolField,
} from '@/api/queries/setup';
import type { SchoolField } from '@/api/queries/setup';
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
import { arrearsSentence, depositSentence, graceSentence } from '@/domain/setup';
import { useAuth } from '@/features/auth/AuthProvider';

const KINDS = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'A number' },
  { value: 'date', label: 'A date' },
  { value: 'boolean', label: 'Yes or no' },
  { value: 'choice', label: 'One of a list' },
] as const;

export default function SchoolSettingsPage() {
  const { can } = useAuth();
  const mayManage = can('school:manage');

  const school = useSchool();
  const save = useUpdateSchool();
  const fields = useSchoolFields();

  const [draft, setDraft] = useState({
    name: '',
    short_name: '',
    registration_number: '',
    address: '',
    admission_no_format: '',
    deposit_percent: '',
    invoice_grace_days: '',
    arrears_blocks_results: false,
    arrears_blocks_promotion: false,
    brand_color: '',
    logo_url: '',
  });
  const [editingField, setEditingField] = useState<SchoolField | null>(null);
  const [addingField, setAddingField] = useState(false);

  useEffect(() => {
    const current = school.data;
    if (!current) return;
    setDraft({
      name: current.name,
      short_name: current.short_name ?? '',
      registration_number: current.registration_number ?? '',
      address: current.address ?? '',
      admission_no_format: current.admission_no_format,
      deposit_percent: String(current.deposit_percent),
      invoice_grace_days: String(current.invoice_grace_days),
      arrears_blocks_results: current.arrears_blocks_results,
      arrears_blocks_promotion: current.arrears_blocks_promotion,
      brand_color: current.brand_color ?? '',
      logo_url: current.logo_url ?? '',
    });
  }, [school.data]);

  const set = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const dirty =
    school.data !== undefined &&
    (draft.name !== school.data.name ||
      draft.short_name !== (school.data.short_name ?? '') ||
      draft.registration_number !== (school.data.registration_number ?? '') ||
      draft.address !== (school.data.address ?? '') ||
      draft.admission_no_format !== school.data.admission_no_format ||
      draft.deposit_percent !== String(school.data.deposit_percent) ||
      draft.invoice_grace_days !== String(school.data.invoice_grace_days) ||
      draft.arrears_blocks_results !== school.data.arrears_blocks_results ||
      draft.arrears_blocks_promotion !== school.data.arrears_blocks_promotion ||
      draft.brand_color !== (school.data.brand_color ?? '') ||
      draft.logo_url !== (school.data.logo_url ?? ''));

  if (!mayManage) {
    return (
      <Card>
        <CardHeader title="This account cannot change the school's settings" />
        <p className="m-0 text-sm leading-relaxed text-muted">
          These decide what an offer asks a family for and when a balance becomes arrears. Ask the
          school admin.
        </p>
      </Card>
    );
  }

  return (
    <>
      <div className="mb-4.5">
        <h1 className="m-0 mb-1 font-display text-[26px] font-semibold tracking-[-0.02em]">
          School settings
        </h1>
        <p className="m-0 text-sm text-muted">
          {school.data?.name ?? '—'} &middot; these settings apply to this school only.
        </p>
      </div>

      <div className="flex max-w-3xl flex-col gap-4.5">
        <Card>
          <CardHeader title="Name and identity" />
          <div className="flex flex-col gap-4">
            <Field
              label="School name"
              hint="Appears on invoices, offer letters and the parent portal."
              required
            >
              <TextInput value={draft.name} onChange={(e) => set('name', e.target.value)} />
            </Field>
            <Field
              label="Short name"
              hint="Used where a message pays for every character — an SMS costs double past 160."
            >
              <TextInput
                value={draft.short_name}
                onChange={(e) => set('short_name', e.target.value)}
                placeholder={draft.name}
              />
            </Field>
            <Field label="Registration number">
              <TextInput
                value={draft.registration_number}
                onChange={(e) => set('registration_number', e.target.value)}
              />
            </Field>
            <Field
              label="Admission number format"
              hint="Only {year} and {sequence} are understood. A format that could reference anything else could not be checked."
            >
              <TextInput
                value={draft.admission_no_format}
                onChange={(e) => set('admission_no_format', e.target.value)}
                placeholder="MPS/{year}/{sequence:04d}"
              />
            </Field>
            <Field label="Postal address">
              <TextInput value={draft.address} onChange={(e) => set('address', e.target.value)} />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Fee rules"
            note="These change how the system behaves, not just how it looks. Read each sentence before you change it."
          />
          <div className="flex flex-col gap-4.5">
            <div>
              <Field label="Deposit on an offer" hint="Per cent of the first term's fees.">
                <TextInput
                  type="number"
                  min={0}
                  max={100}
                  value={draft.deposit_percent}
                  onChange={(e) => set('deposit_percent', e.target.value)}
                />
              </Field>
              <p className="mt-1.5 mb-0 text-[12.5px] text-muted">
                {depositSentence(Number(draft.deposit_percent))}
              </p>
            </div>

            <div>
              <Field label="Invoice grace period" hint="Days.">
                <TextInput
                  type="number"
                  min={0}
                  max={365}
                  value={draft.invoice_grace_days}
                  onChange={(e) => set('invoice_grace_days', e.target.value)}
                />
              </Field>
              <p className="mt-1.5 mb-0 text-[12.5px] text-muted">
                {graceSentence(Number(draft.invoice_grace_days))}
              </p>
            </div>

            <Switch
              label="Arrears hold back results"
              on={draft.arrears_blocks_results}
              onChange={(value) => set('arrears_blocks_results', value)}
              sentence={arrearsSentence('results', draft.arrears_blocks_results)}
            />
            <Switch
              label="Arrears hold back promotion"
              on={draft.arrears_blocks_promotion}
              onChange={(value) => set('arrears_blocks_promotion', value)}
              sentence={arrearsSentence('promotion', draft.arrears_blocks_promotion)}
            />
          </div>
        </Card>

        <Card className="overflow-hidden !p-0">
          <div className="px-4.5 pt-4">
            <CardHeader
              title="Pupil fields this school adds"
              note="Each one appears, empty, on every pupil record. Somebody has to fill them in."
            />
          </div>
          {fields.isLoading ? (
            <div className="mx-4.5 mb-4 h-20 animate-pulse rounded bg-line-soft" aria-hidden="true" />
          ) : (fields.data ?? []).length === 0 ? (
            <div className="px-4.5 pb-1">
              <p className="m-0 text-[13px] text-muted">
                None. The system asks for what every school needs; this is for what only yours
                does.
              </p>
            </div>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2 px-4.5 pb-1">
              {(fields.data ?? []).map((field) => (
                <li
                  key={field.id}
                  className="flex flex-wrap items-center gap-3 rounded-[10px] border border-line p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="m-0 flex flex-wrap items-center gap-2 text-sm font-semibold">
                      {field.label}
                      {field.is_sensitive ? <Pill tone="warn">Sensitive</Pill> : null}
                      {!field.is_active ? <Pill tone="neutral">Retired</Pill> : null}
                    </p>
                    <p className="m-0 text-xs text-muted">
                      {field.key} &middot; {field.kind}
                      {field.options?.length ? ` · ${field.options.join(', ')}` : null}
                      {field.required_at_registration ? ' · asked on the public form' : null}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => setEditingField(field)}>
                    Edit
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <div className="px-4.5 pt-3 pb-4">
            <Button onClick={() => setAddingField(true)}>Add a field</Button>
          </div>
        </Card>

        <Card>
          <CardHeader title="Brand" />
          <div className="flex flex-col gap-4">
            <Field
              label="Logo"
              hint="A URL. There is no upload for a school logo yet — the presigned upload that exists is scoped to a pupil's documents."
            >
              <TextInput
                value={draft.logo_url}
                onChange={(e) => set('logo_url', e.target.value)}
                placeholder="https://…"
              />
            </Field>
            <Field label="Brand colour" hint="Used on the portal and on a printed invoice.">
              <div className="flex items-center gap-2.5">
                <TextInput
                  value={draft.brand_color}
                  onChange={(e) => set('brand_color', e.target.value)}
                  placeholder="#22C55E"
                />
                <span
                  aria-hidden="true"
                  className="h-11 w-11 flex-none rounded-control border border-line"
                  style={{ background: draft.brand_color || 'transparent' }}
                />
              </div>
            </Field>
          </div>
        </Card>

        {save.isError ? <Notice>{save.error.message}</Notice> : null}

        <Card>
          <CardHeader title="Saving" />
          <p className="m-0 mb-3.5 text-[13px] leading-relaxed text-muted">
            Changing the deposit or the grace period affects offers and invoices raised from now
            on. Those already raised keep the old figures.
          </p>
          <div className="flex flex-wrap gap-2.5">
            <Button
              variant="primary"
              disabled={!dirty || !draft.name.trim()}
              busy={save.isPending}
              onClick={() =>
                void save.mutateAsync({
                  name: draft.name.trim(),
                  short_name: draft.short_name.trim() || null,
                  registration_number: draft.registration_number.trim() || null,
                  address: draft.address.trim() || null,
                  admission_no_format: draft.admission_no_format.trim(),
                  deposit_percent: Number(draft.deposit_percent),
                  invoice_grace_days: Number(draft.invoice_grace_days),
                  arrears_blocks_results: draft.arrears_blocks_results,
                  arrears_blocks_promotion: draft.arrears_blocks_promotion,
                  brand_color: draft.brand_color.trim() || null,
                  logo_url: draft.logo_url.trim() || null,
                })
              }
            >
              Save settings
            </Button>
            {dirty && school.data ? (
              <Button
                variant="ghost"
                onClick={() => {
                  const current = school.data;
                  setDraft({
                    name: current.name,
                    short_name: current.short_name ?? '',
                    registration_number: current.registration_number ?? '',
                    address: current.address ?? '',
                    admission_no_format: current.admission_no_format,
                    deposit_percent: String(current.deposit_percent),
                    invoice_grace_days: String(current.invoice_grace_days),
                    arrears_blocks_results: current.arrears_blocks_results,
                    arrears_blocks_promotion: current.arrears_blocks_promotion,
                    brand_color: current.brand_color ?? '',
                    logo_url: current.logo_url ?? '',
                  });
                }}
              >
                Undo
              </Button>
            ) : null}
          </div>
        </Card>
      </div>

      <FieldDialog
        open={addingField || editingField !== null}
        onClose={() => {
          setAddingField(false);
          setEditingField(null);
        }}
        field={editingField}
        pupilCount={undefined}
      />
    </>
  );
}

function Switch({
  label,
  on,
  onChange,
  sentence,
}: {
  readonly label: string;
  readonly on: boolean;
  readonly onChange: (on: boolean) => void;
  readonly sentence: string;
}) {
  return (
    <div className="rounded-[10px] border border-line p-3.5">
      <label className="flex items-start gap-2.5">
        <input
          type="checkbox"
          checked={on}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-0.5 h-4.5 w-4.5 flex-none"
        />
        <span className="min-w-0">
          <span className="block text-sm font-semibold">{label}</span>
          <span className={`mt-1 block text-[12.5px] leading-relaxed ${on ? 'text-warn-ink' : 'text-muted'}`}>
            {sentence}
          </span>
        </span>
      </label>
    </div>
  );
}

function FieldDialog({
  open,
  onClose,
  field,
  pupilCount,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly field: SchoolField | null;
  readonly pupilCount: number | undefined;
}) {
  const add = useAddSchoolField();
  const update = useUpdateSchoolField(field?.id ?? 'none');

  const [key, setKey] = useState('');
  const [label, setLabel] = useState('');
  const [kind, setKind] = useState<string>('text');
  const [help, setHelp] = useState('');
  const [options, setOptions] = useState('');
  const [sensitive, setSensitive] = useState(false);
  const [onPublicForm, setOnPublicForm] = useState(false);
  const [retired, setRetired] = useState(false);

  useEffect(() => {
    if (!open) return;
    setKey(field?.key ?? '');
    setLabel(field?.label ?? '');
    setKind(field?.kind ?? 'text');
    setHelp(field?.help_text ?? '');
    setOptions((field?.options ?? []).join(', '));
    setSensitive(field?.is_sensitive ?? false);
    setOnPublicForm(field?.required_at_registration ?? false);
    setRetired(field ? !field.is_active : false);
  }, [open, field]);

  const optionList = options
    .split(',')
    .map((each) => each.trim())
    .filter(Boolean);

  async function submit() {
    if (field) {
      await update.mutateAsync({
        label: label.trim(),
        help_text: help.trim() || null,
        options: kind === 'choice' ? optionList : null,
        required_at_registration: onPublicForm,
        is_sensitive: sensitive,
        is_active: !retired,
      });
    } else {
      await add.mutateAsync({
        key: key.trim(),
        label: label.trim(),
        kind: kind as 'text',
        scope: 'student',
        help_text: help.trim() || null,
        options: kind === 'choice' ? optionList : [],
        required_at_registration: onPublicForm,
        is_sensitive: sensitive,
      });
    }
    onClose();
  }

  const error = add.error?.message ?? update.error?.message;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={field ? `Edit ${field.label}` : 'Add a pupil field'}
      note={
        field
          ? 'The key and the kind cannot change: values already given are stored under that key and typed by that kind.'
          : pupilCount
            ? `It will appear, empty, on all ${pupilCount} pupil records.`
            : 'It will appear, empty, on every pupil record.'
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Label" hint="What a registrar reads on the form." required>
          <TextInput value={label} onChange={(event) => setLabel(event.target.value)} />
        </Field>

        {field ? (
          <Field label="Key" hint="Not editable. Values already given are stored under it.">
            <TextInput value={key} disabled />
          </Field>
        ) : (
          <Field
            label="Key"
            hint="Letters, digits and underscores. It lands in an export header and in a URL."
            required
          >
            <TextInput
              value={key}
              onChange={(event) =>
                setKey(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))
              }
              placeholder="bus_route"
            />
          </Field>
        )}

        {field ? (
          <Field label="Kind" hint="Not editable: changing it would reinterpret old answers.">
            <TextInput value={kind} disabled />
          </Field>
        ) : (
          <Field label="Kind">
            <Select value={kind} onChange={(event) => setKind(event.target.value)}>
              {KINDS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        )}

        {kind === 'choice' ? (
          <Field
            label="Options"
            hint="Separated by commas. At least two — a choice of one is not a choice."
            error={optionList.length === 1 ? 'Add a second option.' : undefined}
          >
            <TextInput
              value={options}
              onChange={(event) => setOptions(event.target.value)}
              placeholder="Kimara, Mbezi, Tegeta"
            />
          </Field>
        ) : null}

        <Field label="Help text" hint="One line under the input, if it needs one.">
          <TextInput value={help} onChange={(event) => setHelp(event.target.value)} />
        </Field>

        <label className="flex items-start gap-2.5 text-[13px] text-ink-soft">
          <input
            type="checkbox"
            checked={sensitive}
            onChange={(event) => setSensitive(event.target.checked)}
            className="mt-0.5 h-4.5 w-4.5 flex-none"
          />
          <span>
            Sensitive
            <span className="block text-muted">
              Health, religion, anything the school should not be dropping into a spreadsheet.
              Kept out of ordinary exports.
            </span>
          </span>
        </label>

        <label className="flex items-start gap-2.5 text-[13px] text-ink-soft">
          <input
            type="checkbox"
            checked={onPublicForm}
            onChange={(event) => setOnPublicForm(event.target.checked)}
            className="mt-0.5 h-4.5 w-4.5 flex-none"
          />
          <span>
            Required on the public application form
            <span className="block text-muted">
              Every required field costs completed applications. Leave it off unless the school
              genuinely cannot proceed without it.
            </span>
          </span>
        </label>

        {field ? (
          <label className="flex items-start gap-2.5 text-[13px] text-ink-soft">
            <input
              type="checkbox"
              checked={retired}
              onChange={(event) => setRetired(event.target.checked)}
              className="mt-0.5 h-4.5 w-4.5 flex-none"
            />
            <span>
              Retired
              <span className="block text-muted">
                Keeps every value already recorded and stops the field being asked for again.
              </span>
            </span>
          </label>
        ) : null}

        {error ? <Notice>{error}</Notice> : null}

        <div className="flex flex-wrap justify-end gap-2.5">
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            busy={add.isPending || update.isPending}
            disabled={
              !label.trim() ||
              (!field && !key.trim()) ||
              (kind === 'choice' && optionList.length < 2)
            }
            onClick={() => void submit()}
          >
            {field ? 'Save' : 'Add it'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
