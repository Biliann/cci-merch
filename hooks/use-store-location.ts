'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { resolveRegion, type Region } from '../lib/region-location';

export type LocationStatus = 'idle' | 'locating' | 'located' | 'denied' | 'timeout' | 'unavailable' | 'outside' | 'unsupported' | 'insecure';

/** Coordinates are used on this device only. A cancelled lookup cannot change the store. */
export function useStoreLocation(onLocated: (region: Region) => void) {
  const [status, setStatus] = useState<LocationStatus>('idle');
  const onLocatedRef = useRef(onLocated);
  onLocatedRef.current = onLocated;
  const requestId = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancel = useCallback(() => {
    requestId.current += 1;
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    setStatus(current => current === 'locating' ? 'idle' : current);
  }, []);

  const locate = useCallback(() => {
    cancel();
    if (!window.isSecureContext) { setStatus('insecure'); return; }
    if (!navigator.geolocation) { setStatus('unsupported'); return; }

    const id = requestId.current;
    setStatus('locating');
    const finish = (next: LocationStatus, region?: Region) => {
      if (id !== requestId.current) return;
      requestId.current += 1;
      if (timer.current !== null) clearTimeout(timer.current);
      timer.current = null;
      setStatus(next);
      if (region) onLocatedRef.current(region);
    };
    // The native timeout can exclude time spent waiting for permission.
    timer.current = setTimeout(() => finish('timeout'), 15_000);
    try {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          const region = resolveRegion(coords.latitude, coords.longitude);
          finish(region ? 'located' : 'outside', region ?? undefined);
        },
        error => finish(error.code === 1 ? 'denied' : error.code === 3 ? 'timeout' : 'unavailable'),
        { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
      );
    } catch {
      finish('unavailable');
    }
  }, [cancel]);

  const reset = useCallback(() => { cancel(); setStatus('idle'); }, [cancel]);
  useEffect(() => cancel, [cancel]);
  return { status, locate, cancel, reset };
}
