/**
 * One row per academic year, newest at the top.
 *
 * Drawn as a timeline because the point of this card is that the rows are a
 * sequence and nothing in it was overwritten: a promotion writes a new row, so
 * the class a child was in three years ago is still there, and so is the
 * report card attached to it.
 *
 * The connecting line stops at the last row rather than trailing off below it
 * — a line that continues past the oldest year reads as more history that
 * failed to load.
 */

import type { HistoryRow } from '@/api/queries/student';
import { Pill } from '@/components/ui';
import { outcomePill } from '@/domain/student';
import { longDate } from '@/lib/format';

export function EnrolmentHistory({ rows }: { readonly rows: readonly HistoryRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="m-0 py-4 text-[13px] text-muted">
        This child has no enrolment yet. They are on the register but not in a class.
      </p>
    );
  }

  return (
    <ol className="m-0 list-none p-0">
      {rows.map((row, index) => {
        const pill = outcomePill(row.outcome, row.is_repeating);
        const last = index === rows.length - 1;
        return (
          <li key={row.id} className="flex gap-3.5">
            <div className="flex w-3.5 flex-none flex-col items-center">
              <span
                className={`mt-1.5 h-[11px] w-[11px] rounded-full ${
                  row.outcome === 'active' ? 'bg-brand' : 'bg-line'
                }`}
                aria-hidden="true"
              />
              {last ? null : (
                <span className="min-h-[26px] w-0.5 flex-1 bg-line" aria-hidden="true" />
              )}
            </div>

            <div className={`min-w-0 ${last ? '' : 'pb-4.5'}`}>
              <div className="mb-1 flex flex-wrap items-center gap-2.5">
                <p className="m-0 text-sm font-semibold">
                  {row.academic_year} · {row.class_name}
                </p>
                <Pill tone={pill.tone}>{pill.label}</Pill>
              </div>
              <p className="m-0 text-[12.5px] text-muted">{detailOf(row)}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * The line under a row. Says what is known and nothing else — the artboard
 * shows averages and attendance here, and neither exists until Phase 2's
 * assessment work, so claiming them would be inventing marks.
 */
function detailOf(row: HistoryRow): string {
  const facts: string[] = [];

  if (row.class_teacher) facts.push(`Class teacher: ${row.class_teacher}`);
  if (row.residency === 'boarder') {
    facts.push(row.dormitory ? `Boarder, ${row.dormitory}` : 'Boarder');
  }
  if (row.transport_route) facts.push(`Bus: ${row.transport_route}`);

  facts.push(
    row.exited_on
      ? `${longDate(row.enrolled_on)} to ${longDate(row.exited_on)}`
      : `Since ${longDate(row.enrolled_on)}`,
  );

  return facts.join(' · ');
}
