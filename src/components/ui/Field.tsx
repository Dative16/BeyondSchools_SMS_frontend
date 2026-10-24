/**
 * Form controls.
 *
 * `Field` owns the label, the hint and the error, and generates the id that
 * ties them together. That is the whole reason it exists: a label that is not
 * actually associated with its input is the single commonest accessibility
 * fault in an admin app, and it is invisible until somebody tries to fill the
 * form with a screen reader or a thumb.
 *
 * An error is announced, not just coloured — and the message says what to do,
 * because "invalid" tells a registrar nothing at a desk with a parent waiting.
 */

import { createContext, useContext, useId } from 'react';
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

interface FieldContext {
  readonly id: string;
  readonly describedBy: string | undefined;
  readonly invalid: boolean;
}

const Ctx = createContext<FieldContext | null>(null);

const useField = (): FieldContext =>
  useContext(Ctx) ?? { id: '', describedBy: undefined, invalid: false };

const control =
  'w-full rounded-control border bg-white px-3 text-sm text-ink placeholder:text-faint ' +
  'disabled:bg-canvas disabled:text-muted';

export function Field({
  label,
  hint,
  error,
  required = false,
  children,
}: {
  readonly label: string;
  readonly hint?: string;
  readonly error?: string;
  readonly required?: boolean;
  readonly children: ReactNode;
}) {
  const base = useId();
  const hintId = hint ? `${base}-hint` : undefined;
  const errorId = error ? `${base}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <Ctx.Provider value={{ id: base, describedBy, invalid: Boolean(error) }}>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={base} className="text-[13px] font-medium text-ink-soft">
          {label}
          {required ? (
            <span className="ml-1 text-bad-ink" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
        {children}
        {error ? (
          <p id={errorId} role="alert" className="m-0 text-xs font-medium text-bad-ink">
            {error}
          </p>
        ) : null}
        {hint ? (
          <p id={hintId} className="m-0 text-xs text-muted">
            {hint}
          </p>
        ) : null}
      </div>
    </Ctx.Provider>
  );
}

export function TextInput({
  className = '',
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'className'> & { readonly className?: string }) {
  const { id, describedBy, invalid } = useField();
  return (
    <input
      id={id || undefined}
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      className={`${control} ${invalid ? 'border-bad-ink' : 'border-line'} ${className}`}
      {...rest}
    />
  );
}

export function Select({
  className = '',
  children,
  ...rest
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id' | 'className'> & {
  readonly className?: string;
}) {
  const { id, describedBy, invalid } = useField();
  return (
    <select
      id={id || undefined}
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      className={`${control} ${invalid ? 'border-bad-ink' : 'border-line'} ${className}`}
      {...rest}
    >
      {children}
    </select>
  );
}
