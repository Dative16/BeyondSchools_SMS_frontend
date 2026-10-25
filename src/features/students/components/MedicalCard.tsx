/**
 * Medical detail.
 *
 * Not on the artboard, and here anyway. The data is already on the profile
 * response — the server only sends it to an account holding `health:read` and
 * audits the fact that it was read — so the alternative is holding a child's
 * allergy in a database nobody can see on the afternoon it matters.
 *
 * It is drawn quietly: no red, no alarm. A standing condition is not an
 * emergency, and a card that shouts makes people stop reading it.
 */

import type { components } from '@/api/schema';
import { Card, CardHeader } from '@/components/ui';

type Health = components['schemas']['HealthResponse'];

export function MedicalCard({ health }: { readonly health: Health }) {
  const facts: ReadonlyArray<[string, string | null | undefined]> = [
    ['Allergies', health.allergies],
    ['Conditions', health.chronic_conditions],
    ['Medication', health.medication],
    ['Blood group', health.blood_group],
    ['Doctor', health.doctor_name],
  ];
  const known = facts.filter(([, value]) => Boolean(value));

  return (
    <Card>
      <CardHeader title="Medical" note="Recorded by the school. Read access is logged." />
      {known.length === 0 ? (
        <p className="m-0 text-[13px] text-muted">Nothing has been recorded.</p>
      ) : (
        <dl className="m-0 flex flex-col gap-2 text-[13px]">
          {known.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3">
              <dt className="flex-none text-muted">{label}</dt>
              <dd className="m-0 text-right font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {health.emergency_plan ? (
        <p className="mt-3 mb-0 rounded-control bg-warn-bg px-3 py-2 text-[12.5px] leading-relaxed text-warn-ink">
          {health.emergency_plan}
        </p>
      ) : null}
    </Card>
  );
}
