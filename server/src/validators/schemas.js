import { z } from 'zod';

const email = z.string().trim().toLowerCase().email('Enter a valid email address');
const password = z.string().min(6, 'Password must be at least 6 characters').max(72, 'Password is too long');
// A blank field must be rejected, not coerced to 0 (Number('') === 0).
const coord = (min, max, msg) =>
  z.preprocess((v) => (v === '' || v === null ? undefined : v), z.coerce.number({ invalid_type_error: msg, required_error: msg }).min(min, msg).max(max, msg));
const optText = (max) => z.string().trim().max(max).optional();
const parseJson = (v) => {
  if (typeof v !== 'string' || v === '') return v;
  try { return JSON.parse(v); } catch { return null; }
};

export const idParam = z.object({ id: z.string().uuid('Invalid id') });
export const dealIdParam = z.object({ dealId: z.string().uuid('Invalid id') });
export const imageParams = z.object({ id: z.string().uuid('Invalid id'), imageId: z.string().uuid('Invalid id') });

// ---------- auth ----------
export const loginBody = z.object({ email, password: z.string().min(1, 'Enter your password') });
export const registerCustomerBody = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(80),
  email,
  password,
});
export const registerSellerBody = registerCustomerBody.extend({
  businessName: z.string().trim().min(2, 'Enter your business name').max(120),
  phone: z.string().trim().min(8, 'Enter a valid business phone').max(30),
});

// ---------- businesses ----------
export const nearbyQuery = z.object({
  lat: coord(-90, 90, 'lat must be a number between -90 and 90'),
  lng: coord(-180, 180, 'lng must be a number between -180 and 180'),
  radiusKm: z.coerce.number().min(0.1).max(50).default(5),
  category: z.string().trim().optional(),
  q: z.string().trim().max(80).optional(),
  minRating: z.coerce.number().min(0).max(5).default(0),
  limit: z.coerce.number().int().min(1).max(50).default(24),
  offset: z.coerce.number().int().min(0).default(0),
});

const hours = z.preprocess(
  parseJson,
  z.record(z.object({ open: z.string(), close: z.string() }).partial()).optional()
);

export const businessBody = z.object({
  name: z.string().trim().min(2, 'Business name is too short').max(120),
  category: z.string().trim().min(1, 'Choose a category'),
  description: optText(1000),
  address: z.string().trim().min(3, 'Enter the address').max(250),
  phone: optText(30),
  whatsapp: optText(30),
  email: z.union([z.literal(''), z.string().trim().email('Enter a valid business email')]).optional(),
  website: z.union([z.literal(''), z.string().trim().url('Enter a full website address, e.g. https://example.com')]).optional(),
  latitude: coord(-90, 90, 'Pick a location on the map'),
  longitude: coord(-180, 180, 'Pick a location on the map'),
  openingHours: hours,
});
export const businessUpdateBody = businessBody.partial();

// ---------- deals ----------
export const dealBody = z.object({
  title: z.string().trim().min(2, 'Enter a deal title').max(120),
  description: optText(500),
  discountPercent: z.coerce.number().int().min(1, 'Discount must be 1-100').max(100, 'Discount must be 1-100'),
  startsAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date({ invalid_type_error: 'Choose an expiry date' }),
});
export const dealUpdateBody = z.object({
  title: z.string().trim().min(2).max(120).optional(),
  description: optText(500),
  discountPercent: z.coerce.number().int().min(1).max(100).optional(),
  expiresAt: z.coerce.date().optional(),
  isActive: z.boolean().optional(),
});

// ---------- reviews & leads ----------
export const reviewBody = z.object({
  rating: z.coerce.number().int().min(1, 'Choose a rating').max(5),
  comment: z.string().trim().min(10, 'Write at least 10 characters').max(400, 'Keep it under 400 characters'),
});
export const reviewsQuery = z.object({
  businessId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
export const leadBody = z.object({ type: z.enum(['call', 'whatsapp', 'directions', 'website']) });
