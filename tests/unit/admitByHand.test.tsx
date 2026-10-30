/**
 * The counter admission form, rendered.
 *
 * What is worth testing here is what the pure rules cannot reach: that the
 * wizard will not walk past a step it has not been given, that a full class is
 * not offered, that the number already on file is surfaced *before* the
 * submit, and that the screen afterwards names the admission number and the
 * bill rather than just saying "done".
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sent: { path: string; init: RequestInit }[] = [];

let atNumber: unknown = null;
const admitted: unknown = {
  student_id: 'stu-1',
  enrolment_id: 'enr-1',
  admission_no: 'MPS/2027/0142',
  class_name: 'Standard 1 Blue',
  guardian_id: 'g-1',
  guardian_existed: false,
  login: 'created',
  invoice_id: 'inv-1',
  invoice_reference: 'INV/Term1/0042',
  billed: '475000.00',
};
let fails: string | null = null;

vi.mock('@/api/client', () => ({
  api: (path: string, init: RequestInit = {}) => {
    sent.push({ path, init });
    if (path.startsWith('/guardians/at-number')) return Promise.resolve(atNumber);
    if (path === '/admissions/by-hand') {
      if (fails) return Promise.reject(new Error(fails));
      return Promise.resolve(admitted);
    }
    if (path === '/academic/years')
      return Promise.resolve([{ id: 'year-1', label: '2027', is_current: true, is_closed: false }]);
    if (path.startsWith('/academic/years/year-1/terms'))
      return Promise.resolve([
        { id: 't1', academic_year_id: 'year-1', index: 1, label: 'Term 1', is_current: true },
      ]);
    if (path === '/academic/levels')
      return Promise.resolve([
        { id: 'lvl-1', code: 'STD1', name: 'Standard 1', stage: 'primary', order_index: 1 },
      ]);
    if (path === '/academic/class-groups')
      return Promise.resolve([
        {
          id: 'cg-blue',
          academic_year_id: 'year-1',
          level_id: 'lvl-1',
          stream_id: null,
          name: 'Standard 1 Blue',
          capacity: 40,
          pupils: 36,
        },
        {
          id: 'cg-green',
          academic_year_id: 'year-1',
          level_id: 'lvl-1',
          stream_id: null,
          name: 'Standard 1 Green',
          capacity: 40,
          pupils: 40,
        },
      ]);
    return Promise.resolve([]);
  },
  ApiError: class extends Error {},
}));

let may = true;
vi.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({ can: () => may, principal: null, signOut: vi.fn() }),
}));

const { default: AdmitByHandPage } = await import('@/features/admissions/AdmitByHandPage');

function show(at = '/students/new') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[at]}>
        <Routes>
          <Route path="/students/new" element={<AdmitByHandPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  sent.length = 0;
  atNumber = null;
  fails = null;
  may = true;
});

async function fillChild(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/First name/), 'Glory');
  await user.type(screen.getByLabelText(/^Surname/), 'Mwakalebela');
  await user.type(screen.getByLabelText(/Date of birth/), '2020-04-11');
  await user.click(screen.getByRole('button', { name: 'Girl' }));
}

describe('the wizard will not walk past a step', () => {
  it('refuses to continue from an empty child step, and says what is missing', async () => {
    const user = userEvent.setup();
    show();

    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText(/first name and a surname/)).toBeInTheDocument();
    // Still on step one, and nothing has been sent.
    expect(screen.getByText(/Step 1 of 3/)).toBeInTheDocument();
    expect(sent.some((call) => call.path === '/admissions/by-hand')).toBe(false);
  });

  it('will not submit a form reached through the URL with earlier steps empty', async () => {
    const user = userEvent.setup();
    // A registrar can type ?step=guardian and fill only what is in front of
    // them. The last step looks complete; the child and the class are not.
    // This form writes a bill, so every step is checked again at the submit.
    show('/students/new?step=guardian');

    await user.type(await screen.findByLabelText(/Full name/), 'Asha Mwanjala');
    await user.type(screen.getByLabelText(/Phone number/), '0712445109');
    await user.click(screen.getByRole('button', { name: /Enrol this child/ }));

    expect(sent.some((call) => call.path === '/admissions/by-hand')).toBe(false);
    // Sent back to the step that is actually incomplete, with the reason
    // still on screen — moving somebody without saying why is worse than
    // refusing them where they stood.
    expect(await screen.findByText(/Step 1 of 3/)).toBeInTheDocument();
    expect(screen.getByText(/first name and a surname/)).toBeInTheDocument();
  });

  it('moves on once the child is complete', async () => {
    const user = userEvent.setup();
    show();

    await fillChild(user);
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText(/Step 2 of 3/)).toBeInTheDocument();
  });
});

describe('choosing a class', () => {
  it('offers the one with room and not the full one', async () => {
    const user = userEvent.setup();
    show();
    await fillChild(user);
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByLabelText(/Standard 1 Blue/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Standard 1 Green/)).toBeNull();
    expect(screen.getByText('4 places left')).toBeInTheDocument();
    // And it says why one is missing, rather than leaving a gap.
    expect(screen.getByText(/1 class is full/)).toBeInTheDocument();
  });
});

describe('a phone number the school already has', () => {
  it('says whose it is before the submit, and that the typed name will not be used', async () => {
    atNumber = {
      guardian: {
        id: 'g-1',
        full_name: 'Asha Mwanjala',
        phone: '0712445109',
        alt_phone: null,
        email: null,
        national_id: null,
        occupation: null,
        address: null,
        locale: 'en',
        sms_opted_out: false,
      },
      children: [
        {
          student_id: 'stu-0',
          admission_no: 'MPS/2026/0003',
          full_name: 'Neema Mwanjala',
          class_name: 'Standard 4 Blue',
          relationship: 'mother',
          is_primary: true,
          receives_invoices: true,
          billed: '0',
          settled: '0',
          balance: '0',
        },
      ],
    };
    const user = userEvent.setup();
    show('/students/new?step=guardian');

    await user.type(screen.getByLabelText(/Phone number/), '0712445109');

    const warning = await screen.findByText(/already on a pupil/);
    const box = warning.closest('p') as HTMLElement;
    expect(within(box).getByText(/Neema Mwanjala in Standard 4 Blue/)).toBeInTheDocument();
    expect(within(box).getByText(/the name on file is kept/)).toBeInTheDocument();
  });

  it('asks nothing until there is a whole number to ask about', async () => {
    const user = userEvent.setup();
    show('/students/new?step=guardian');

    await user.type(screen.getByLabelText(/Phone number/), '0712');

    expect(sent.some((call) => call.path.startsWith('/guardians/at-number'))).toBe(false);
  });
});

describe('after the admission', () => {
  it('names the admission number and the bill, with somewhere to go', async () => {
    const user = userEvent.setup();
    show();

    await fillChild(user);
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(await screen.findByLabelText(/Standard 1 Blue/));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.type(await screen.findByLabelText(/Full name/), 'Asha Mwanjala');
    await user.type(screen.getByLabelText(/Phone number/), '0712445109');
    await user.click(screen.getByRole('button', { name: /Enrol this child/ }));

    expect(await screen.findByText('MPS/2027/0142')).toBeInTheDocument();
    expect(screen.getByText(/INV\/Term1\/0042/)).toBeInTheDocument();
    expect(screen.getByText(/475,000/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open the invoice/ })).toHaveAttribute(
      'href',
      '/fees/inv-1',
    );
    expect(screen.getByRole('link', { name: /Open the pupil record/ })).toHaveAttribute(
      'href',
      '/students/stu-1',
    );

    const call = sent.filter((each) => each.path === '/admissions/by-hand').at(-1);
    // The client always sends a JSON string; this is the shape of it.
    const body = JSON.parse(call?.init.body as string) as Record<string, unknown>;
    expect(body.class_group_id).toBe('cg-blue');
    expect((body.guardian as Record<string, string>).phone).toBe('0712445109');
  });

  it('keeps what was typed when the server refuses', async () => {
    fails = 'Standard 1 Blue is full (40 of 40). Raise its capacity under Classes';
    const user = userEvent.setup();
    show();

    await fillChild(user);
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(await screen.findByLabelText(/Standard 1 Blue/));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.type(await screen.findByLabelText(/Full name/), 'Asha Mwanjala');
    await user.type(screen.getByLabelText(/Phone number/), '0712445109');
    await user.click(screen.getByRole('button', { name: /Enrol this child/ }));

    expect(await screen.findByText(/is full \(40 of 40\)/)).toBeInTheDocument();
    // Nothing is lost: the registrar can change the class and try again
    // rather than typing a family in twice.
    expect(screen.getByLabelText(/Full name/)).toHaveValue('Asha Mwanjala');
  });
});

describe('an account that may not admit', () => {
  it('says so instead of letting a family be typed in', () => {
    may = false;
    show();

    expect(screen.getByText(/cannot admit a child/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull();
  });
});
