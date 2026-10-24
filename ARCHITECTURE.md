# How this app is layered

Four layers. ESLint fails the build when an import crosses the wrong way.

```
src/domain/       Rules.  Pure TypeScript: no React, no fetch, no clock.
src/api/          Transport.  fetch, cache keys, DTOs.  No rules.
src/features/     Pages and hooks.  The only layer allowed to use both.
src/components/   Primitives.  Props in, markup out.  No fetching, no rules.
```

## Why a component holds no logic

A rule inside a component can only be tested by rendering the component, so it
stops being tested. It also cannot be reused: the same arrears calculation then
gets written a second time in the parent portal and a third time in a report,
and the three drift. Put it in `src/domain/` and all three import it.

The test for whether something is a rule: *would it still be true if the app had
no screen?* An invoice is in arrears when its balance is positive and the due
date has passed — true with no screen, so it is a rule. Whether the pill is red
is not.

## The seam

`src/features/*/hooks/` is where transport meets rules. A hook fetches with a
query hook, runs the facts through `@/domain`, and returns a view model the
component renders without deciding anything.

Follow the worked example:

1. `src/api/queries/invoices.ts` — fetching and cache keys, no arithmetic
2. `src/domain/fees.ts` — balance, arrears, whether payment is possible
3. `src/features/fees/hooks/useInvoiceView.ts` — the seam
4. `tests/unit/fees.test.ts` — the rules tested with no DOM

## Pass the clock in

`feeState(invoice, asOf)` takes the day as an argument rather than calling
`new Date()` inside. A rule that reads the clock cannot be tested, and a report
run for last month must not silently use today.

## Checking it

```bash
npm run lint        # layering + typescript-eslint, zero warnings allowed
npm run typecheck
npm run test
```

## The one thing this layer may not decide

The server owns the truth about money. `src/domain/fees.ts` mirrors the
arithmetic in the API's `app/domain/payments.py` so the UI can show a balance
without a round trip — it never decides whether a payment was accepted. If the
two ever disagree, the server is right and this copy is the bug.
