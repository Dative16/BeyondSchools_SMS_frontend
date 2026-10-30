/**
 * The fee structure editor, rendered.
 *
 * Worth testing because the thing this screen is for cannot be tested by
 * types: that an irreversible action is not reachable by one click. The rest
 * of the page is covered by the pure rules in feeStructure.test.ts; what is
 * here is the gate in front of publishing, and that a draft a bursar comes
 * back to actually shows what is in it.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sent: { path: string; init: RequestInit }[] = [];

const STRUCTURE = {
  id: 'str-1',
  academic_year_id: 'year-1',
  level_id: 'lvl-6',
  stream_id: null,
  label: 'Standard 6 2027',
  status: 'draft',
  published_at: null,
  note: null,
};

const ITEMS = [
  {
    id: 'it-1',
    name: 'Tuition',
    amount: '240000.00',
    category: 'tuition',
    frequency: 'per_term',
    term_index: null,
    is_mandatory: true,
  },
  {
    id: 'it-2',
    name: 'Registration',
    amount: '40000.00',
    category: 'admission',
    frequency: 'one_off',
    term_index: null,
    is_mandatory: true,
  },
];

interface Detail {
  structure: Omit<typeof STRUCTURE, 'status' | 'published_at'> & {
    status: string;
    published_at: string | null;
  };
  items: typeof ITEMS;
  enrolled_count: number;
}

let detail: Detail = { structure: STRUCTURE, items: ITEMS, enrolled_count: 38 };

vi.mock('@/api/client', () => ({
  api: (path: string, init: RequestInit = {}) => {
    sent.push({ path, init });
    if (path.startsWith('/fees/structures/str-1')) return Promise.resolve(detail);
    if (path === '/fees/structures')
      return Promise.resolve([
        { ...STRUCTURE, level_name: 'Standard 6', stream_name: null, item_count: 2, total_amount: '280000.00', enrolled_count: 38 },
        {
          id: 'str-2',
          academic_year_id: 'year-1',
          level_id: 'lvl-5',
          level_name: 'Standard 5',
          stream_id: null,
          stream_name: null,
          label: 'Standard 5 2027',
          status: 'published',
          published_at: '2026-10-20T08:00:00Z',
          note: null,
          item_count: 6,
          total_amount: '615000.00',
          enrolled_count: 63,
        },
      ]);
    if (path === '/academic/years')
      return Promise.resolve([
        { id: 'year-1', label: '2027', is_current: true, is_closed: false },
      ]);
    if (path.startsWith('/academic/years/year-1/terms'))
      return Promise.resolve([
        { id: 't1', academic_year_id: 'year-1', index: 1, label: 'Term 1', is_current: true },
        { id: 't2', academic_year_id: 'year-1', index: 2, label: 'Term 2', is_current: false },
        { id: 't3', academic_year_id: 'year-1', index: 3, label: 'Term 3', is_current: false },
      ]);
    if (path === '/academic/streams') return Promise.resolve([]);
    return Promise.resolve([]);
  },
  ApiError: class extends Error {},
}));

vi.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({ can: () => true, principal: null, signOut: vi.fn() }),
}));

const { default: FeeStructureEditorPage } = await import(
  '@/features/fees/FeeStructureEditorPage'
);

function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/fees/structures/str-1']}>
        <Routes>
          <Route path="/fees/structures/:structureId" element={<FeeStructureEditorPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  sent.length = 0;
  detail = { structure: STRUCTURE, items: ITEMS, enrolled_count: 38 };
});

describe('a draft a bursar comes back to', () => {
  it('shows the items that are in it, with how each one is billed', async () => {
    show();

    // Scoped to the table. The page renders the phone cards and the table
    // both, and lets CSS hide one — which jsdom, applying no CSS, does not
    // do, so an unscoped query sees every row twice.
    const table = within(await screen.findByRole('table'));
    expect(table.getByText('Tuition')).toBeInTheDocument();
    expect(table.getByText('Every term')).toBeInTheDocument();
    // The one-off is the line most easily misread as a termly charge.
    expect(table.getByText('When a child joins')).toBeInTheDocument();
    expect(table.getByText('Registration')).toBeInTheDocument();
  });

  it('totals each term separately and the year once', async () => {
    show();

    // Waits for the terms, not just the footer: the footer renders as soon as
    // there is an item, and would read zero until the year's terms arrive.
    const totals = (await screen.findByText('Term 3')).closest('dl') as HTMLElement;
    const read = (label: string) =>
      within(totals)
        .getByText(label)
        .closest('div')
        ?.querySelector('dd')?.textContent;

    // 240,000 a term across three terms; the joining charge outside all of
    // them, which is the whole point of its being a one-off.
    expect(read('Term 1')).toBe('240,000');
    expect(read('Term 3')).toBe('240,000');
    expect(read('Once, when a child joins')).toBe('40,000');
    expect(read('Full year')).toBe('720,000');
  });

  it('says publishing cannot be undone before anything can be clicked', async () => {
    show();

    const warning = await screen.findByText(/Publishing cannot be undone/);
    expect(warning).toBeInTheDocument();
  });

  it('says how many children publishing would bill', async () => {
    show();

    expect(await screen.findByText(/38 pupils are enrolled/)).toBeInTheDocument();
  });
});

describe('the gate in front of publishing', () => {
  it('will not publish until the figures are acknowledged', async () => {
    show();

    const button = await screen.findByRole('button', { name: /Publish this structure/ });
    expect(button).toBeDisabled();

    await userEvent.click(screen.getByRole('checkbox', { name: /checked every amount/ }));
    expect(button).toBeEnabled();

    expect(sent.some((call) => call.path.endsWith('/publish'))).toBe(false);
  });

  it('refuses an empty structure with the reason, and offers no checkbox at all', async () => {
    detail = { structure: STRUCTURE, items: [], enrolled_count: 38 };
    show();

    expect(await screen.findByText(/Add at least one fee item first/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Publish this structure/ })).toBeNull();
  });
});

describe('once it is published', () => {
  it('offers no way to change it, and points at raising the invoices', async () => {
    detail = {
      structure: { ...STRUCTURE, status: 'published', published_at: '2026-10-27T09:00:00Z' },
      items: ITEMS,
      enrolled_count: 38,
    };
    show();

    expect(await screen.findByText('Published and locked')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add a fee item/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Remove$/ })).toBeNull();
    expect(screen.queryByText(/Publishing cannot be undone/)).toBeNull();

    const link = screen.getByRole('link', { name: /raise the invoices/ });
    expect(link).toHaveAttribute('href', '/fees');
  });

  it('still lists the other levels, so the gaps are visible', async () => {
    show();

    const others = await screen.findByText(/Other levels, 2027/);
    expect(others).toBeInTheDocument();
    expect(within(others.closest('section') as HTMLElement).getByText('Standard 5')).toBeInTheDocument();
  });
});
