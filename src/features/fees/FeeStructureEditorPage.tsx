/**
 * The fee structure editor. Built to `FeeStructureEditor.dc.html`.
 *
 * One idea runs through the whole screen: **publishing cannot be undone.**
 * Invoices are raised from a published structure and have to add up years
 * later, so the server freezes one the moment it goes live, and the only
 * remedy for a wrong price afterwards is a credit note on every invoice
 * already raised. The screen is arranged around making that plain before the
 * click rather than explaining it after.
 *
 * Two departures from the artboard, both deliberate.
 *
 * The artboard has a "Save the draft" button. Here every change to an item
 * saves immediately. The endpoint replaces the whole item list in one call, so
 * there is no partial-save hazard to guard against, and a bursar who closes a
 * tab after typing eleven amounts should not lose eleven amounts.
 *
 * The artboard totals "Term 1" and "Terms 2 and 3, each". This totals every
 * term separately, because an item pinned to one term makes the others unequal
 * and a single figure for "the rest of the year" would then be true of neither.
 */

import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useStreams } from '@/api/queries/academic';
import {
  useDiscardStructure,
  usePublishStructure,
  useSetStructureItems,
  useStructure,
  useStructures,
} from '@/api/queries/fees';
import type { FeeItemBody } from '@/api/queries/fees';
import { useAcademicYears, useTerms } from '@/api/queries/school';
import {
  Button,
  ButtonLink,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  Notice,
  Pill,
} from '@/components/ui';
import {
  categoryName,
  publishBlockedBecause,
  structureTotals,
  whenBilled,
  whoPays,
} from '@/domain/fees';
import type { FeeItemFacts } from '@/domain/fees';
import { useAuth } from '@/features/auth/AuthProvider';
import { amount, longDate } from '@/lib/format';

import { FeeItemDialog } from './components/FeeItemDialog';

/** The server sends items as loose rows; this is the shape the rules want. */
const toFacts = (item: FeeItemBody): FeeItemFacts => ({
  name: item.name,
  amount: Number(item.amount),
  frequency: item.frequency,
  termIndex: item.term_index ?? null,
  isMandatory: item.is_mandatory ?? true,
});

/** And this is the shape the endpoint wants back, with nothing extra on it. */
const toBody = (item: FeeItemBody): FeeItemBody => ({
  name: item.name,
  amount: String(item.amount),
  category: item.category,
  frequency: item.frequency,
  term_index: item.term_index ?? null,
  is_mandatory: item.is_mandatory ?? true,
});

export default function FeeStructureEditorPage() {
  const { structureId = '' } = useParams();
  const { can } = useAuth();

  const detail = useStructure(structureId);
  const years = useAcademicYears();
  const structure = detail.data?.structure;
  const terms = useTerms(structure?.academic_year_id);
  const streams = useStreams();
  const siblings = useStructures(true);

  const setItems = useSetStructureItems(structureId);
  const publish = usePublishStructure(structureId);
  const discard = useDiscardStructure(structureId);

  const [editing, setEditing] = useState<{ index: number | null } | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  if (detail.isError) {
    return (
      <>
        <Back />
        <ErrorState onRetry={() => void detail.refetch()} />
      </>
    );
  }

  if (!detail.data || !structure) {
    return (
      <>
        <Back />
        <p className="text-sm text-muted" role="status">
          Loading&hellip;
        </p>
      </>
    );
  }

  const items = (detail.data.items as FeeItemBody[]).map(toBody);
  const isDraft = structure.status === 'draft';
  const mayEdit = isDraft && can('fee_structure:manage');
  const year = years.data?.find((candidate) => candidate.id === structure.academic_year_id);
  const row = siblings.data?.find((candidate) => candidate.id === structureId);
  const stream = streams.data?.find((candidate) => candidate.id === structure.stream_id);
  const totals = structureTotals(items.map(toFacts), terms.data ?? []);
  const firstTerm = totals.perTerm.at(0);
  const blocked = publishBlockedBecause({ status: structure.status, itemCount: items.length });
  const enrolled = detail.data.enrolled_count;

  /** Every write replaces the whole list, which is what the endpoint does. */
  const save = (next: readonly FeeItemBody[]) => setItems.mutateAsync(next);

  function saveItem(item: FeeItemBody) {
    const index = editing?.index ?? null;
    const next =
      index === null ? [...items, item] : items.map((old, at) => (at === index ? item : old));
    setEditing(null);
    void save(next);
  }

  return (
    <>
      <Back />

      <div className="mb-4.5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="m-0 mb-1 font-display text-[26px] font-semibold tracking-[-0.02em]">
            {row?.level_name ?? structure.label}
            {stream ? ` · ${stream.name}` : null}
            {year ? `, ${year.label}` : null}
          </h1>
          <p className="m-0 text-sm text-muted">
            {isDraft
              ? 'Draft. Nothing is billed from a draft, and nothing here has been applied to anybody.'
              : structure.published_at
                ? `Published on ${longDate(structure.published_at)}. Nothing on this page can be edited again.`
                : 'Published and locked.'}
          </p>
        </div>
        <Pill tone={isDraft ? 'warn' : 'ok'}>{isDraft ? 'Draft' : 'Published'}</Pill>
      </div>

      {isDraft ? (
        <div className="mb-4.5">
          <Notice tone="warn">
            <strong>Publishing cannot be undone.</strong> Invoices are raised from a published
            structure and must still add up years later, so a published structure can never be
            edited or deleted. If a price is wrong after publishing, the only route is a new
            structure for the next term plus a credit note on every invoice already raised. Check
            the figures while they are still a draft.
          </Notice>
        </div>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-4.5 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="flex min-w-0 flex-col gap-4.5">
          <Card className="overflow-hidden !p-0">
            <div className="px-4.5 pt-4">
              <CardHeader
                title="Fee items"
                note={
                  firstTerm
                    ? `Each line becomes a line on every invoice this structure raises. A per-term item is billed in all ${totals.perTerm.length} terms; a yearly one only with ${firstTerm.label}.`
                    : 'Each line becomes a line on every invoice this structure raises.'
                }
              />
            </div>

            {items.length === 0 ? (
              <div className="px-4.5 pb-4">
                <EmptyState
                  title="Nothing is charged yet"
                  note="Add the first fee item. A structure with none cannot be published, because a term run would bill every child nothing and look as though it had worked."
                />
              </div>
            ) : (
              <>
                <div className="hidden px-4.5 sm:block">
                  <table className="w-full border-collapse text-left text-[13px]">
                    <caption className="sr-only">
                      What this structure charges, line by line
                    </caption>
                    <thead>
                      <tr className="bg-canvas text-[11.5px] tracking-wide text-muted uppercase">
                        <Th>Item</Th>
                        <Th>When</Th>
                        <Th>Who pays</Th>
                        <Th align="right">Amount, TZS</Th>
                        {mayEdit ? <Th align="right">Change</Th> : null}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => {
                        const facts = toFacts(item);
                        return (
                          <tr key={`${item.name}-${index}`} className="border-t border-line">
                            <Td>
                              <span className="font-medium text-ink">{item.name}</span>
                              <span className="block text-xs text-muted">
                                {categoryName(item.category)}
                              </span>
                            </Td>
                            <Td>{whenBilled(facts)}</Td>
                            <Td>{whoPays(facts)}</Td>
                            <Td align="right">{amount(facts.amount)}</Td>
                            {mayEdit ? (
                              <Td align="right">
                                <div className="flex justify-end gap-1">
                                  <Button size="sm" onClick={() => setEditing({ index })}>
                                    Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="danger"
                                    busy={setItems.isPending}
                                    onClick={() => void save(items.filter((_, at) => at !== index))}
                                  >
                                    Remove
                                  </Button>
                                </div>
                              </Td>
                            ) : null}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <ul className="m-0 flex list-none flex-col gap-3 px-4.5 pb-1 sm:hidden">
                  {items.map((item, index) => {
                    const facts = toFacts(item);
                    return (
                      <li
                        key={`${item.name}-${index}`}
                        className="rounded-[10px] border border-line p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="m-0 text-sm font-semibold">{item.name}</p>
                          <span className="text-sm font-semibold whitespace-nowrap">
                            {amount(facts.amount)}
                          </span>
                        </div>
                        <p className="mt-1 mb-0 text-xs text-muted">
                          {whenBilled(facts)} &middot; {whoPays(facts)}
                        </p>
                        {mayEdit ? (
                          <div className="mt-2 flex gap-2">
                            <Button size="sm" onClick={() => setEditing({ index })}>
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              busy={setItems.isPending}
                              onClick={() => void save(items.filter((_, at) => at !== index))}
                            >
                              Remove
                            </Button>
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </>
            )}

            {mayEdit ? (
              <div className="px-4.5 pt-3 pb-4">
                <Button busy={setItems.isPending} onClick={() => setEditing({ index: null })}>
                  Add a fee item
                </Button>
                {setItems.isError ? (
                  <div className="mt-3">
                    <Notice>{setItems.error.message}</Notice>
                  </div>
                ) : null}
              </div>
            ) : null}

            {items.length > 0 ? (
              <dl className="m-0 border-t border-line bg-canvas px-4.5 py-3.5">
                {totals.perTerm.map((term) => (
                  <Total key={term.index} label={term.label} value={term.total} />
                ))}
                {totals.joining > 0 ? (
                  <Total label="Once, when a child joins" value={totals.joining} />
                ) : null}
                <Total label="Full year" value={totals.fullYear} strong />
              </dl>
            ) : null}
          </Card>

          <OtherLevels
            yearLabel={year?.label}
            rows={(siblings.data ?? []).filter(
              (candidate) =>
                candidate.academic_year_id === structure.academic_year_id &&
                candidate.id !== structureId,
            )}
          />
        </div>

        <Card className="xl:sticky xl:top-6">
          {isDraft ? (
            <>
              <CardHeader title="Publish" />
              <ul className="m-0 mb-3.5 flex list-none flex-col gap-1.5 p-0 text-[13px] text-ink-dim">
                <li>
                  {enrolled === 0
                    ? 'Nobody is enrolled at this level for the year, so publishing bills nobody yet.'
                    : `${enrolled} ${enrolled === 1 ? 'pupil is' : 'pupils are'} enrolled at this level for ${year?.label ?? 'the year'}.`}
                </li>
                {firstTerm && enrolled > 0 ? (
                  <li>
                    Their {firstTerm.label} invoices would total{' '}
                    <strong className="font-semibold text-ink">
                      {amount(firstTerm.total * enrolled)} TZS
                    </strong>
                    .
                  </li>
                ) : null}
                <li>
                  {stream
                    ? `Only ${stream.name} is priced by this. The rest of the level keeps the level-wide structure.`
                    : 'The whole level is priced by this, unless a stream has a structure of its own.'}
                </li>
              </ul>

              {blocked ? (
                <Notice tone="warn">{blocked}</Notice>
              ) : (
                <>
                  <label className="mb-3.5 flex items-start gap-2.5 text-[13px] text-ink-soft">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(event) => setConfirmed(event.target.checked)}
                      className="mt-0.5 h-4.5 w-4.5 flex-none"
                    />
                    <span>
                      I have checked every amount and understand this cannot be edited afterwards.
                    </span>
                  </label>
                  <Button
                    variant="primary"
                    className="w-full"
                    disabled={!confirmed || !can('fee_structure:manage')}
                    busy={publish.isPending}
                    onClick={() => void publish.mutateAsync()}
                  >
                    Publish this structure
                  </Button>
                </>
              )}

              {publish.isError ? (
                <div className="mt-3">
                  <Notice>{publish.error.message}</Notice>
                </div>
              ) : null}

              {can('fee_structure:manage') ? (
                <div className="mt-3.5 border-t border-line pt-3.5">
                  {confirmDiscard ? (
                    <>
                      <p className="m-0 mb-2.5 text-[12.5px] text-ink-dim">
                        Discard this draft? It has billed nobody, so nothing is lost but what was
                        typed here.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="danger"
                          busy={discard.isPending}
                          onClick={() => void discard.mutateAsync(undefined)}
                        >
                          Yes, discard it
                        </Button>
                        <Button onClick={() => setConfirmDiscard(false)}>Keep it</Button>
                      </div>
                    </>
                  ) : (
                    <Button variant="ghost" onClick={() => setConfirmDiscard(true)}>
                      Discard this draft
                    </Button>
                  )}
                  {discard.isError ? (
                    <div className="mt-3">
                      <Notice>{discard.error.message}</Notice>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : (
            <>
              <CardHeader title="Published and locked" />
              <p className="m-0 mb-3 text-[13px] leading-relaxed text-ink-dim">
                {enrolled === 0
                  ? 'No child is enrolled at this level yet. Anybody enrolled from now on is priced by this structure.'
                  : `The ${enrolled} ${enrolled === 1 ? 'invoice' : 'invoices'} for this level can now be raised. Nothing on this page can be edited again.`}
              </p>
              <p className="m-0 mb-3.5 text-[13px] leading-relaxed text-ink-dim">
                Raising them is a separate step, so the office can check one invoice before a whole
                level goes out.
              </p>
              <ButtonLink to="/fees" variant="primary" className="w-full">
                Go and raise the invoices
              </ButtonLink>
            </>
          )}
        </Card>
      </div>

      <FeeItemDialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        onSave={saveItem}
        item={editing === null || editing.index === null ? null : (items[editing.index] ?? null)}
        terms={terms.data ?? []}
      />
    </>
  );
}

function Back() {
  return (
    <p className="mt-0 mb-3">
      <Link
        to="/fees?tab=structures"
        className="text-[12.5px] font-semibold text-ink-dim no-underline hover:text-ink"
      >
        &larr; Fees and payments
      </Link>
    </p>
  );
}

function Total({
  label,
  value,
  strong = false,
}: {
  readonly label: string;
  readonly value: number;
  readonly strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-0.5">
      <dt className={`m-0 text-[12.5px] ${strong ? 'font-semibold text-ink' : 'text-muted'}`}>
        {label}
      </dt>
      <dd
        className={`m-0 text-[13px] whitespace-nowrap ${strong ? 'font-semibold text-ink' : 'text-ink-dim'}`}
      >
        {amount(value)}
      </dd>
    </div>
  );
}

/**
 * The rest of the year's levels, because the question after publishing one is
 * always which levels are still not ready — and a term run is only as complete
 * as its least-ready level.
 */
function OtherLevels({
  yearLabel,
  rows,
}: {
  readonly yearLabel: string | undefined;
  readonly rows: readonly {
    readonly id: string;
    readonly level_name: string;
    readonly stream_name: string | null;
    readonly status: string;
    readonly item_count: number;
  }[];
}) {
  if (rows.length === 0) return null;
  const drafts = rows.filter((row) => row.status !== 'published').length;

  return (
    <Card>
      <CardHeader
        title={yearLabel ? `Other levels, ${yearLabel}` : 'Other levels'}
        note={
          drafts === 0
            ? 'Every other level is published, so a term run can price the whole school.'
            : `${drafts} still ${drafts === 1 ? 'has' : 'have'} no published structure. A level without one cannot be invoiced.`
        }
      />
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {rows.map((row) => (
          <li key={row.id}>
            <Link
              to={`/fees/structures/${row.id}`}
              className="flex items-center justify-between gap-3 rounded-[10px] border border-line px-3 py-2.5 no-underline"
            >
              <span className="min-w-0 truncate text-[13px] font-medium text-ink">
                {row.level_name}
                {row.stream_name ? ` · ${row.stream_name}` : null}
                <span className="ml-2 text-xs font-normal text-muted">
                  {row.item_count} {row.item_count === 1 ? 'item' : 'items'}
                </span>
              </span>
              <Pill tone={row.status === 'published' ? 'ok' : 'warn'}>
                {row.status === 'published' ? 'Published' : 'Draft'}
              </Pill>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Th({
  children,
  align = 'left',
}: {
  readonly children: React.ReactNode;
  readonly align?: 'left' | 'right';
}) {
  return (
    <th
      scope="col"
      className={`px-2 py-2.5 font-semibold ${align === 'right' ? 'text-right' : 'text-left'}`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = 'left',
}: {
  readonly children: React.ReactNode;
  readonly align?: 'left' | 'right';
}) {
  return (
    <td className={`px-2 py-2.5 align-top ${align === 'right' ? 'text-right' : 'text-left'}`}>
      {children}
    </td>
  );
}
