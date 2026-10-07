import { useCallback, useEffect, useState } from 'react';

// status: 'idle' | 'loading' | 'granted' | 'denied' | 'unsupported'
export function useGeolocation({ auto = true } = {}) {
  const [coords, setCoords] = useState(null);
  const [status, setStatus] = useState('idle');

  const request = useCallback(() => {
    if (!navigator.geolocation) return setStatus('unsupported');
    setStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (p) => { setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }); setStatus('granted'); },
      () => setStatus('denied'),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 }
    );
  }, []);

  useEffect(() => { if (auto) request(); }, [auto, request]);
  return { coords, status, request };
}
