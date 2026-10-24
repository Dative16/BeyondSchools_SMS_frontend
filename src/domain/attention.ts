/**
 * What needs somebody's attention, and in what order. Pure.
 *
 * The dashboard's first card is the one that earns the app its place: a head
 * teacher who opens it and sees nothing new will stop opening it. So the rule
 * for what appears there is a rule, written once and tested, rather than a
 * list of `if` statements inside a component.
 *
 * Severity is about money moving, not about volume. One payment sitting in
 * suspense outranks forty applications waiting, because the suspense payment
 * is a parent who has paid and is still being chased, and that is the failure
 * a school cannot explain.
 */

export type Severity = 'urgent' | 'soon';

export interface AttentionItem {
  readonly id: string;
  readonly severity: Severity;
  readonly title: string;
  readonly detail: string;
  readonly action: { readonly label: string; readonly to: string };
}

export interface AttentionFacts {
  /** Payments that arrived with nothing to match them. */
  readonly suspenseCount: number;
  readonly suspenseTotal: number;
  /** The phone number on the oldest of them, if there is one. */
  readonly suspenseFrom?: string | null;
  /** Levels whose fee structure for this year is still a draft. */
  readonly draftStructures: readonly string[];
  /** How many children cannot be invoiced because of those drafts. */
  readonly unbillable?: number;
  readonly applicationsWaiting: number;
  readonly oldestWaitingDays: number;
  readonly likelyDuplicates: number;
  readonly studentsOver60Days: number;
}

const plural = (count: number, one: string, many: string): string =>
  count === 1 ? one : many;

/**
 * Build the list, worst first.
 *
 * Nothing is invented: every item here corresponds to a number the server
 * returned, and an item with a count of zero does not appear at all. An
 * attention list padded with "all clear" rows is an attention list nobody
 * reads.
 */
export function attentionItems(facts: AttentionFacts): readonly AttentionItem[] {
  const items: AttentionItem[] = [];

  if (facts.suspenseCount > 0) {
    items.push({
      id: 'suspense',
      severity: 'urgent',
      title: `${facts.suspenseCount} ${plural(
        facts.suspenseCount,
        'payment is',
        'payments are',
      )} sitting in the suspense account`,
      detail: facts.suspenseFrom
        ? `${formatMoney(facts.suspenseTotal)} arrived with no matching invoice, including one from ${facts.suspenseFrom}.`
        : `${formatMoney(facts.suspenseTotal)} arrived with no matching invoice.`,
      action: { label: 'Match it to a student', to: '/fees?tab=suspense' },
    });
  }

  for (const level of facts.draftStructures) {
    items.push({
      id: `structure:${level}`,
      severity: 'soon',
      title: `${level} fee structure is not published`,
      detail: facts.unbillable
        ? `${facts.unbillable} invoices cannot be raised until it is.`
        : 'No invoices can be raised for that level until it is.',
      action: { label: 'Publish the structure', to: '/fees?tab=structures' },
    });
  }

  if (facts.studentsOver60Days > 0) {
    items.push({
      id: 'long-arrears',
      severity: 'urgent',
      title: `${facts.studentsOver60Days} ${plural(
        facts.studentsOver60Days,
        'child is',
        'children are',
      )} more than 60 days behind`,
      detail: 'Past sixty days, arrears stop being a timing problem.',
      action: { label: 'Open the arrears list', to: '/fees?tab=arrears' },
    });
  }

  if (facts.applicationsWaiting > 0) {
    items.push({
      id: 'applications',
      severity: facts.oldestWaitingDays >= 7 ? 'urgent' : 'soon',
      title: `${facts.applicationsWaiting} ${plural(
        facts.applicationsWaiting,
        'application is',
        'applications are',
      )} waiting for review`,
      detail:
        facts.likelyDuplicates > 0
          ? `${facts.likelyDuplicates} look like duplicates of children already enrolled. Oldest waiting ${facts.oldestWaitingDays} days.`
          : `Oldest waiting ${facts.oldestWaitingDays} ${plural(
              facts.oldestWaitingDays,
              'day',
              'days',
            )}.`,
      action: { label: 'Open the review queue', to: '/admissions' },
    });
  }

  // Urgent first, and otherwise the order they were added — which is the order
  // a bursar would work through them.
  return [
    ...items.filter((item) => item.severity === 'urgent'),
    ...items.filter((item) => item.severity === 'soon'),
  ];
}

/** Local to this file: the attention list quotes figures inside sentences. */
function formatMoney(amount: number): string {
  return `TZS ${new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 }).format(amount)}`;
}
