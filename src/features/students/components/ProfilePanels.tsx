/**
 * The panels that make a pupil record keepable rather than merely readable.
 * Built to `ProfileDocuments`, `ProfileGuardians`, `ProfileMedical` and
 * `ProfileCustomFields`.
 *
 * Four tabs rather than four screens, because they are all the same record
 * and a registrar correcting a file moves between them in one sitting. The
 * tab lives in the URL so the browser's back button steps between them.
 *
 * Two rules run through all four.
 *
 * **A document's bytes never touch the API.** The browser uploads straight to
 * object storage with a presigned ticket and only then is the record written.
 * A birth certificate passing through an application server is a birth
 * certificate in that server's logs, memory and crash dumps. Reading one back
 * is a short-lived link fetched at the moment of the click, never stored.
 *
 * **Health is behind its own permission.** Children's health data is
 * sensitive personal data under the Personal Data Protection Act 2022, and a
 * bursar chasing arrears has no business with it — so the tab is not drawn at
 * all without `health:read`, rather than drawn and then refused.
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useSchoolFields } from '@/api/queries/setup';
import {
  readDocumentUrl,
  useAttachDocument,
  useDocuments,
  useEmergencyContacts,
  useHealth,
  useLinkGuardian,
  useSaveEmergencyContacts,
  useSaveFieldValues,
  useSaveHealth,
  useUnlinkGuardian,
} from '@/api/queries/student';
import type { EmergencyContact, GuardianOnStudent, StudentDocument } from '@/api/queries/student';
import {
  Button,
  Card,
  CardHeader,
  Dialog,
  EmptyState,
  Field,
  FileInput,
  Notice,
  Pill,
  Select,
  TextInput,
} from '@/components/ui';
import { RELATIONSHIPS } from '@/domain/admit';
import { DOCUMENT_KINDS, documentKindLabel, missingRequired } from '@/domain/profile';
import { useAuth } from '@/features/auth/AuthProvider';
import { longDate, msisdn } from '@/lib/format';

type Panel = 'documents' | 'guardians' | 'medical' | 'fields';

export function ProfilePanels({
  studentId,
  guardians,
  fieldValues,
}: {
  readonly studentId: string;
  readonly guardians: readonly GuardianOnStudent[];
  /** The school's own fields, as a map of key to whatever was recorded. */
  readonly fieldValues: Record<string, unknown>;
}) {
  const { can } = useAuth();
  const [params, setParams] = useSearchParams();

  const mayManage = can('student:manage');
  const mayHealth = can('health:read');
  const asked = params.get('panel') as Panel | null;
  const panel: Panel =
    asked && (asked !== 'medical' || mayHealth) ? asked : 'documents';

  function go(next: Panel) {
    const updated = new URLSearchParams(params);
    updated.set('panel', next);
    setParams(updated, { replace: true });
  }

  return (
    <Card className="overflow-hidden !p-0">
      <div
        role="group"
        aria-label="Record panels"
        className="flex flex-wrap gap-1 border-b border-line px-4.5"
      >
        <Tab active={panel === 'documents'} onClick={() => go('documents')}>
          Documents
        </Tab>
        <Tab active={panel === 'guardians'} onClick={() => go('guardians')}>
          Guardians <span className="text-muted">{guardians.length}</span>
        </Tab>
        {mayHealth ? (
          <Tab active={panel === 'medical'} onClick={() => go('medical')}>
            Medical
          </Tab>
        ) : null}
        <Tab active={panel === 'fields'} onClick={() => go('fields')}>
          Other details
        </Tab>
      </div>

      <div className="p-4.5">
        {panel === 'documents' ? (
          <Documents studentId={studentId} mayManage={mayManage} />
        ) : null}
        {panel === 'guardians' ? (
          <Guardians studentId={studentId} guardians={guardians} mayManage={mayManage} />
        ) : null}
        {panel === 'medical' && mayHealth ? (
          <Medical studentId={studentId} mayManage={mayManage} />
        ) : null}
        {panel === 'fields' ? (
          <CustomFields studentId={studentId} values={fieldValues} mayManage={mayManage} />
        ) : null}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------
function Documents({
  studentId,
  mayManage,
}: {
  readonly studentId: string;
  readonly mayManage: boolean;
}) {
  const documents = useDocuments(studentId, true);
  const attach = useAttachDocument(studentId);
  const [adding, setAdding] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  const held = (documents.data ?? []).map((each) => each.kind);
  const missing = missingRequired(held);

  async function open(document: StudentDocument) {
    setOpening(document.id);
    setFailed(null);
    try {
      const link = await readDocumentUrl(studentId, document.id);
      // A new tab, and the link is used immediately. It expires in minutes
      // because this is a child's birth certificate in a private bucket.
      window.open(link.url, '_blank', 'noopener,noreferrer');
    } catch {
      setFailed('That link could not be made. Try again in a moment.');
    } finally {
      setOpening(null);
    }
  }

  return (
    <>
      <CardHeader
        title="Documents"
        note="Uploaded straight to storage from this browser. The system never holds the file itself."
      />

      {missing.length > 0 ? (
        <div className="mb-4">
          <Notice tone="warn">
            Still needed: {missing.map(documentKindLabel).join(', ')}.
          </Notice>
        </div>
      ) : null}

      {failed ? (
        <div className="mb-4">
          <Notice>{failed}</Notice>
        </div>
      ) : null}

      {documents.isLoading ? (
        <div className="h-20 animate-pulse rounded bg-line-soft" aria-hidden="true" />
      ) : (documents.data ?? []).length === 0 ? (
        <EmptyState
          title="Nothing attached yet"
          note="A birth certificate is the one a school is asked for first."
        />
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
          {(documents.data ?? []).map((document) => (
            <li
              key={document.id}
              className="flex flex-wrap items-center gap-3 rounded-[10px] border border-line p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="m-0 flex flex-wrap items-center gap-2 text-sm font-semibold">
                  {documentKindLabel(document.kind)}
                  {document.verified_at ? <Pill tone="ok">Checked</Pill> : null}
                </p>
                <p className="m-0 text-xs text-muted">
                  {document.file_name ?? 'No file name'} &middot; added{' '}
                  {longDate(document.created_at)}
                </p>
              </div>
              <Button
                size="sm"
                busy={opening === document.id}
                onClick={() => void open(document)}
              >
                Open
              </Button>
            </li>
          ))}
        </ul>
      )}

      {mayManage ? (
        <div className="mt-4 border-t border-line pt-4">
          <Button onClick={() => setAdding(true)}>Attach a document</Button>
        </div>
      ) : null}

      <AttachDialog
        open={adding}
        onClose={() => setAdding(false)}
        attach={attach}
        held={held}
      />
    </>
  );
}

function AttachDialog({
  open,
  onClose,
  attach,
  held,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly attach: ReturnType<typeof useAttachDocument>;
  readonly held: readonly string[];
}) {
  const [kind, setKind] = useState('birth_certificate');
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open) return;
    setKind(missingRequired(held).at(0) ?? 'birth_certificate');
    setFile(null);
    setNote('');
  }, [open, held]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Attach a document"
      note="The file goes from this browser straight to storage. Nothing is recorded until it arrives."
    >
      <div className="flex flex-col gap-4">
        <Field label="What is it">
          <Select value={kind} onChange={(event) => setKind(event.target.value)}>
            {DOCUMENT_KINDS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="File"
          hint="A photograph of the paper is fine. Keep it under a few megabytes so it uploads on a phone."
        >
          <FileInput
            accept="image/*,application/pdf"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </Field>

        <Field label="Note" hint="Optional — anything the office should know about this copy.">
          <TextInput value={note} onChange={(event) => setNote(event.target.value)} />
        </Field>

        {attach.isError ? <Notice>{attach.error.message}</Notice> : null}

        <div className="flex flex-wrap justify-end gap-2.5">
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!file}
            busy={attach.isPending}
            onClick={() => {
              if (!file) return;
              void attach
                .mutateAsync({ kind, file, note: note.trim() || null })
                .then(onClose);
            }}
          >
            Attach it
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Guardians
// ---------------------------------------------------------------------------
function Guardians({
  studentId,
  guardians,
  mayManage,
}: {
  readonly studentId: string;
  readonly guardians: readonly GuardianOnStudent[];
  readonly mayManage: boolean;
}) {
  const link = useLinkGuardian(studentId);
  const unlink = useUnlinkGuardian(studentId);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('mother');

  const lastOne = guardians.length <= 1;

  return (
    <>
      <CardHeader
        title="Guardians"
        note="One is primary: the person the school rings, and the one the invoices go to."
      />

      {guardians.length === 0 ? (
        <Notice tone="warn">
          Nobody is linked to this child. No invoice has anywhere to go and no SMS has anybody to
          reach.
        </Notice>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
          {guardians.map((guardian) => (
            <li
              key={guardian.guardian_id}
              className="flex flex-wrap items-center gap-3 rounded-[10px] border border-line p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="m-0 flex flex-wrap items-center gap-2 text-sm font-semibold">
                  {guardian.full_name}
                  {guardian.is_primary ? <Pill tone="ok">Primary</Pill> : null}
                  {guardian.receives_invoices ? <Pill tone="info">Invoices</Pill> : null}
                </p>
                <p className="m-0 text-xs text-muted">
                  {guardian.relationship} &middot;{' '}
                  <a href={`tel:${guardian.phone}`} className="text-ink-dim no-underline">
                    {msisdn(guardian.phone)}
                  </a>
                  {guardian.sms_opted_out ? ' · has opted out of SMS' : null}
                </p>
              </div>
              {mayManage ? (
                <Button
                  size="sm"
                  variant="danger"
                  disabled={lastOne}
                  busy={unlink.isPending}
                  onClick={() => void unlink.mutateAsync(guardian.guardian_id)}
                >
                  Unlink
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {lastOne && guardians.length === 1 ? (
        <p className="mt-3 mb-0 text-[12.5px] leading-relaxed text-muted">
          The last guardian cannot be unlinked. A child with nobody attached has no invoice
          address and nobody to telephone — link the new person first, then remove this one.
        </p>
      ) : null}

      {unlink.isError ? (
        <div className="mt-3.5">
          <Notice>{unlink.error.message}</Notice>
        </div>
      ) : null}

      {mayManage ? (
        <div className="mt-4 border-t border-line pt-4">
          {adding ? (
            <div className="flex flex-col gap-4">
              <Field label="Full name" required>
                <TextInput value={name} onChange={(event) => setName(event.target.value)} />
              </Field>
              <Field
                label="Phone number"
                hint="Matched against the guardians the school already has, so one parent with two children stays one person."
                required
              >
                <TextInput
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="0754 000 000"
                />
              </Field>
              <Field label="Relationship">
                <Select
                  value={relationship}
                  onChange={(event) => setRelationship(event.target.value)}
                >
                  {RELATIONSHIPS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>
              {link.isError ? <Notice>{link.error.message}</Notice> : null}
              <div className="flex flex-wrap gap-2.5">
                <Button
                  variant="primary"
                  disabled={!name.trim() || !phone.trim()}
                  busy={link.isPending}
                  onClick={() => {
                    const first = guardians.length === 0;
                    void link
                      .mutateAsync({
                        guardian: {
                          full_name: name.trim(),
                          phone: phone.trim(),
                          locale: 'en',
                        },
                        link: {
                          relationship: relationship as 'mother',
                          // The first guardian on a child is the primary one
                          // by default: somebody has to be the person the
                          // school rings and the invoices go to.
                          is_primary: first,
                          receives_invoices: first,
                          receives_sms: true,
                          may_collect: true,
                        },
                      })
                      .then(() => {
                        setName('');
                        setPhone('');
                        setAdding(false);
                      });
                  }}
                >
                  Link them
                </Button>
                <Button onClick={() => setAdding(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <Button onClick={() => setAdding(true)}>Add a guardian</Button>
          )}
        </div>
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------------------
// Medical
// ---------------------------------------------------------------------------
const HEALTH_FIELDS = [
  { key: 'blood_group', label: 'Blood group', hint: undefined },
  { key: 'allergies', label: 'Allergies', hint: 'What happens, and what to do about it.' },
  { key: 'chronic_conditions', label: 'Ongoing conditions', hint: undefined },
  { key: 'medication', label: 'Medication', hint: 'What they take, and when.' },
  {
    key: 'emergency_plan',
    label: 'In an emergency',
    hint: 'The sentence somebody reads out to a nurse. Write it for a stranger.',
  },
  { key: 'doctor_name', label: 'Doctor', hint: undefined },
  { key: 'doctor_phone', label: 'Doctor’s phone', hint: undefined },
  { key: 'insurance_scheme', label: 'Insurance scheme', hint: undefined },
  { key: 'insurance_number', label: 'Insurance number', hint: undefined },
] as const;

function Medical({
  studentId,
  mayManage,
}: {
  readonly studentId: string;
  readonly mayManage: boolean;
}) {
  const health = useHealth(studentId, true);
  const contacts = useEmergencyContacts(studentId, true);
  const saveHealth = useSaveHealth(studentId);
  const saveContacts = useSaveEmergencyContacts(studentId);

  const [draft, setDraft] = useState<Record<string, string>>({});
  const [rows, setRows] = useState<EmergencyContact[]>([]);

  useEffect(() => {
    const current = health.data;
    setDraft(
      Object.fromEntries(
        HEALTH_FIELDS.map((field) => [
          field.key,
          ((current as Record<string, unknown> | null | undefined)?.[field.key] as string) ?? '',
        ]),
      ),
    );
  }, [health.data]);

  useEffect(() => setRows([...(contacts.data ?? [])]), [contacts.data]);

  return (
    <>
      <CardHeader
        title="Medical"
        note="Sensitive personal data under the Personal Data Protection Act 2022. Only accounts with health access see this tab at all."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {HEALTH_FIELDS.map((field) => (
          <Field key={field.key} label={field.label} hint={field.hint}>
            <TextInput
              value={draft[field.key] ?? ''}
              disabled={!mayManage}
              onChange={(event) =>
                setDraft((current) => ({ ...current, [field.key]: event.target.value }))
              }
            />
          </Field>
        ))}
      </div>

      {saveHealth.isError ? (
        <div className="mt-3.5">
          <Notice>{saveHealth.error.message}</Notice>
        </div>
      ) : null}

      {mayManage ? (
        <div className="mt-4 border-t border-line pt-4">
          <Button
            variant="primary"
            busy={saveHealth.isPending}
            onClick={() =>
              void saveHealth.mutateAsync(
                Object.fromEntries(
                  HEALTH_FIELDS.map((field) => [field.key, draft[field.key]?.trim() || null]),
                ),
              )
            }
          >
            Save the medical record
          </Button>
        </div>
      ) : null}

      <div className="mt-5 border-t border-line pt-5">
        <CardHeader
          title="Emergency contacts"
          note="Rung in order when a guardian cannot be reached. Somebody who can actually come to the school."
        />

        {rows.length === 0 ? (
          <EmptyState
            title="None recorded"
            note="A child with nobody reachable in an emergency is the gap worth closing first."
          />
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
            {rows.map((contact, index) => (
              <li key={index} className="rounded-[10px] border border-line p-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Field label="Name">
                    <TextInput
                      value={contact.full_name}
                      disabled={!mayManage}
                      onChange={(event) =>
                        setRows((current) =>
                          current.map((each, at) =>
                            at === index ? { ...each, full_name: event.target.value } : each,
                          ),
                        )
                      }
                    />
                  </Field>
                  <Field label="Relationship">
                    <TextInput
                      value={contact.relationship}
                      disabled={!mayManage}
                      onChange={(event) =>
                        setRows((current) =>
                          current.map((each, at) =>
                            at === index ? { ...each, relationship: event.target.value } : each,
                          ),
                        )
                      }
                    />
                  </Field>
                  <Field label="Phone">
                    <TextInput
                      value={contact.phone}
                      disabled={!mayManage}
                      onChange={(event) =>
                        setRows((current) =>
                          current.map((each, at) =>
                            at === index ? { ...each, phone: event.target.value } : each,
                          ),
                        )
                      }
                    />
                  </Field>
                </div>
                {mayManage ? (
                  <div className="mt-2.5">
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => setRows((current) => current.filter((_, at) => at !== index))}
                    >
                      Remove
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {saveContacts.isError ? (
          <div className="mt-3.5">
            <Notice>{saveContacts.error.message}</Notice>
          </div>
        ) : null}

        {mayManage ? (
          <div className="mt-4 flex flex-wrap gap-2.5">
            <Button
              variant="primary"
              busy={saveContacts.isPending}
              onClick={() =>
                void saveContacts.mutateAsync(
                  rows
                    .filter((row) => row.full_name.trim() && row.phone.trim())
                    .map((row, index) => ({ ...row, priority: index + 1 })),
                )
              }
            >
              Save the contacts
            </Button>
            <Button
              onClick={() =>
                setRows((current) => [
                  ...current,
                  {
                    full_name: '',
                    relationship: '',
                    phone: '',
                    alt_phone: null,
                    priority: current.length + 1,
                    note: null,
                    may_collect: false,
                  },
                ])
              }
            >
              Add a contact
            </Button>
          </div>
        ) : null}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// The fields this school added
// ---------------------------------------------------------------------------
function CustomFields({
  studentId,
  values,
  mayManage,
}: {
  readonly studentId: string;
  readonly values: Record<string, unknown>;
  readonly mayManage: boolean;
}) {
  const fields = useSchoolFields();
  const save = useSaveFieldValues(studentId);
  const [draft, setDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    setDraft(
      Object.fromEntries(
        Object.entries(values).map(([key, value]) => [
          key,
          // Whatever the server recorded, rendered as text for an input. A
          // custom field holds one scalar by design, so this is a date, a
          // number, a boolean or a string and never an object.
          asText(value),
        ]),
      ),
    );
  }, [values]);

  const live = (fields.data ?? []).filter(
    (field) => field.is_active && field.scope === 'student',
  );

  return (
    <>
      <CardHeader
        title="Other details"
        note="The fields this school added for itself. Set them up under School settings."
      />

      {fields.isLoading ? (
        <div className="h-20 animate-pulse rounded bg-line-soft" aria-hidden="true" />
      ) : live.length === 0 ? (
        <EmptyState
          title="This school has added no fields"
          note="The system asks for what every school needs. This tab is for what only yours does."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {live.map((field) => (
            <Field
              key={field.id}
              label={field.label}
              hint={field.help_text ?? undefined}
              required={field.required_at_registration}
            >
              {field.kind === 'choice' ? (
                <Select
                  value={draft[field.key] ?? ''}
                  disabled={!mayManage}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, [field.key]: event.target.value }))
                  }
                >
                  <option value="">Not set</option>
                  {(field.options ?? []).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              ) : (
                <TextInput
                  type={
                    field.kind === 'number'
                      ? 'number'
                      : field.kind === 'date'
                        ? 'date'
                        : 'text'
                  }
                  value={draft[field.key] ?? ''}
                  disabled={!mayManage}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, [field.key]: event.target.value }))
                  }
                />
              )}
            </Field>
          ))}
        </div>
      )}

      {save.isError ? (
        <div className="mt-3.5">
          <Notice>{save.error.message}</Notice>
        </div>
      ) : null}

      {mayManage && live.length > 0 ? (
        <div className="mt-4 border-t border-line pt-4">
          <Button
            variant="primary"
            busy={save.isPending}
            onClick={() =>
              void save.mutateAsync(
                Object.fromEntries(
                  live.map((field) => [field.key, draft[field.key]?.trim() || null]),
                ),
              )
            }
          >
            Save these details
          </Button>
        </div>
      ) : null}
    </>
  );
}

/**
 * Whatever the server recorded for a custom field, as text for an input.
 *
 * A custom field holds one scalar by design — a date, a number, a boolean or
 * a string — so the object branch should be unreachable. It is here because
 * the value arrives as `unknown` from a JSON map, and "[object Object]" in a
 * text box is the kind of thing a registrar would silently save.
 */
function asText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function Tab({
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
