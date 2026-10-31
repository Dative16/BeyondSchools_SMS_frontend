/**
 * The three setup screens, rendered.
 *
 * Each test is about something the pure rules cannot reach: whether a
 * destructive or far-reaching action is actually prevented on screen, and
 * whether the screen explains itself when it refuses.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sent: { path: string; init: RequestInit }[] = [];

const YEARS = [
  { id: 'y27', label: '2027', starts_on: '2027-01-08', ends_on: '2027-12-04', is_current: true, is_closed: false },
  { id: 'y26', label: '2026', starts_on: '2026-01-08', ends_on: '2026-12-04', is_current: false, is_closed: true },
  { id: 'y28', label: '2028', starts_on: '2028-01-08', ends_on: '2028-12-04', is_current: false, is_closed: false },
];

const TERMS_27 = [
  { id: 't1', academic_year_id: 'y27', index: 1, label: 'Term 1', starts_on: '2027-01-11', ends_on: '2027-04-09', is_current: true },
  { id: 't2', academic_year_id: 'y27', index: 2, label: 'Term 2', starts_on: '2027-05-03', ends_on: '2027-08-06', is_current: false },
];

const LEVELS = [
  { id: 'l6', code: 'STD6', name: 'Standard 6', stage: 'primary', order_index: 6, next_level_id: null, entry_age: null, is_active: true },
  { id: 'l7', code: 'STD7', name: 'Standard 7', stage: 'primary', order_index: 7, next_level_id: null, entry_age: null, is_active: true },
];

let ladder: unknown = {
  academic_year_id: 'y27',
  levels: LEVELS,
  exit_level_ids: ['l6', 'l7'],
  steps: [
    { level_id: 'l6', outcome: 'graduate', next_level_id: null, reason: '' },
    { level_id: 'l7', outcome: 'graduate', next_level_id: null, reason: '' },
  ],
  problems: [],
  summary: 'Two cohorts leave.',
};

let classes: unknown = [
  { id: 'cg1', academic_year_id: 'y27', level_id: 'l6', stream_id: null, name: 'Standard 6 Blue', class_teacher_id: null, room: null, capacity: 40, pupils: 38 },
];

const staff: unknown = [
  { id: 'u1', full_name: 'Grace Kessy', role: 'class_teacher', staff_no: 'MPS-010', class_group_id: null, class_name: null, subjects_taught: 2 },
  { id: 'u2', full_name: 'Joseph Mbwana', role: 'subject_teacher', staff_no: 'MPS-011', class_group_id: 'cg9', class_name: 'Standard 4 Blue', subjects_taught: 4 },
];

vi.mock('@/api/client', () => ({
  api: (path: string, init: RequestInit = {}) => {
    sent.push({ path, init });
    if (path === '/academic/years') return Promise.resolve(YEARS);
    if (path.startsWith('/academic/years/y27/terms')) return Promise.resolve(TERMS_27);
    if (path.includes('/terms')) return Promise.resolve([]);
    if (path.startsWith('/academic/ladder')) return Promise.resolve(ladder);
    if (path.startsWith('/academic/class-groups')) return Promise.resolve(classes);
    if (path.startsWith('/academic/teaching-staff')) return Promise.resolve(staff);
    if (path === '/academic/levels') return Promise.resolve(LEVELS);
    if (path === '/academic/streams') return Promise.resolve([]);
    if (path === '/fees/structures') return Promise.resolve([]);
    if (path === '/schools/me') return Promise.resolve({ invoice_grace_days: 14, name: 'Mwenge' });
    return Promise.resolve([]);
  },
  ApiError: class extends Error {},
}));

let may = true;
vi.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({ can: () => may, principal: null, signOut: vi.fn() }),
}));

const { default: YearsPage } = await import('@/features/setup/YearsPage');
const { default: LevelsPage } = await import('@/features/setup/LevelsPage');
const { default: ClassesPage } = await import('@/features/setup/ClassesPage');

function show(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  sent.length = 0;
  may = true;
});

describe('years and terms', () => {
  it('will not let overlapping dates be saved, and says why', async () => {
    const user = userEvent.setup();
    show(<YearsPage />);

    const starts = await screen.findAllByLabelText('Starts');
    // Drag Term 1 forward so it swallows Term 2's first weeks.
    await user.clear(starts[0] as HTMLElement);
    const ends = screen.getAllByLabelText('Ends');
    await user.clear(ends[0] as HTMLElement);
    await user.type(ends[0] as HTMLElement, '2027-05-10');
    await user.type(starts[0] as HTMLElement, '2027-01-11');

    expect(await screen.findByText(/cover the same days/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save term dates/ })).toBeDisabled();
    expect(sent.some((call) => call.init.method === 'PUT')).toBe(false);
  });

  it('says where the fee due date actually comes from', async () => {
    show(<YearsPage />);

    // The artboard draws a per-term "fees due" field. There is no such field,
    // and two places that could disagree about when a bill is late is worse
    // than one rule stated plainly.
    expect(await screen.findByText(/When fees fall due/)).toBeInTheDocument();
    expect(screen.getByText(/14 days after it is issued/)).toBeInTheDocument();
  });

  it('offers no way to reopen a closed year', async () => {
    const user = userEvent.setup();
    show(<YearsPage />);

    await user.click(await screen.findByRole('button', { name: /2026/ }));

    expect(await screen.findByText('This year is closed')).toBeInTheDocument();
    expect(screen.getByText(/ask a platform administrator/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Save term dates/ })).toBeNull();
  });

  it('will not move the school into a year with no terms', async () => {
    const user = userEvent.setup();
    show(<YearsPage />);

    await user.click(await screen.findByRole('button', { name: /2028/ }));

    const button = await screen.findByRole('button', { name: /Move the school into 2028/ });
    expect(button).toBeDisabled();
    expect(screen.getByText(/Term dates, which decide when fees fall due/)).toBeInTheDocument();
  });
});

describe('levels and the ladder', () => {
  it('adds up two leaving cohorts and tells the office', async () => {
    classes = [
      { id: 'cg1', academic_year_id: 'y27', level_id: 'l6', stream_id: null, name: 'Standard 6 Blue', class_teacher_id: null, room: null, capacity: 40, pupils: 38 },
      { id: 'cg2', academic_year_id: 'y27', level_id: 'l7', stream_id: null, name: 'Standard 7', class_teacher_id: null, room: null, capacity: 40, pupils: 34 },
    ];
    show(<LevelsPage />);

    const panel = (await screen.findByText(/Two cohorts leave at the end of 2027/)).closest(
      'section',
    ) as HTMLElement;
    expect(within(panel).getByText(/72 school leavers in one December/)).toBeInTheDocument();
    expect(within(panel).getByText('Standard 6')).toBeInTheDocument();
  });

  it('flags a level whose next step nobody has recorded', async () => {
    ladder = {
      academic_year_id: 'y27',
      levels: LEVELS,
      exit_level_ids: [],
      steps: [
        { level_id: 'l6', outcome: 'promote', next_level_id: 'l7', reason: '' },
        { level_id: 'l7', outcome: 'undefined', next_level_id: null, reason: 'nothing above it' },
      ],
      problems: ['Standard 7 has nothing above it and is not marked as leaving.'],
      summary: '',
    };
    show(<LevelsPage />);

    expect(await screen.findByText(/cannot read this ladder yet/)).toBeInTheDocument();
    const table = within(screen.getByRole('table'));
    expect(table.getByText(/Nowhere — nobody has said/)).toBeInTheDocument();
  });
});

describe('classes', () => {
  beforeEach(() => {
    classes = [
      { id: 'cg1', academic_year_id: 'y27', level_id: 'l6', stream_id: null, name: 'Standard 6 Blue', class_teacher_id: null, room: null, capacity: 40, pupils: 38 },
    ];
  });

  it('says plainly when a class has nobody to take the register', async () => {
    show(<ClassesPage />);

    // Said twice on purpose: once on the list row, once on the panel. The
    // panel is the one that explains what it costs.
    expect((await screen.findAllByText(/No class teacher yet/)).length).toBeGreaterThan(0);
    expect(screen.getByText(/guardians have no name to ask for/)).toBeInTheDocument();
  });

  it('offers only people who can take a register, and what each already holds', async () => {
    const user = userEvent.setup();
    show(<ClassesPage />);

    await user.click(await screen.findByRole('button', { name: /Put a teacher in front of it/ }));

    expect(await screen.findByText('Grace Kessy')).toBeInTheDocument();
    expect(screen.getByText('no class · 2 subjects')).toBeInTheDocument();
    // A teacher who already has a class can take a second — but it has to show.
    expect(screen.getByText('already has Standard 4 Blue · 4 subjects')).toBeInTheDocument();
    expect(screen.getByText(/falls to one person twice a day/)).toBeInTheDocument();
  });

  it('reports a class over its capacity rather than hiding it', async () => {
    classes = [
      { id: 'cg1', academic_year_id: 'y27', level_id: 'l6', stream_id: null, name: 'Standard 6 Blue', class_teacher_id: null, room: null, capacity: 35, pupils: 37 },
    ];
    show(<ClassesPage />);

    expect(await screen.findByText(/37 pupils in a class set to hold 35/)).toBeInTheDocument();
  });

  it('does not pretend a class can be closed', async () => {
    show(<ClassesPage />);

    // The artboard has a "Close the class" button. Nothing in the API closes
    // one, and a class that vanished under an invoice would leave a bill
    // nobody could explain.
    expect(await screen.findByText('Closing a class')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Close the class/ })).toBeNull();
  });

  it('shows an account without academic rights nothing to change', async () => {
    may = false;
    show(<ClassesPage />);

    expect((await screen.findAllByText('Standard 6 Blue')).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Add a class' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Save this class/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Put a teacher/ })).toBeNull();
  });
});
