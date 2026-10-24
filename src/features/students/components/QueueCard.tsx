/**
 * One application waiting on a registrar.
 *
 * The actions are deliberately not symmetrical. "Offer a place" is the filled
 * button because it is what happens to most applications; "Decline" is plain
 * text in red, because an application declined by a slip of the thumb is a
 * child whose family is told no by accident.
 *
 * Nothing here writes. The buttons route to the application's own screen,
 * where the decision is made with the whole record in front of you — a
 * registrar should not be able to decline a child from a list view where the
 * only thing visible is a name and a flag.
 */

import { Link } from 'react-router-dom';

import type { QueueRow } from '@/api/queries/students';
import { Pill } from '@/components/ui';
import { queueFlag, waitedFor } from '@/domain/roll';
import { longDate, msisdn } from '@/lib/format';

export function QueueCard({ row }: { readonly row: QueueRow }) {
  const { flag, tone } = queueFlag({
    state: row.state,
    duplicateScore: row.duplicate_score,
    previousSchool: row.previous_school,
    documentsHeld: row.documents_held,
  });

  return (
    <article className="rounded-card border border-line bg-white p-[16px_18px]">
      <div className="flex flex-wrap items-start justify-between gap-3.5">
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-2.5">
            <h2 className="m-0 font-display text-[15.5px] font-semibold">{row.child_name}</h2>
            <Pill tone={tone}>{flag}</Pill>
          </div>

          <p className="m-0 mb-1 text-[13px] text-ink-dim">
            Applying for {row.level_name ?? 'a level not yet chosen'}
            {row.date_of_birth ? ` · born ${longDate(row.date_of_birth)}` : null}
            {row.previous_school ? ` · from ${row.previous_school}` : ' · no previous school'}
          </p>

          <p className="m-0 text-[13px] text-muted">
            Guardian {row.guardian_name ?? 'not named'} · {msisdn(row.guardian_phone ?? row.phone)}{' '}
            · waiting {waitedFor(row.waiting_days)}
          </p>

          {row.duplicate_reason ? (
            <p className="mt-2 mb-0 text-[12.5px] leading-relaxed text-warn-ink">
              {row.duplicate_reason}
            </p>
          ) : null}

          <p className="mt-2 mb-0 text-[12.5px] text-muted">
            {row.documents_held === 0
              ? 'No documents attached yet.'
              : `${row.documents_held} ${
                  row.documents_held === 1 ? 'document' : 'documents'
                } attached.`}
          </p>
        </div>

        <div className="flex flex-none flex-wrap gap-2">
          <Link
            to={`/admissions/${row.id}`}
            className="inline-flex min-h-11 items-center rounded-control bg-brand-strong px-4 text-[13px] font-semibold text-white no-underline hover:bg-brand-ink"
          >
            Open
          </Link>
        </div>
      </div>
    </article>
  );
}
