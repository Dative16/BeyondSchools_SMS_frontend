/**
 * "A new version is ready."
 *
 * A PWA that updates itself silently is a PWA where somebody is looking at
 * last week's code and cannot be told to reload, because they have no idea
 * there is anything to reload. Worse, half the app can be new and half old if
 * a chunk is fetched after a deploy.
 *
 * So the service worker waits, and the person decides — except that the prompt
 * never appears mid-form, because reloading a half-entered admission is a
 * worse outcome than running yesterday's build for another ten minutes.
 */

import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  const [dismissed, setDismissed] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  // Hold the prompt back while anything is being typed into.
  useEffect(() => {
    if (!needRefresh) return;
    const check = () => {
      const active = document.activeElement;
      setFormOpen(
        active instanceof HTMLInputElement ||
          active instanceof HTMLTextAreaElement ||
          active instanceof HTMLSelectElement,
      );
    };
    check();
    const id = window.setInterval(check, 2_000);
    return () => window.clearInterval(id);
  }, [needRefresh]);

  if (!needRefresh || dismissed || formOpen) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md flex-wrap items-center gap-3 rounded-card border border-line bg-white px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.12)]"
    >
      <p className="m-0 flex-1 text-[13px] text-ink">A newer version of the app is ready.</p>
      <button
        type="button"
        onClick={() => void updateServiceWorker(true)}
        className="rounded-control bg-brand-strong px-3.5 text-[13px] font-semibold text-white hover:bg-brand-ink"
      >
        Reload
      </button>
      <button
        type="button"
        onClick={() => {
          setDismissed(true);
          setNeedRefresh(false);
        }}
        className="rounded-control px-2.5 text-[13px] font-medium text-muted hover:bg-line-soft"
      >
        Later
      </button>
    </div>
  );
}
