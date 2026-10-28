/**
 * The shared middle of both code flows: type the code, choose a password.
 *
 * "Set your first password" and "Forgot your password" are the same act —
 * prove the phone, then put a password on the account — and they call the same
 * endpoint. What differs is only what somebody is told around it, so the
 * wording is passed in and the mechanism is written once.
 *
 * Both boxes validate as you type and neither blocks you while you are still
 * typing: the password hint says how far you have got rather than refusing,
 * and the mismatch only appears once the second box has something in it.
 */

import { useState } from 'react';

import { Button, Field, Notice, TextInput } from '@/components/ui';
import { canSetPassword, passwordHint, passwordsMatch } from '@/domain/password';

const HINT_TONES = {
  muted: 'text-muted',
  ok: 'text-ok-ink',
  warn: 'text-warn-ink',
} as const;

export function CodeAndPassword({
  codeLabel,
  codeHelp,
  submitLabel,
  busy,
  error,
  onSubmit,
  onBack,
  backLabel,
}: {
  readonly codeLabel: string;
  readonly codeHelp: string;
  readonly submitLabel: string;
  readonly busy: boolean;
  readonly error: string | null;
  readonly onSubmit: (code: string, password: string) => void;
  readonly onBack?: () => void;
  readonly backLabel?: string;
}) {
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');

  const digits = code.replace(/\D/g, '');
  const codeReady = digits.length === 6;
  const hint = passwordHint(password);
  const ready = codeReady && canSetPassword(password, again);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (ready) onSubmit(digits, password);
      }}
      className="flex flex-col gap-4"
    >
      {error ? <Notice>{error}</Notice> : null}

      <div>
        <label htmlFor="code" className="mb-1.5 block text-[13px] font-semibold">
          {codeLabel}
        </label>
        <input
          id="code"
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={7}
          required
          autoFocus
          placeholder="000000"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          className="min-h-12 w-full rounded-[10px] border border-line bg-white px-3.5 text-xl font-medium tracking-[0.22em] text-ink"
        />
        <p
          className={`mt-1.5 mb-0 text-xs ${
            digits.length === 0
              ? 'text-muted'
              : codeReady
                ? 'text-ok-ink'
                : 'text-warn-ink'
          }`}
        >
          {digits.length === 0
            ? codeHelp
            : codeReady
              ? 'Looks complete.'
              : `${digits.length} of 6 digits.`}
        </p>
      </div>

      <div>
        <label htmlFor="new-password" className="mb-1.5 block text-[13px] font-semibold">
          New password
        </label>
        <input
          id="new-password"
          name="new-password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="min-h-12 w-full rounded-[10px] border border-line bg-white px-3.5 text-[15px] text-ink"
        />
        <p className={`mt-1.5 mb-0 text-xs ${HINT_TONES[hint.tone]}`}>{hint.text}</p>
      </div>

      <Field label="New password again" error={
        again.length > 0 && !passwordsMatch(password, again)
          ? 'These two do not match.'
          : undefined
      }>
        <TextInput
          name="confirm-password"
          type="password"
          autoComplete="new-password"
          required
          value={again}
          onChange={(event) => setAgain(event.target.value)}
          className="min-h-12 rounded-[10px] text-[15px]"
        />
      </Field>

      <Button
        type="submit"
        variant="primary"
        disabled={!ready}
        busy={busy}
        className="min-h-[50px] w-full"
      >
        {submitLabel}
      </Button>

      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="min-h-11 text-[13px] font-medium text-muted underline"
        >
          {backLabel ?? 'Back'}
        </button>
      ) : null}
    </form>
  );
}
