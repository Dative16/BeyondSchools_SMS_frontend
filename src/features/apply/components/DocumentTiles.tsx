/**
 * The document tiles.
 *
 * A tile per document the school asks for at application time, each one either
 * done or a camera button. The camera matters more than it looks: `capture`
 * opens the phone's camera straight onto the certificate, which is the
 * difference between a parent attaching one now and promising to bring it on
 * Monday.
 *
 * Nothing here is required. The form submits without any of them, and the
 * school chases what is missing at the desk — but the ones that do arrive
 * arrive at the only moment anybody is motivated to send them.
 */

import { useRef, useState } from 'react';

import type { ApplyOptions, ApplyState } from '@/api/queries/apply';
import { useAttachDocument } from '@/api/queries/apply';
import { Notice } from '@/components/ui';

export function DocumentTiles({
  state,
  options,
}: {
  readonly state: ApplyState;
  readonly options: ApplyOptions | undefined;
}) {
  const asked = options?.documents ?? [];
  const [error, setError] = useState<string | null>(null);

  if (asked.length === 0) return null;

  const held = new Set(state.documents.map((document) => document.kind));

  return (
    <div>
      <p className="m-0 mb-2 text-[13px] font-semibold">Documents</p>
      {error ? (
        <div className="mb-2">
          <Notice>{error}</Notice>
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-2.5">
        {asked.map((document) => (
          <Tile
            key={document.kind}
            kind={document.kind}
            label={document.label}
            required={document.required}
            done={held.has(document.kind)}
            onError={setError}
          />
        ))}
      </div>
      <p className="mt-2 mb-0 text-[11.5px] leading-relaxed text-muted">
        A clear photograph is enough. You can also bring the originals to the school.
      </p>
    </div>
  );
}

function Tile({
  kind,
  label,
  required,
  done,
  onError,
}: {
  readonly kind: string;
  readonly label: string;
  readonly required: boolean;
  readonly done: boolean;
  readonly onError: (message: string | null) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const attach = useAttachDocument();

  function choose(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    onError(null);
    attach.mutate(
      { kind, file },
      {
        onError: () =>
          onError(
            `${label} did not upload. It may be too large — a photograph under 8 MB works best.`,
          ),
      },
    );
    // Let the same file be chosen again after a failure.
    event.target.value = '';
  }

  if (done) {
    return (
      <div className="rounded-[10px] border border-ok-bg bg-brand-soft p-[12px_11px]">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" className="mb-1.5">
          <circle cx="9" cy="9" r="7.3" stroke="#166534" strokeWidth="1.5" />
          <path
            d="M5.8 9.2l2.2 2.2 4.2-4.6"
            stroke="#166534"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <p className="m-0 mb-0.5 text-[12.5px] font-semibold text-brand-ink">{label}</p>
        <p className="m-0 text-[11.5px] text-ok-ink">Photo added</p>
      </div>
    );
  }

  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
        capture="environment"
        onChange={choose}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={attach.isPending}
        className="min-h-11 rounded-[10px] border border-dashed border-line bg-white p-[12px_11px] text-left disabled:opacity-60"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" className="mb-1.5 block">
          <rect x="2.5" y="4.5" width="13" height="10" rx="2" stroke="#64748B" strokeWidth="1.5" />
          <circle cx="9" cy="9.5" r="2.6" stroke="#64748B" strokeWidth="1.5" />
        </svg>
        <span className="mb-0.5 block text-[12.5px] font-semibold text-ink">{label}</span>
        <span className="block text-[11.5px] text-muted">
          {attach.isPending ? 'Uploading…' : required ? 'Add a photo' : 'Optional'}
        </span>
      </button>
    </>
  );
}
