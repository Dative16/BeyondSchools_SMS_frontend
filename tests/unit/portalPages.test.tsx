/**
 * The portal, rendered.
 *
 * Two things here are worth more than the rest. That a guardian landing on
 * the app sees their own children rather than the staff dashboard — the hole
 * this step was written to close. And that pressing "Go to my lessons" calls
 * `/auth/ai-handoff` and goes where the *server* said, because a signed token
 * plus a client-chosen destination is an open redirect that leaks the token.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sent: { path: string; init: RequestInit }[] = [];
const wentTo: string[] = [];

const CHILDREN = [
  {
    student_id: 'stu-1',
    admission_no: 'MPS/2024/0142',
    full_name: 'Neema Mwanjala',
    class_name: 'Standard 4 Blue',
    relationship: 'mother',
    is_primary: true,
    receives_invoices: true,
    billed: '320000.00',
    settled: '320000.00',
    balance: '0.00',
  },
  {
    student_id: 'stu-2',
    admission_no: 'MPS/2027/0177',
    full_name: 'Baraka Mwanjala',
    class_name: 'Standard 1 Green',
    relationship: 'mother',
    is_primary: true,
    receives_invoices: true,
    billed: '325000.00',
    settled: '175000.00',
    balance: '150000.00',
  },
];

let school: Record<string, unknown> = {
  id: 'sch-1',
  name: 'Mwenge Primary School',
  bank_name: 'NMB',
  bank_account_name: 'Mwenge Primary School',
  bank_account_number: '2011 4409 118',
  invoice_grace_days: 14,
};

let handoff: unknown = {
  token: 'a-short-lived-token',
  expires_at: '2027-01-11T09:02:00Z',
  expires_in: 120,
  redirect_url: 'https://aibeyondschools.co.tz/sso?t=a-short-lived-token',
};

vi.mock('@/api/client', () => ({
  api: (path: string, init: RequestInit = {}) => {
    sent.push({ path, init });
    if (path === '/guardians/me/children') return Promise.resolve(CHILDREN);
    if (path === '/schools/me') return Promise.resolve(school);
    if (path === '/auth/ai-handoff') return Promise.resolve(handoff);
    if (path === '/academic/years')
      return Promise.resolve([
        { id: 'y27', label: '2027', is_current: true, is_closed: false },
      ]);
    if (path.startsWith('/academic/years/y27/terms'))
      return Promise.resolve([
        {
          id: 't1',
          academic_year_id: 'y27',
          index: 1,
          label: 'Term 1',
          starts_on: '2027-01-11',
          ends_on: '2027-04-09',
          is_current: true,
        },
      ]);
    if (path.startsWith('/students/'))
      return Promise.resolve({
        student: {
          id: 'stu-1',
          admission_no: 'MPS/2024/0142',
          first_name: 'Neema',
          middle_name: null,
          surname: 'Mwanjala',
        },
        enrolment: { id: 'enr-1', residency: 'day' },
        class_name: 'Standard 4 Blue',
        history: [{ id: 'enr-1', enrolled_on: '2024-01-08', class_name: 'Standard 1 Blue' }],
        guardians: [{ guardian_id: 'g-1', full_name: 'Asha Mwanjala' }],
        billed: '320000.00',
        settled: '320000.00',
        balance: '0.00',
        field_values: [],
        health: null,
        emergency_contacts: [],
      });
    if (path.includes('/statement'))
      return Promise.resolve({
        student_id: 'stu-2',
        invoices: [
          {
            id: 'inv-1',
            reference: 'INV/Term1/0042',
            kind: 'term',
            academic_year: '2027',
            term_label: 'Term 1',
            issued_on: '2027-01-11',
            due_date: '2027-01-25',
            billed: '325000.00',
            settled: '175000.00',
            balance: '150000.00',
            is_void: false,
          },
        ],
        billed: '325000.00',
        settled: '175000.00',
        balance: '150000.00',
      });
    return Promise.resolve([]);
  },
  ApiError: class extends Error {},
}));

let role = 'guardian';
const signOut = vi.fn();
vi.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({
    can: () => false,
    principal: {
      user_id: 'u-1',
      full_name: 'Asha Mwanjala',
      role,
      student_id: role === 'student' ? 'stu-1' : null,
      guardian_id: role === 'guardian' ? 'g-1' : null,
      permissions: [],
      phone: '0754118902',
    },
    signOut,
  }),
}));

const { default: ParentHomePage } = await import('@/features/portal/ParentHomePage');
const { default: ChildPage } = await import('@/features/portal/ChildPage');
const { default: StatementPage } = await import('@/features/portal/StatementPage');
const { default: MyAccountPage } = await import('@/features/portal/MyAccountPage');

function show(ui: React.ReactElement, at = '/') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[at]}>
        <Routes>
          <Route path="/" element={ui} />
          <Route path="/children/:studentId" element={ui} />
          <Route path="/children/:studentId/statement" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  sent.length = 0;
  wentTo.length = 0;
  role = 'guardian';
  handoff = {
    token: 'a-short-lived-token',
    expires_at: '2027-01-11T09:02:00Z',
    expires_in: 120,
    redirect_url: 'https://aibeyondschools.co.tz/sso?t=a-short-lived-token',
  };
  school = {
    id: 'sch-1',
    name: 'Mwenge Primary School',
    bank_name: 'NMB',
    bank_account_name: 'Mwenge Primary School',
    bank_account_number: '2011 4409 118',
    invoice_grace_days: 14,
  };
  vi.stubGlobal('location', { assign: (url: string) => wentTo.push(url) });
});

describe('a guardian signing in', () => {
  it('sees their own children and what each owes', async () => {
    show(<ParentHomePage />);

    expect(await screen.findByText('Habari, Asha')).toBeInTheDocument();
    expect(await screen.findByText('Neema Mwanjala')).toBeInTheDocument();
    expect(screen.getByText('Baraka Mwanjala')).toBeInTheDocument();
    // The total they think in, not two numbers to add up themselves. It
    // appears on the tile and again as Baraka's balance, which is the point.
    expect(screen.getAllByText('150,000').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Settled')).toBeInTheDocument();
    expect(screen.getByText('Part paid')).toBeInTheDocument();
  });

  it('offers no way to pay, and says where to pay instead', async () => {
    show(<ParentHomePage />);

    expect(await screen.findByText('2011 4409 118')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Pay/ })).toBeNull();
    expect(screen.getByText(/no payment button in this portal/)).toBeInTheDocument();
    // The reference is what lets the office find the right child. Shown on
    // the child's card and again as what to write on the slip.
    expect(screen.getAllByText(/MPS\/2024\/0142/).length).toBeGreaterThanOrEqual(2);
  });

  it('sends them to the office when the school has published no bank details', async () => {
    school = { id: 'sch-1', name: 'Mwenge Primary School', invoice_grace_days: 14 };
    show(<ParentHomePage />);

    // The whole sentence, so the match cannot also land on an ancestor.
    expect(
      await screen.findByText(/^Pay at the school office\./),
    ).toBeInTheDocument();
    expect(screen.queryByText('School bank account')).toBeNull();
  });

  it('links each child to their own page and statement', async () => {
    show(<ParentHomePage />);

    const card = (await screen.findByText('Baraka Mwanjala')).closest('section') as HTMLElement;
    expect(within(card).getByRole('link', { name: 'Statement' })).toHaveAttribute(
      'href',
      '/children/stu-2/statement',
    );
    expect(within(card).getByRole('link', { name: 'School page' })).toHaveAttribute(
      'href',
      '/children/stu-2',
    );
  });
});

describe('crossing to the AI platform', () => {
  it('mints a token and goes where the server said', async () => {
    const user = userEvent.setup();
    role = 'student';
    show(<ChildPage />);

    await user.click(await screen.findByRole('button', { name: /Go to my lessons/ }));

    const call = sent.find((each) => each.path === '/auth/ai-handoff');
    expect(call, 'the endpoint the whole project rests on').toBeDefined();
    expect(JSON.parse(call?.init.body as string)).toEqual({ student_id: 'stu-1' });
    // The destination came back from the server. A client-chosen one would be
    // an open redirect that hands the token to whoever asked.
    expect(wentTo).toEqual(['https://aibeyondschools.co.tz/sso?t=a-short-lived-token']);
  });

  it('does not navigate when the handoff is refused', async () => {
    const user = userEvent.setup();
    role = 'student';
    handoff = Promise.reject(new Error('this account may not cross over'));
    show(<ChildPage />);

    await user.click(await screen.findByRole('button', { name: /Go to my lessons/ }));

    expect(wentTo).toEqual([]);
  });
});

describe('a pupil on their own page', () => {
  it('shows their record and withholds the sensitive half', async () => {
    role = 'student';
    show(<ChildPage />);

    expect(await screen.findByText('Habari, Neema')).toBeInTheDocument();
    const record = (await screen.findByText('My record')).closest('section') as HTMLElement;
    expect(within(record).getByText('MPS/2024/0142')).toBeInTheDocument();
    expect(within(record).getByText('Standard 4 Blue')).toBeInTheDocument();
    // Health and emergency contacts come back null for them from the server.
    expect(screen.queryByText(/allerg/i)).toBeNull();
  });

  it('tells them their fees are shown to their guardian', async () => {
    role = 'student';
    show(<ChildPage />);

    expect(await screen.findByText(/shown to Asha Mwanjala/)).toBeInTheDocument();
  });

  it('says a report is not published rather than inventing one', async () => {
    role = 'student';
    show(<ChildPage />);

    expect(await screen.findByText(/Not published yet/)).toBeInTheDocument();
  });
});

describe('a statement', () => {
  it('lists every bill with what was received against it', async () => {
    show(<StatementPage />, '/children/stu-2/statement');

    expect(await screen.findByText('INV/Term1/0042', { exact: false })).toBeInTheDocument();
    expect(screen.getByText(/150,000 to pay/)).toBeInTheDocument();
    expect(screen.getByText(/Receipts are entered by the office/)).toBeInTheDocument();
  });
});

describe('my account', () => {
  it('shows the sign-in number as confirmation, not as a field', async () => {
    show(<MyAccountPage />);

    expect(await screen.findByText('0754 118 902')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Phone number/)).toBeNull();
    expect(screen.getAllByText(/Changed by the school office/).length).toBeGreaterThan(0);
  });

  it('will not change a password until every rule is met', async () => {
    const user = userEvent.setup();
    show(<MyAccountPage />);

    const button = await screen.findByRole('button', { name: /Change my password/ });
    expect(button).toBeDisabled();

    await user.type(screen.getByLabelText('Current password'), 'oldpassword');
    await user.type(screen.getByLabelText('New password'), 'short');
    expect(await screen.findByText(/Too short: 5 of 10/)).toBeInTheDocument();
    expect(button).toBeDisabled();

    await user.clear(screen.getByLabelText('New password'));
    await user.type(screen.getByLabelText('New password'), 'brandnew123');
    await user.type(screen.getByLabelText('New password again'), 'brandnew124');
    expect(await screen.findByText('These two do not match.')).toBeInTheDocument();
    expect(button).toBeDisabled();

    await user.clear(screen.getByLabelText('New password again'));
    await user.type(screen.getByLabelText('New password again'), 'brandnew123');
    expect(button).toBeEnabled();

    await user.click(button);
    const call = sent.find((each) => each.path === '/auth/password');
    expect(JSON.parse(call?.init.body as string)).toEqual({
      current_password: 'oldpassword',
      new_password: 'brandnew123',
    });
  });

  it('can sign out, for a shared phone', async () => {
    const user = userEvent.setup();
    show(<MyAccountPage />);

    await user.click(await screen.findByRole('button', { name: 'Sign out' }));

    expect(signOut).toHaveBeenCalled();
  });
});
