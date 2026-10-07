// BizzNearby API (Hono on Supabase Edge Functions). Same endpoints and rules as the Express server in /server.
import { Hono, type Context, type MiddlewareHandler } from 'npm:hono@4';
import { cors } from 'npm:hono/cors';
import type { ContentfulStatusCode } from 'npm:hono/utils/http-status';
import { z } from 'npm:zod@3';
import bcrypt from 'npm:bcryptjs@2';
import { jwtVerify, SignJWT } from 'npm:jose@5';

// deno-lint-ignore no-explicit-any
type Sb = any;
const BUCKET = 'bizznearby';
const MAX_FILE = 5 * 1024 * 1024;
const MAX_FILES = 6;
const MAX_IMAGES = 10;
const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

type User = { id: string; role: string; name: string };
type Env = { Variables: { user: User } };

class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

// ---------- validation (same rules as the Express server) ----------
const email = z.string().trim().toLowerCase().email('Enter a valid email address');
const password = z.string().min(6, 'Password must be at least 6 characters').max(72, 'Password is too long');
const optText = (max: number) => z.string().trim().max(max).optional();
const parseJson = (v: unknown) => { if (typeof v !== 'string' || v === '') return v; try { return JSON.parse(v); } catch { return null; } };
const uuid = z.string().uuid('Invalid id');
// A blank field must be rejected, not coerced to 0 (Number('') === 0).
const coord = (min: number, max: number, msg: string) =>
  z.preprocess((v) => (v === '' || v === null ? undefined : v), z.coerce.number({ invalid_type_error: msg, required_error: msg }).min(min, msg).max(max, msg));

const business = z.object({
  name: z.string().trim().min(2, 'Business name is too short').max(120), category: z.string().trim().min(1, 'Choose a category'),
  description: optText(1000), address: z.string().trim().min(3, 'Enter the address').max(250),
  phone: optText(30), whatsapp: optText(30),
  email: z.union([z.literal(''), z.string().trim().email('Enter a valid business email')]).optional(),
  website: z.union([z.literal(''), z.string().trim().url('Enter a full website address, e.g. https://example.com')]).optional(),
  latitude: coord(-90, 90, 'Pick a location on the map'),
  longitude: coord(-180, 180, 'Pick a location on the map'),
  openingHours: z.preprocess(parseJson, z.record(z.object({ open: z.string(), close: z.string() }).partial()).optional()),
  });

const S = {
  login: z.object({ email, password: z.string().min(1, 'Enter your password') }),
  regCustomer: z.object({ name: z.string().trim().min(2, 'Enter your name').max(80), email, password }),
  regSeller: z.object({
    name: z.string().trim().min(2, 'Enter your name').max(80), email, password,
    businessName: z.string().trim().min(2, 'Enter your business name').max(120),
    phone: z.string().trim().min(8, 'Enter a valid business phone').max(30),
  }),
  nearby: z.object({
    lat: coord(-90, 90, 'lat must be a number between -90 and 90'), lng: coord(-180, 180, 'lng must be a number between -180 and 180'),
    radiusKm: z.coerce.number().min(0.1).max(50).default(5), category: z.string().trim().optional(),
    q: z.string().trim().max(80).optional(), minRating: z.coerce.number().min(0).max(5).default(0),
    limit: z.coerce.number().int().min(1).max(50).default(24), offset: z.coerce.number().int().min(0).default(0),
  }),
  business,
  businessUpdate: business.partial(),
  deal: z.object({
    title: z.string().trim().min(2, 'Enter a deal title').max(120), description: optText(500),
    discountPercent: z.coerce.number().int().min(1, 'Discount must be 1-100').max(100, 'Discount must be 1-100'),
    startsAt: z.coerce.date().optional(), expiresAt: z.coerce.date({ invalid_type_error: 'Choose an expiry date' }),
  }),
  dealUpdate: z.object({
    title: z.string().trim().min(2).max(120).optional(), description: optText(500),
    discountPercent: z.coerce.number().int().min(1).max(100).optional(), expiresAt: z.coerce.date().optional(), isActive: z.boolean().optional(),
  }),
  review: z.object({
    rating: z.coerce.number().int().min(1, 'Choose a rating').max(5),
    comment: z.string().trim().min(10, 'Write at least 10 characters').max(400, 'Keep it under 400 characters'),
  }),
  reviews: z.object({ businessId: z.string().uuid().optional(), limit: z.coerce.number().int().min(1).max(50).default(20), offset: z.coerce.number().int().min(0).default(0) }),
  lead: z.object({ type: z.enum(['call', 'whatsapp', 'directions', 'website']) }),
};

function parse<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  const r = schema.safeParse(data);
  if (!r.success) {
    const i = r.error.issues[0];
    const field = i.path.join('.') || 'value';
    const msg = i.message === 'Required' ? `${field} is required` : /received nan/i.test(i.message) ? `${field} must be a valid number` : i.message;
    throw new HttpError(400, msg);
  }
  return r.data;
}

const nn = (v: unknown) => (v === '' || v === undefined ? null : v);
// deno-lint-ignore no-explicit-any
async function run(q: PromiseLike<{ data: any; error: unknown }>): Promise<any> {
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function createApp(sb: Sb, serviceKey: string) {
  // JWT secret derived from the service key: stable, private, no extra setup needed.
  const secret = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('bizznearby-jwt-v1:' + serviceKey)));
  const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);
  const sign = (u: { id: string; role: string; name: string }) =>
    new SignJWT({ role: u.role, name: u.name }).setProtectedHeader({ alg: 'HS256' }).setSubject(u.id).setIssuedAt().setExpirationTime('7d').sign(secret);
  const publicUser = (u: Record<string, unknown>) => ({ id: u.id, name: u.name, email: u.email, role: u.role, phone: u.phone ?? null, businessName: u.business_name ?? null });

  const app = new Hono<Env>().basePath('/api');
  app.use('*', cors({ origin: '*', allowHeaders: ['Authorization', 'Content-Type'], allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], maxAge: 600 }));

  const ok = (c: Context, data: unknown = null, status = 200) => c.json({ success: true, data, error: null }, status as ContentfulStatusCode);
  const fail = (c: Context, status: number, error: string) => c.json({ success: false, data: null, error }, status as ContentfulStatusCode);

  app.onError((err, c) => {
    if (err instanceof HttpError) return fail(c, err.status, err.message);
    // deno-lint-ignore no-explicit-any
    const code = (err as any)?.code;
    if (code === '23505') return fail(c, 409, 'This record already exists');
    if (code === '23503') return fail(c, 400, 'A related record was not found');
    if (err instanceof SyntaxError) return fail(c, 400, 'Invalid JSON body');
    console.error(err);
    return fail(c, 500, 'Something went wrong. Please try again.');
  });
  app.notFound((c) => fail(c, 404, 'Route not found'));

  // ---------- auth middleware ----------
  const identify = async (c: Context): Promise<User | 'expired' | null> => {
    const h = c.req.header('Authorization') || '';
    if (!h.startsWith('Bearer ')) return null;
    try {
      const { payload } = await jwtVerify(h.slice(7), secret);
      return { id: String(payload.sub), role: String(payload.role), name: String(payload.name) };
    } catch { return 'expired'; }
  };
  const authenticate: MiddlewareHandler<Env> = async (c, next) => {
    const u = await identify(c);
    if (!u) throw new HttpError(401, 'Authentication required');
    if (u === 'expired') throw new HttpError(401, 'Your session has expired. Please sign in again.');
    c.set('user', u);
    await next();
  };
  const optionalAuth: MiddlewareHandler<Env> = async (c, next) => { const u = await identify(c); if (u && u !== 'expired') c.set('user', u); await next(); };
  const requireRole = (...roles: string[]): MiddlewareHandler<Env> => async (c, next) => {
    if (!roles.includes(c.get('user')?.role)) throw new HttpError(403, `This action is only available to ${roles.join(' or ')} accounts`);
    await next();
  };
  const seller = [authenticate, requireRole('seller')] as const;

  // ---------- storage helpers (Supabase Storage replaces Cloudinary) ----------
  function readFiles(form: FormData, field: string, max = MAX_FILES): File[] {
    const files = form.getAll(field).filter((f): f is File => f instanceof File && f.size > 0);
    if (files.length > max) throw new HttpError(400, `Maximum ${max} images allowed`);
    for (const f of files) {
      if (!EXT[f.type]) throw new HttpError(400, 'Only JPEG, PNG and WebP images are allowed');
      if (f.size > MAX_FILE) throw new HttpError(400, 'Each image must be 5 MB or smaller');
    }
    return files;
  }
  async function upload(file: File, folder: string) {
    const path = `${folder}/${crypto.randomUUID()}.${EXT[file.type]}`;
    const { error } = await sb.storage.from(BUCKET).upload(path, await file.arrayBuffer(), { contentType: file.type, cacheControl: '31536000' });
    if (error) throw error;
    return { url: sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl as string, public_id: path };
  }
  const uploadAll = (files: File[], folder: string) => Promise.all(files.map((f) => upload(f, folder)));
  async function removeFiles(paths: (string | null | undefined)[]) {
    const p = paths.filter(Boolean) as string[];
    if (p.length) await sb.storage.from(BUCKET).remove(p).catch(() => {});
  }
  const formFields = (form: FormData) => Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === 'string'));

  // ---------- data helpers ----------
  const COLS = 'id,owner_id,name,description,address,phone,whatsapp,email,website,opening_hours,latitude,longitude,avg_rating,review_count,is_active,created_at,' +
    'categories(slug,name),business_images(id,url,is_cover,created_at),deals(id,title,description,discount_percent,banner_url,is_active,starts_at,expires_at)';
  const categoryId = async (slug: string) => (await run(sb.from('categories').select('id').eq('slug', slug).maybeSingle()))?.id ?? null;
  const basic = (id: string) => run(sb.from('businesses').select('id,owner_id,name').eq('id', id).maybeSingle());

  async function loadOwned(id: string, userId: string) {
    const b = await basic(parse(uuid, id));
    if (!b) throw new HttpError(404, 'Business not found');
    if (b.owner_id !== userId) throw new HttpError(403, 'You can only manage your own businesses');
    return b;
  }
  async function present(id: string, viewerId?: string) {
    const b = await run(sb.from('businesses').select(COLS).eq('id', id).maybeSingle());
    if (!b) throw new HttpError(404, 'Business not found');
    const isOwner = viewerId === b.owner_id;
    if (!b.is_active && !isOwner) throw new HttpError(404, 'Business not found');
    const now = Date.now();
    // deno-lint-ignore no-explicit-any
    const deals = (b.deals || []).filter((d: any) => isOwner || (d.is_active && new Date(d.starts_at).getTime() <= now && new Date(d.expires_at).getTime() >= now));
    // deno-lint-ignore no-explicit-any
    const images = [...(b.business_images || [])].sort((a: any, z: any) => Number(z.is_cover) - Number(a.is_cover));
    const { owner_id: _o, business_images: _i, categories: category, ...rest } = b;
    return { ...rest, category, images, deals, isOwner };
  }

  app.get('/health', (c) => ok(c, { status: 'ok' }));

  // ---------- auth ----------
  const roleOf = (c: { req: { param: (k: string) => string } }) => {
    const r = c.req.param('role');
    if (r !== 'customer' && r !== 'seller') throw new HttpError(404, 'Route not found');
    return r;
  };
  app.post('/auth/:role/register', async (c) => {
    const role = roleOf(c);
    const body = parse(role === 'seller' ? S.regSeller : S.regCustomer, await c.req.json().catch(() => { throw new HttpError(400, 'Invalid JSON body'); })) as Record<string, string>;
    if (await run(sb.from('users').select('id').eq('email', body.email).maybeSingle())) throw new HttpError(409, 'An account with this email already exists');
    const user = await run(sb.from('users').insert({
      name: body.name, email: body.email, role, password_hash: await bcrypt.hash(body.password, 10),
      phone: role === 'seller' ? body.phone : null, business_name: role === 'seller' ? body.businessName : null,
    }).select('*').single());
    return ok(c, { token: await sign(user), user: publicUser(user) }, 201);
  });
  app.post('/auth/:role/login', async (c) => {
    const role = roleOf(c);
    const { email: em, password: pw } = parse(S.login, await c.req.json().catch(() => { throw new HttpError(400, 'Invalid JSON body'); }));
    const user = await run(sb.from('users').select('*').eq('email', em).maybeSingle());
    const valid = await bcrypt.compare(pw, user ? user.password_hash : DUMMY_HASH); // same cost for unknown emails
    if (!user || !valid) throw new HttpError(401, 'Invalid email or password');
    if (user.role !== role) throw new HttpError(403, `This email is registered as a ${user.role}. Use the ${user.role} login.`);
    return ok(c, { token: await sign(user), user: publicUser(user) });
  });
  app.get('/auth/me', authenticate, async (c) => {
    const u = await run(sb.from('users').select('id,name,email,role,phone,business_name').eq('id', c.get('user').id).maybeSingle());
    if (!u) throw new HttpError(401, 'Account no longer exists');
    return ok(c, publicUser(u));
  });

  app.get('/categories', async (c) => ok(c, await run(sb.from('categories').select('id,slug,name').order('id'))));

  // ---------- businesses ----------
  app.get('/businesses/nearby', async (c) => {
    const q = parse(S.nearby, c.req.query());
    return ok(c, await run(sb.rpc('get_nearby_businesses', {
      user_lat: q.lat, user_lng: q.lng, radius_meters: Math.round(q.radiusKm * 1000),
      filter_category: q.category && q.category !== 'all' ? q.category : null, search_text: q.q || null,
      min_rating: q.minRating, result_limit: q.limit, result_offset: q.offset,
    })));
  });
  app.get('/businesses/mine', ...seller, async (c) => ok(c, await run(
    sb.from('businesses').select('id,name,address,avg_rating,review_count,is_active,created_at,categories(slug,name),business_images(url,is_cover),deals(id,is_active,expires_at)')
      .eq('owner_id', c.get('user').id).order('created_at', { ascending: false }))));

  app.post('/businesses', ...seller, async (c) => {
    const form = await c.req.formData();
    const files = readFiles(form, 'images');
    const b = parse(S.business, formFields(form));
    const cid = await categoryId(b.category);
    if (!cid) throw new HttpError(400, 'Unknown category');
    let uploaded: { url: string; public_id: string }[] = [];
    let created: { id: string } | null = null;
    try {
      uploaded = await uploadAll(files, 'businesses');
      created = await run(sb.from('businesses').insert({
        owner_id: c.get('user').id, category_id: cid, name: b.name, description: nn(b.description), address: b.address,
        phone: nn(b.phone), whatsapp: nn(b.whatsapp), email: nn(b.email), website: nn(b.website),
        opening_hours: b.openingHours ?? {}, latitude: b.latitude, longitude: b.longitude,
      }).select('id').single());
      if (uploaded.length) {
        await run(sb.from('business_images').insert(uploaded.map((u, i) => ({ business_id: created!.id, url: u.url, public_id: u.public_id, is_cover: i === 0 }))));
      }
    } catch (err) {
      await removeFiles(uploaded.map((u) => u.public_id));
      if (created) await sb.from('businesses').delete().eq('id', created.id);
      throw err;
    }
    return ok(c, await present(created!.id, c.get('user').id), 201);
  });

  app.get('/businesses/:id', optionalAuth, async (c) => ok(c, await present(parse(uuid, c.req.param('id')), c.get('user')?.id)));

  app.put('/businesses/:id', ...seller, async (c) => {
    const id = c.req.param('id');
    await loadOwned(id, c.get('user').id);
    const b = parse(S.businessUpdate, await c.req.json().catch(() => { throw new HttpError(400, 'Invalid JSON body'); })) as Record<string, unknown>;
    const direct: Record<string, string> = { name: 'name', description: 'description', address: 'address', phone: 'phone', whatsapp: 'whatsapp', email: 'email', website: 'website', latitude: 'latitude', longitude: 'longitude', openingHours: 'opening_hours' };
    const nullable = new Set(['description', 'phone', 'whatsapp', 'email', 'website']);
    const patch: Record<string, unknown> = {};
    for (const [k, col] of Object.entries(direct)) if (b[k] !== undefined) patch[col] = nullable.has(k) ? nn(b[k]) : b[k];
    if (b.category) {
      const cid = await categoryId(String(b.category));
      if (!cid) throw new HttpError(400, 'Unknown category');
      patch.category_id = cid;
    }
    if (!Object.keys(patch).length) throw new HttpError(400, 'Nothing to update');
    await run(sb.from('businesses').update(patch).eq('id', id).select('id').single());
    return ok(c, await present(id, c.get('user').id));
  });

  app.delete('/businesses/:id', ...seller, async (c) => {
    const id = c.req.param('id');
    await loadOwned(id, c.get('user').id);
    const imgs = await run(sb.from('business_images').select('public_id').eq('business_id', id));
    const banners = await run(sb.from('deals').select('banner_public_id').eq('business_id', id).not('banner_public_id', 'is', null));
    await run(sb.from('businesses').delete().eq('id', id));
    // deno-lint-ignore no-explicit-any
    await removeFiles([...(imgs || []).map((i: any) => i.public_id), ...(banners || []).map((d: any) => d.banner_public_id)]);
    return ok(c, { deleted: true });
  });

  // photos: only the owning seller can add or remove them
  app.post('/businesses/:id/images', ...seller, async (c) => {
    const id = c.req.param('id');
    await loadOwned(id, c.get('user').id);
    const files = readFiles(await c.req.formData(), 'images');
    if (!files.length) throw new HttpError(400, 'Choose at least one image');
    const existing = await run(sb.from('business_images').select('id').eq('business_id', id));
    if (existing.length + files.length > MAX_IMAGES) throw new HttpError(400, `A business can have at most ${MAX_IMAGES} photos`);
    const uploaded = await uploadAll(files, 'businesses');
    try {
      return ok(c, await run(sb.from('business_images').insert(
        uploaded.map((u, i) => ({ business_id: id, url: u.url, public_id: u.public_id, is_cover: existing.length === 0 && i === 0 }))).select('id,url,is_cover')), 201);
    } catch (err) { await removeFiles(uploaded.map((u) => u.public_id)); throw err; }
  });
  app.delete('/businesses/:id/images/:imageId', ...seller, async (c) => {
    const id = c.req.param('id');
    await loadOwned(id, c.get('user').id);
    const img = await run(sb.from('business_images').select('id,public_id,is_cover').eq('id', parse(uuid, c.req.param('imageId'))).eq('business_id', id).maybeSingle());
    if (!img) throw new HttpError(404, 'Image not found');
    await run(sb.from('business_images').delete().eq('id', img.id));
    await removeFiles([img.public_id]);
    if (img.is_cover) {
      const rest = await run(sb.from('business_images').select('id').eq('business_id', id));
      if (rest.length) await run(sb.from('business_images').update({ is_cover: true }).eq('id', rest[0].id));
    }
    return ok(c, { deleted: true });
  });

  // ---------- deals ----------
  app.post('/businesses/:id/deals', ...seller, async (c) => {
    const id = c.req.param('id');
    const biz = await basic(parse(uuid, id));
    if (!biz) throw new HttpError(404, 'Business not found');
    if (biz.owner_id !== c.get('user').id) throw new HttpError(403, 'You can only add deals to your own businesses');
    const form = await c.req.formData();
    const banners = readFiles(form, 'banner', 1);
    const b = parse(S.deal, formFields(form));
    const startsAt = b.startsAt || new Date();
    if (b.expiresAt <= new Date()) throw new HttpError(400, 'The expiry must be in the future');
    if (b.expiresAt <= startsAt) throw new HttpError(400, 'The expiry must be after the start');
    const banner = banners[0] ? await upload(banners[0], 'deals') : null;
    try {
      return ok(c, await run(sb.from('deals').insert({
        business_id: id, title: b.title, description: nn(b.description), discount_percent: b.discountPercent,
        starts_at: startsAt, expires_at: b.expiresAt, banner_url: banner?.url ?? null, banner_public_id: banner?.public_id ?? null,
      }).select('*').single()), 201);
    } catch (err) { await removeFiles([banner?.public_id]); throw err; }
  });
  const loadOwnedDeal = async (dealId: string, userId: string) => {
    const deal = await run(sb.from('deals').select('id,business_id,banner_public_id,starts_at,expires_at,businesses!inner(owner_id)').eq('id', parse(uuid, dealId)).maybeSingle());
    if (!deal) throw new HttpError(404, 'Deal not found');
    if (deal.businesses.owner_id !== userId) throw new HttpError(403, 'You can only manage your own deals');
    return deal;
  };
  app.patch('/deals/:dealId', ...seller, async (c) => {
    const deal = await loadOwnedDeal(c.req.param('dealId'), c.get('user').id);
    const b = parse(S.dealUpdate, await c.req.json().catch(() => { throw new HttpError(400, 'Invalid JSON body'); }));
    const patch: Record<string, unknown> = {};
    if (b.title !== undefined) patch.title = b.title;
    if (b.description !== undefined) patch.description = nn(b.description);
    if (b.discountPercent !== undefined) patch.discount_percent = b.discountPercent;
    if (b.isActive !== undefined) patch.is_active = b.isActive;
    if (b.expiresAt !== undefined) {
      if (b.expiresAt <= new Date(deal.starts_at)) throw new HttpError(400, 'The expiry must be after the start');
      patch.expires_at = b.expiresAt;
    }
    if (!Object.keys(patch).length) throw new HttpError(400, 'Nothing to update');
    return ok(c, await run(sb.from('deals').update(patch).eq('id', deal.id).select('*').single()));
  });
  app.delete('/deals/:dealId', ...seller, async (c) => {
    const deal = await loadOwnedDeal(c.req.param('dealId'), c.get('user').id);
    await run(sb.from('deals').delete().eq('id', deal.id));
    await removeFiles([deal.banner_public_id]);
    return ok(c, { deleted: true });
  });

  // ---------- reviews (customers only, one per shop, no edit or delete) ----------
  app.get('/reviews', async (c) => {
    const q = parse(S.reviews, c.req.query());
    let query = sb.from('reviews').select('id,rating,comment,created_at,business_id,users(name),businesses(name)')
      .order('created_at', { ascending: false }).range(q.offset, q.offset + q.limit - 1);
    if (q.businessId) query = query.eq('business_id', q.businessId);
    const rows = await run(query);
    let summary = null;
    if (q.businessId) {
      const all = await run(sb.from('reviews').select('rating').eq('business_id', q.businessId));
      const count = all.length;
      summary = {
        count, average: count ? Math.round((all.reduce((s: number, r: { rating: number }) => s + r.rating, 0) / count) * 10) / 10 : 0,
        distribution: [5, 4, 3, 2, 1].map((star) => all.filter((r: { rating: number }) => r.rating === star).length),
      };
    }
    // deno-lint-ignore no-explicit-any
    const reviews = rows.map((r: any) => ({ id: r.id, rating: r.rating, comment: r.comment, createdAt: r.created_at, businessId: r.business_id, businessName: r.businesses?.name ?? null, author: r.users?.name ?? 'Customer' }));
    return ok(c, { reviews, summary });
  });
  app.post('/businesses/:id/reviews', authenticate, requireRole('customer'), async (c) => {
    const id = parse(uuid, c.req.param('id'));
    const body = parse(S.review, await c.req.json().catch(() => { throw new HttpError(400, 'Invalid JSON body'); }));
    if (!(await basic(id))) throw new HttpError(404, 'Business not found');
    const { data, error } = await sb.from('reviews').insert({ business_id: id, user_id: c.get('user').id, rating: body.rating, comment: body.comment }).select('id,rating,comment,created_at').single();
    if (error) { if (error.code === '23505') throw new HttpError(409, 'You have already reviewed this shop'); throw error; }
    return ok(c, data, 201);
  });

  // ---------- leads ----------
  app.post('/businesses/:id/leads', optionalAuth, async (c) => {
    const biz = await basic(parse(uuid, c.req.param('id')));
    if (!biz) throw new HttpError(404, 'Business not found');
    const body = parse(S.lead, await c.req.json().catch(() => { throw new HttpError(400, 'Invalid JSON body'); }));
    const u = c.get('user');
    if (u?.id !== biz.owner_id) await run(sb.from('leads').insert({ business_id: biz.id, user_id: u?.id ?? null, type: body.type }));
    return ok(c, null, 201);
  });
  app.get('/leads/mine', ...seller, async (c) => {
    const rows = await run(sb.from('leads').select('id,type,created_at,businesses!inner(id,name,owner_id),users(name)')
      .eq('businesses.owner_id', c.get('user').id).order('created_at', { ascending: false }).limit(100));
    // deno-lint-ignore no-explicit-any
    return ok(c, rows.map((l: any) => ({ id: l.id, type: l.type, createdAt: l.created_at, businessId: l.businesses.id, businessName: l.businesses.name, customer: l.users?.name ?? 'Guest' })));
  });

  return app;
}
