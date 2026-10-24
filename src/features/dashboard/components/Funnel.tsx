/**
 * The admissions funnel: five steps, each a share of the first.
 *
 * Five across on a wide screen and two across on a phone, rather than a single
 * scrolling row — the shape of a funnel is the information, and a funnel you
 * have to scroll sideways to see the end of has lost it.
 *
 * The bars are proportional to `Started`, not to each step's own maximum, so
 * the drop-off between offered and enrolled is visible. That gap is the one a
 * school acts on: it is the children who were offered a place and never paid
 * the deposit.
 */

export interface FunnelStep {
  readonly label: string;
  readonly count: number;
  readonly percent: number;
}

export function Funnel({
  steps,
  loading,
}: {
  readonly steps: readonly FunnelStep[];
  readonly loading: boolean;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((step) => (
          <div key={step} className="h-[86px] animate-pulse rounded-[10px] bg-line-soft" />
        ))}
      </div>
    );
  }

  if (steps.length === 0) {
    return (
      <p className="m-0 py-4 text-[13px] text-muted">
        No applications have been started for the current intake.
      </p>
    );
  }

  return (
    <ol className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 lg:grid-cols-5">
      {steps.map((step) => (
        <li key={step.label} className="rounded-[10px] border border-line p-[13px_14px]">
          <p className="m-0 mb-2 text-xs font-medium text-muted">{step.label}</p>
          <p className="m-0 mb-2.5 font-display text-[23px] font-semibold">{step.count}</p>
          <div
            className="h-[5px] overflow-hidden rounded-[3px] bg-line-soft"
            role="img"
            aria-label={`${step.percent}% of those who started`}
          >
            <div className="h-[5px] bg-brand" style={{ width: `${step.percent}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}
