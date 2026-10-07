// deno test --allow-import --allow-env supabase/functions/api
// deno-lint-ignore-file no-explicit-any
import nodeAssert from 'node:assert/strict';
import { createApp } from './app.ts';
import { createFakeSupabase } from './fakeSupabase.ts';

const assert = (v: unknown, msg?: string) => nodeAssert.ok(v, msg);
const assertEquals = (a: unknown, b: unknown) => nodeAssert.deepStrictEqual(a, b);
const assertMatch = (a: string, re: RegExp) => nodeAssert.match(a, re);

const sb = createFakeSupabase({ rpc: () => [{ id: 'x', name: 'Test Cafe', distance_meters: 683 }] });
const app = await createApp(sb, 'test-service-key');

async function call(method: string, path: string, o: { json?: unknown; form?: FormData; token?: string } = {}) {
  const headers: Record<string, string> = {};
  if (o.token) headers.Authorization = `Bearer ${o.token}`;
  if (o.json !== undefined) headers['Content-Type'] = 'application/json';
  const res = await app.request('/api' + path, { method, headers, body: o.form ?? (o.json !== undefined ? JSON.stringify(o.json) : undefined) });
  return { status: res.status, body: await res.json().catch(() => null), res } as { status: number; body: any; res: Response };
}
const png = () => new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], 'p.png', { type: 'image/png' });
const bizForm = (extra: Record<string, string> = {}, images = 0) => {
  const f = new FormData();
  Object.entries({ name: 'Green Leaf Cafe', category: 'dining', address: '12 Lake Road', latitude: '28.61', longitude: '77.2', openingHours: JSON.stringify({ mon: { open: '09:00', close: '21:00' } }), ...extra }).forEach(([k, v]) => f.append(k, v));
  for (let i = 0; i < images; i++) f.append('images', png());
  return f;
};
const register = async (role: string, name: string, em: string, extra: object = {}) =>
  (await call('POST', `/auth/${role}/register`, { json: { name, email: em, password: 'secret1', ...extra } })).body.data.token as string;

const sellerA = await register('seller', 'Sam Seller', 'sam@x.com', { businessName: 'Green Leaf', phone: '9000000000' });
const sellerB = await register('seller', 'Bob Seller', 'bob@x.com', { businessName: 'Other', phone: '9000000001' });
const cust = await register('customer', 'Cathy', 'cathy@x.com');
let bizId = '';
let dealId = '';

Deno.test('health and cors preflight', async () => {
  const h = await call('GET', '/health');
  assertEquals([h.status, h.body.data.status], [200, 'ok']);
  const pre = await app.request('/api/auth/seller/login', { method: 'OPTIONS', headers: { Origin: 'https://site.example', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization,content-type' } });
  assert(pre.status === 204 || pre.status === 200);
  assertEquals(pre.headers.get('access-control-allow-origin'), '*');
  assertMatch(pre.headers.get('access-control-allow-headers') || '', /authorization/i);
});

Deno.test('validation messages are friendly', async () => {
  assertMatch((await call('GET', '/businesses/nearby')).body.error, /lat must be a number/);
  assertMatch((await call('POST', '/auth/customer/register', { json: { name: 'Al', email: 'a@b.com', password: '123' } })).body.error, /6 characters/);
  assertMatch((await call('POST', '/auth/seller/register', { json: { name: 'Sam', email: 's@b.com', password: '123456' } })).body.error, /businessName is required/);
  assertEquals((await call('GET', '/businesses/123')).status, 400);
  assertEquals((await call('GET', '/nope')).status, 404);
  assertEquals((await call('POST', '/auth/admin/login', { json: { email: 'a@b.com', password: 'x' } })).status, 404);
});

Deno.test('auth: login rules, wrong portal, generic errors, me, duplicates', async () => {
  const ok = await call('POST', '/auth/seller/login', { json: { email: 'SAM@x.com', password: 'secret1' } });
  assertEquals([ok.status, ok.body.data.user.role, ok.body.data.user.businessName], [200, 'seller', 'Green Leaf']);
  assert(!JSON.stringify(ok.body).includes('password_hash'));
  const wrongPw = await call('POST', '/auth/seller/login', { json: { email: 'sam@x.com', password: 'nope123' } });
  const noUser = await call('POST', '/auth/seller/login', { json: { email: 'ghost@x.com', password: 'nope123' } });
  assertEquals([wrongPw.status, noUser.status, wrongPw.body.error], [401, 401, noUser.body.error]);
  const portal = await call('POST', '/auth/customer/login', { json: { email: 'sam@x.com', password: 'secret1' } });
  assertEquals(portal.status, 403); assertMatch(portal.body.error, /registered as a seller/);
  assertEquals((await call('POST', '/auth/customer/register', { json: { name: 'Dup', email: 'cathy@x.com', password: 'secret1' } })).status, 409);
  assertEquals((await call('GET', '/auth/me', { token: cust })).body.data.role, 'customer');
  assertEquals((await call('GET', '/auth/me')).status, 401);
  assertEquals((await call('GET', '/auth/me', { token: 'garbage' })).status, 401);
});

Deno.test('role guards', async () => {
  assertEquals((await call('GET', '/businesses/mine')).status, 401);
  assertEquals((await call('GET', '/businesses/mine', { token: cust })).status, 403);
  assertEquals((await call('POST', '/businesses', { token: cust, form: bizForm() })).status, 403);
  assertEquals((await call('POST', `/businesses/${crypto.randomUUID()}/reviews`, { token: sellerA, json: { rating: 5, comment: 'Great place to visit!' } })).status, 403);
});

Deno.test('seller creates a business with photos; bad files are rejected', async () => {
  const r = await call('POST', '/businesses', { token: sellerA, form: bizForm({}, 2) });
  assertEquals(r.status, 201);
  bizId = r.body.data.id;
  assertEquals([r.body.data.images.length, r.body.data.images[0].is_cover, r.body.data.isOwner, r.body.data.category.slug], [2, true, true, 'dining']);
  assertEquals(sb.files.size, 2);
  assert(!('owner_id' in r.body.data));
  const bad = bizForm();
  bad.append('images', new File(['x'], 'a.gif', { type: 'image/gif' }));
  assertMatch((await call('POST', '/businesses', { token: sellerA, form: bad })).body.error, /JPEG, PNG and WebP/);
  const big = bizForm();
  big.append('images', new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' }));
  assertMatch((await call('POST', '/businesses', { token: sellerA, form: big })).body.error, /5 MB/);
  assertMatch((await call('POST', '/businesses', { token: sellerA, form: bizForm({ latitude: '' }) })).body.error, /latitude|location/i);
  assertMatch((await call('POST', '/businesses', { token: sellerA, form: bizForm({ category: 'nope' }) })).body.error, /Unknown category/);
  assertEquals(sb.tables.businesses.length, 1);
});

Deno.test('photos can only be changed by the owning seller', async () => {
  const imgId = sb.tables.business_images[0].id;
  const f = new FormData(); f.append('images', png());
  assertEquals((await call('POST', `/businesses/${bizId}/images`, { token: cust, form: f })).status, 403);   // customer
  const f2 = new FormData(); f2.append('images', png());
  const other = await call('POST', `/businesses/${bizId}/images`, { token: sellerB, form: f2 });              // another seller
  assertEquals(other.status, 403); assertMatch(other.body.error, /your own/);
  assertEquals((await call('DELETE', `/businesses/${bizId}/images/${imgId}`, { token: sellerB })).status, 403);
  assertEquals(sb.tables.business_images.length, 2);
  const f3 = new FormData(); f3.append('images', png());
  assertEquals((await call('POST', `/businesses/${bizId}/images`, { token: sellerA, form: f3 })).status, 201); // owner
  assertEquals(sb.tables.business_images.length, 3);
  assertEquals((await call('DELETE', `/businesses/${bizId}/images/${imgId}`, { token: sellerA })).status, 200);
  assertEquals(sb.tables.business_images.length, 2);
  assert(sb.tables.business_images.some((i) => i.is_cover), 'a new cover is chosen');
});

Deno.test('edit business: owner only, partial update', async () => {
  assertEquals((await call('PUT', `/businesses/${bizId}`, { token: sellerB, json: { name: 'Hacked' } })).status, 403);
  const r = await call('PUT', `/businesses/${bizId}`, { token: sellerA, json: { name: 'Green Leaf Cafe & Bakery', category: 'retail', phone: '' } });
  assertEquals([r.status, r.body.data.name, r.body.data.category.slug, r.body.data.phone], [200, 'Green Leaf Cafe & Bakery', 'retail', null]);
  assertEquals((await call('PUT', `/businesses/${bizId}`, { token: sellerA, json: {} })).status, 400);
});

Deno.test('deals: create, public visibility, pause, ownership, delete', async () => {
  const future = new Date(Date.now() + 864e5).toISOString();
  const mk = (o: Record<string, string> = {}) => { const f = new FormData(); Object.entries({ title: 'Weekend special', discountPercent: '20', expiresAt: future, ...o }).forEach(([k, v]) => f.append(k, v)); return f; };
  assertEquals((await call('POST', `/businesses/${bizId}/deals`, { token: sellerB, form: mk() })).status, 403);
  assertMatch((await call('POST', `/businesses/${bizId}/deals`, { token: sellerA, form: mk({ expiresAt: new Date(Date.now() - 1000).toISOString() }) })).body.error, /future/);
  assertMatch((await call('POST', `/businesses/${bizId}/deals`, { token: sellerA, form: mk({ discountPercent: '150' }) })).body.error, /1-100/);
  const withBanner = mk(); withBanner.append('banner', png());
  const r = await call('POST', `/businesses/${bizId}/deals`, { token: sellerA, form: withBanner });
  assertEquals([r.status, r.body.data.discount_percent], [201, 20]);
  dealId = r.body.data.id;
  assert(r.body.data.banner_url.startsWith('https://files.test/deals/'));
  assertEquals((await call('GET', `/businesses/${bizId}`)).body.data.deals.length, 1);
  assertEquals((await call('PATCH', `/deals/${dealId}`, { token: sellerB, json: { isActive: false } })).status, 403);
  assertEquals((await call('PATCH', `/deals/${dealId}`, { token: cust, json: { isActive: false } })).status, 403);
  assertEquals((await call('PATCH', `/deals/${dealId}`, { token: sellerA, json: { isActive: false } })).status, 200);
  assertEquals((await call('GET', `/businesses/${bizId}`)).body.data.deals.length, 0);              // customers no longer see it
  assertEquals((await call('GET', `/businesses/${bizId}`, { token: sellerA })).body.data.deals.length, 1); // owner still does
  const filesBefore = sb.files.size;
  assertEquals((await call('DELETE', `/deals/${dealId}`, { token: sellerA })).status, 200);
  assertEquals(sb.files.size, filesBefore - 1);
});

Deno.test('reviews: customers only, one each, ratings recalculated', async () => {
  assertEquals((await call('POST', `/businesses/${bizId}/reviews`, { json: { rating: 5, comment: 'Great place to visit!' } })).status, 401);
  assertMatch((await call('POST', `/businesses/${bizId}/reviews`, { token: cust, json: { rating: 5, comment: 'ok' } })).body.error, /10 characters/);
  const first = await call('POST', `/businesses/${bizId}/reviews`, { token: cust, json: { rating: 4, comment: 'Really enjoyed the visit here.' } });
  assertEquals(first.status, 201);
  const again = await call('POST', `/businesses/${bizId}/reviews`, { token: cust, json: { rating: 5, comment: 'Trying to review twice.' } });
  assertEquals([again.status, again.body.error], [409, 'You have already reviewed this shop']);
  const c2 = await register('customer', 'Dan', 'dan@x.com');
  await call('POST', `/businesses/${bizId}/reviews`, { token: c2, json: { rating: 5, comment: 'Excellent coffee and staff.' } });
  const b = (await call('GET', `/businesses/${bizId}`)).body.data;
  assertEquals([b.avg_rating, b.review_count], [4.5, 2]);
  const list = (await call('GET', `/reviews?businessId=${bizId}`)).body.data;
  assertEquals([list.reviews.length, list.summary.count, list.summary.average, list.summary.distribution.join()], [2, 2, 4.5, '1,1,0,0,0']);
  assertEquals(list.reviews[0].author.length > 0, true);
  assertEquals((await call('PUT', `/reviews/x`, { token: cust, json: {} })).status, 404);  // no edit endpoint
});

Deno.test('nearby passes parameters to the PostGIS function', async () => {
  const r = await call('GET', '/businesses/nearby?lat=28.61&lng=77.2&radiusKm=2&category=dining&q=cafe');
  assertEquals(r.status, 200);
  const args = sb.rpcCalls.at(-1).args;
  assertEquals([sb.rpcCalls.at(-1).name, args.user_lat, args.radius_meters, args.filter_category, args.search_text, args.result_limit], ['get_nearby_businesses', 28.61, 2000, 'dining', 'cafe', 24]);
  assertEquals((await call('GET', '/businesses/nearby?lat=28&lng=77&category=all')).status, 200);
  assertEquals(sb.rpcCalls.at(-1).args.filter_category, null);
});

Deno.test('leads: logged for customers and guests, not for the owner; seller lists them', async () => {
  assertEquals((await call('POST', `/businesses/${bizId}/leads`, { json: { type: 'spam' } })).status, 400);
  await call('POST', `/businesses/${bizId}/leads`, { token: cust, json: { type: 'whatsapp' } });
  await call('POST', `/businesses/${bizId}/leads`, { json: { type: 'directions' } });
  await call('POST', `/businesses/${bizId}/leads`, { token: sellerA, json: { type: 'call' } });
  assertEquals(sb.tables.leads.length, 2);
  const mine = (await call('GET', '/leads/mine', { token: sellerA })).body.data;
  assertEquals(mine.map((l: any) => l.customer).sort(), ['Cathy', 'Guest']);
  assertEquals((await call('GET', '/leads/mine', { token: sellerB })).body.data.length, 0);
  assertEquals((await call('GET', '/leads/mine', { token: cust })).status, 403);
});

Deno.test('deleting a business removes its data and stored files; only the owner can', async () => {
  assertEquals((await call('DELETE', `/businesses/${bizId}`, { token: sellerB })).status, 403);
  assertEquals((await call('DELETE', `/businesses/${bizId}`, { token: sellerA })).status, 200);
  assertEquals([sb.tables.businesses.length, sb.tables.business_images.length, sb.tables.reviews.length, sb.files.size], [0, 0, 0, 0]);
  assertEquals((await call('GET', `/businesses/${bizId}`)).status, 404);
});
