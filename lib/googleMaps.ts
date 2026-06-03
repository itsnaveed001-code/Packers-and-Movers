/* eslint-disable @typescript-eslint/no-explicit-any */
// Single-load Google Maps JS API loader (Places library).
// Returns the global `google` namespace once ready. Rejects on the server
// or when no API key is configured, so callers can fall back gracefully.

let loadPromise: Promise<any> | null = null;

export function getMapsApiKey(): string | undefined {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || undefined;
}

export function loadGoogleMaps(): Promise<any> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('no_window'));
  }
  const key = getMapsApiKey();
  if (!key) return Promise.reject(new Error('missing_api_key'));

  const w = window as any;
  if (w.google?.maps?.places) return Promise.resolve(w.google);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const finish = () => {
      if (w.google?.maps?.places) resolve(w.google);
      else reject(new Error('maps_unavailable'));
    };
    const existing = document.getElementById('gmaps-js') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', finish);
      existing.addEventListener('error', () => reject(new Error('maps_load_error')));
      return;
    }
    const script = document.createElement('script');
    script.id = 'gmaps-js';
    script.async = true;
    script.defer = true;
    script.src =
      'https://maps.googleapis.com/maps/api/js' +
      `?key=${encodeURIComponent(key)}&libraries=places&loading=async`;
    script.addEventListener('load', finish);
    script.addEventListener('error', () => reject(new Error('maps_load_error')));
    document.head.appendChild(script);
  });
  return loadPromise;
}
