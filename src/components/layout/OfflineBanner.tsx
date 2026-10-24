/**
 * Says so when the connection has gone.
 *
 * This is the honest half of being a PWA. The app shell is cached, so it will
 * open with no network at all — and an app that opens, shows a dashboard, and
 * says nothing is an app that has just told a bursar that fees collection is
 * 38.4M when the real figure moved an hour ago. The shell loads; the numbers
 * do not; the banner is what explains the difference.
 *
 * `navigator.onLine` only ever proves the negative reliably: false means there
 * is definitely no network, true means there is an interface up, which is not
 * the same as the API being reachable. That is enough for this, and a probe
 * request every few seconds on a metered Tanzanian connection is not a cost
 * worth paying for a nicer banner.
 */

import { useEffect, useState } from 'react';

import { OfflineIcon } from '@/components/icons';

export function OfflineBanner() {
  const [offline, setOffline] = useState(() => !navigator.onLine);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  if (!offline) return null;

  return (
    <p
      role="status"
      className="m-0 flex items-center justify-center gap-2 bg-warn-bg px-4 py-2 text-center text-[13px] font-medium text-warn-ink"
    >
      <OfflineIcon width={16} height={16} />
      You are offline. What you can see may be out of date, and nothing will save
      until the connection is back.
    </p>
  );
}
