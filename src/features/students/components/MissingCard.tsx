/**
 * What is still missing from this record.
 *
 * Not on the artboard either. A school's registration checklist is the thing
 * that is always half done — a birth certificate promised on Monday, an
 * emergency contact nobody wrote down — and a profile that does not say so is
 * a profile where it is never finished.
 *
 * Required items first, because that is the order somebody would chase them.
 */

import type { components } from '@/api/schema';
import { Card, CardHeader } from '@/components/ui';
import { missingFirst } from '@/domain/student';

type Item = components['schemas']['ChecklistItemResponse'];

export function MissingCard({ items }: { readonly items: readonly Item[] }) {
  const missing = missingFirst(items);
  if (missing.length === 0) return null;

  return (
    <Card>
      <CardHeader title="Still missing" />
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {missing.map((item) => (
          <li key={item.key} className="flex items-center gap-2.5 text-[13px]">
            <span
              className={`h-1.5 w-1.5 flex-none rounded-full ${
                item.required ? 'bg-warn-ink' : 'bg-line'
              }`}
              aria-hidden="true"
            />
            <span className={item.required ? 'font-medium' : 'text-ink-dim'}>{item.label}</span>
            {item.required ? (
              <span className="ml-auto text-xs text-muted">Required</span>
            ) : null}
          </li>
        ))}
      </ul>
    </Card>
  );
}
