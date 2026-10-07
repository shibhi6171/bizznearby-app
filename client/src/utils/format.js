export const fmtDistance = (meters) => (meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`);
export const fmtRating = (r) => (Number(r) > 0 ? Number(r).toFixed(1) : 'New');
export const fmtDate = (iso) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
export const fmtDateTime = (iso) => new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
export const digits = (s) => String(s || '').replace(/\D/g, '');
export const mapsView = (lat, lng) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
export const mapsDirections = (lat, lng) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

export const CATEGORIES = [
  { slug: 'all', name: 'All Local' },
  { slug: 'dining', name: 'Dining' },
  { slug: 'retail', name: 'Retail' },
  { slug: 'services', name: 'Services' },
  { slug: 'healthcare', name: 'Healthcare' },
  { slug: 'entertainment', name: 'Entertainment' },
];
export const RADII_KM = [1, 2, 5, 10, 25];

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
export function todaysHours(hours) {
  const h = hours?.[DAYS[new Date().getDay()]];
  return h?.open && h?.close ? `${h.open} - ${h.close}` : null;
}

// Ask Cloudinary for a resized, auto-format copy of an image.
export const thumb = (url, w = 600) =>
  url && url.includes('/upload/') ? url.replace('/upload/', `/upload/f_auto,q_auto,w_${w}/`) : url;

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
