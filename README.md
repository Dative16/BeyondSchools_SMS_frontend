# BeyondSchools SMS — Web

React + TypeScript front end for the school management system. Talks to
`beyondschools-sms-api` and hands students across to aibeyondschools.co.tz with
the same token, so nobody signs in twice.

## Running it

```bash
cp .env.example .env
npm install
npm run dev
```

Or `docker compose up` if you want it alongside the API stack.

The API has to be up on `:8000` — `make up` in `../beyondschools-sms-api`, then
`make seed` for the demo school. Sign in at <http://localhost:5173> as
`admin@mwenge.ac.tz` / `Shule2027!`.

### Why `/api` is proxied rather than called across origins

`VITE_API_BASE_URL` is `/api/v1`, a path and not a URL, and `vite.config.ts`
proxies it to `:8000`. That is not for convenience. The refresh token is an
httpOnly `SameSite=Lax` cookie scoped to `/api/v1/auth`, and a browser will not
send a Lax cookie from `localhost:5173` to `localhost:8000` at all — point the
base URL at the other origin and every page reload signs you out, with nothing
in the console to say why.

`VITE_SCHOOL_SUBDOMAIN` is the other half of the same problem. In production the
server reads the school off the host, `mwenge.beyondschools.co.tz`; on localhost
there is no subdomain to read, so the client sends an `X-School-Subdomain`
header instead. It chooses which school's login page you see. It is not a
credential, and the token still decides what you can read.

## Types come from the API, not from guesses

```bash
cd ../beyondschools-sms-api && make openapi
cd ../beyondschools-sms-web && npm run types
```

That writes `src/api/schema.d.ts`, which **is** committed: CI and a fresh clone
have to typecheck without the API repo sitting beside them, and a diff in that
file is how an API change shows up in review rather than as a red build a week
later. Regenerate it in the same commit as the change that needs it.

## Layout

```
src/
  domain/        business rules, pure: no React, no fetch, no clock
  api/
    client.ts    the only place fetch is called
    queries/     TanStack Query hooks, one file per resource
  features/      pages and hooks — the seam where transport meets rules
  components/
    ui/          primitives: Button, Card, DataTable, Field, Pill, StatTile
    layout/      TopBar, Sidebar, OfflineBanner — props in, markup out
    icons.tsx    the icon set, inline, currentColor throughout
  app/           router, providers, AppShell
  pwa/           the update prompt
  lib/           format.ts (TZS, dates, phone numbers), auth, tenant
  styles/        tokens.css — the design tokens the mockups use
  types/         hand-written domain types
```

Components hold no business logic and ESLint enforces it: `src/domain` cannot
import React or anything of ours, and `src/components` cannot import `@/api`.
See `ARCHITECTURE.md` and the worked example in `src/domain/fees.ts`.

## It is a PWA, and the honest part is the banner

`vite-plugin-pwa` precaches the shell — the HTML, the JS, the CSS, the icons and
the fonts — so the app opens with no network. Nothing else is cached, and that
is deliberate: an app that opens offline, draws a dashboard and says nothing has
just told a bursar that collection is 38.4M when the real figure moved an hour
ago. The shell loads, the numbers do not, and `OfflineBanner` is what explains
the difference.

Updates prompt rather than apply themselves, and the prompt holds back while
anything is being typed into: reloading a half-entered admission is worse than
running yesterday's build for another ten minutes.

```bash
npm run build && npm run preview   # the service worker only exists in a build
```

The icons in `public/icons/` are generated, not drawn by hand — a schoolhouse on
`--color-brand-strong` with a lime door, in the sizes a launcher asks for,
including a maskable one with the glyph inside the safe circle.

## Three things to hold to

**Phone first.** Most guardians and most students reach this on a phone over 3G.
Design at 360px and treat desktop as the wide case. Touch targets are 44px, and
nothing may scroll sideways at 360 — the shell is checked at that width.

The sidebar is the worked example: a column from `lg` up, a drawer below it,
one `NAV` list behind both so they cannot drift. The drawer takes focus when it
opens, gives it back when it closes, shuts on Escape, and stops the page
scrolling behind it. Those four together are the difference between a drawer
and a trap. `DataTable` is the other one: a real `<table>` on a wide screen, a
card per row on a phone, and only ever one of them in the accessibility tree.

**The lime is an accent.** `#86E714` is the brand green and fails contrast as a
button fill or text colour. Use `--color-brand-strong` wherever text sits on it.

**A student is a person; an enrolment is that person in one class for one year.**
Never put a current class on a student object. See `src/types/domain.ts`.
