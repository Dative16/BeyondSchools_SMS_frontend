/**
 * Who to contact about this child.
 *
 * The badges are the useful part, and each one answers a different question a
 * school asks under pressure. Primary is who to ring first. "Gets invoices" is
 * who the bill goes to, which is not always the same person. "May collect" is
 * who the gate lets take the child home, and that one is worth seeing without
 * opening anything.
 *
 * A number that has opted out of SMS is said so plainly, because a bursar
 * wondering why a reminder went unanswered should not have to guess.
 */

import type { Guardian } from '@/api/queries/student';
import { Card, CardHeader, Pill } from '@/components/ui';
import { msisdn } from '@/lib/format';

export function GuardiansCard({ guardians }: { readonly guardians: readonly Guardian[] }) {
  return (
    <Card>
      <CardHeader title="Guardians" />
      {guardians.length === 0 ? (
        <p className="m-0 text-[13px] leading-relaxed text-bad-ink">
          Nobody is linked to this child. There is no number to ring if they are taken ill.
        </p>
      ) : (
        <div className="flex flex-col gap-3.5">
          {guardians.map((guardian, index) => (
            <div
              key={guardian.link_id}
              className={
                index < guardians.length - 1 ? 'border-b border-line-soft pb-3.5' : undefined
              }
            >
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <p className="m-0 text-[13.5px] font-semibold">{guardian.full_name}</p>
                {guardian.is_primary ? <Pill tone="info">Primary</Pill> : null}
                {guardian.receives_invoices ? <Pill tone="ok">Gets invoices</Pill> : null}
                {guardian.may_collect ? <Pill tone="neutral">May collect</Pill> : null}
              </div>

              <p className="m-0 text-[13px] text-ink-dim">
                {relationship(guardian.relationship)} ·{' '}
                <a
                  href={`tel:${guardian.phone}`}
                  className="text-ink-dim no-underline hover:text-ok-ink"
                >
                  {msisdn(guardian.phone)}
                </a>
                {guardian.alt_phone ? ` · ${msisdn(guardian.alt_phone)}` : null}
              </p>

              {guardian.sms_opted_out ? (
                <p className="mt-1 mb-0 text-xs text-warn-ink">
                  Has opted out of SMS. Reminders will not reach this number.
                </p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/** "mother" as it is stored, "Mother" as a person would read it. */
function relationship(value: string): string {
  const spaced = value.replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
