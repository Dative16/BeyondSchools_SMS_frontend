/**
 * A modal, built on the browser's own `<dialog>`.
 *
 * Using the element rather than a div means the focus trap, the Escape key,
 * the inert background and the top layer are the browser's problem and not
 * ours — four things that hand-rolled modals get wrong, and that a registrar
 * only notices when they are tabbing through a form with a parent waiting.
 *
 * Closing is always possible. A dialog that can only be dismissed by
 * completing it is a dialog somebody will reload the page to escape, losing
 * whatever else they had open.
 */

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

import { CloseIcon } from '@/components/icons';

export function Dialog({
  open,
  onClose,
  title,
  note,
  children,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly note?: string;
  readonly children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => {
        // The backdrop is the dialog element itself; a click on a child does
        // not reach here with the dialog as its target.
        if (event.target === ref.current) onClose();
      }}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-card border border-line bg-white p-0 backdrop:bg-ink/40"
    >
      <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <h2 className="m-0 font-display text-base font-semibold">{title}</h2>
          {note ? <p className="mt-1 mb-0 text-[12.5px] text-muted">{note}</p> : null}
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="grid h-11 w-11 flex-none place-items-center rounded-control text-ink-dim hover:bg-line-soft"
        >
          <CloseIcon />
        </button>
      </div>
      <div className="px-5 py-4">{children}</div>
    </dialog>
  );
}
