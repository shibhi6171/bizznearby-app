// Runs without a database: checks validation, auth, role guards, CORS and error shapes.
import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

Object.assign(process.env, {
  SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'x', JWT_SECRET: 'test-secret',
  CLOUDINARY_CLOUD_NAME: 'c', CLOUDINARY_API_KEY: 'k', CLOUDINARY_API_SECRET: 's',
});
const { default: app } = await import('../src/app.js');
const server = app.listen(0);
const base = `http://127.0.0.1:${server.address().port}`;
test.after(() => server.close());

const ID = '11111111-1111-4111-8111-111111111111';
const as = (role) => ({ Authorization: 'Bearer ' + jwt.sign({ id: ID, role, name: 'T' }, 'test-secret') });
async function call(method, path, body, headers = {}) {
  const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, json: await res.json() };
}

const cases = [
  ['health', 'GET', '/health', null, {}, 200],
  ['unknown route', 'GET', '/nope', null, {}, 404],
  ['nearby needs lat/lng', 'GET', '/api/businesses/nearby', null, {}, 400, /lat/],
  ['nearby radius too large', 'GET', '/api/businesses/nearby?lat=10&lng=77&radiusKm=500', null, {}, 400],
  ['register: short password', 'POST', '/api/auth/customer/register', { name: 'Alice', email: 'a@b.com', password: '123' }, {}, 400, /6 characters/],
  ['register: bad email', 'POST', '/api/auth/customer/register', { name: 'Alice', email: 'nope', password: '123456' }, {}, 400, /email/i],
  ['seller register needs business name', 'POST', '/api/auth/seller/register', { name: 'Sam', email: 's@b.com', password: '123456' }, {}, 400, /businessName/],
  ['login needs password', 'POST', '/api/auth/seller/login', { email: 's@b.com' }, {}, 400],
  ['me needs token', 'GET', '/api/auth/me', null, {}, 401],
  ['me rejects bad token', 'GET', '/api/auth/me', null, { Authorization: 'Bearer abc' }, 401],
  ['seller list: no token', 'GET', '/api/businesses/mine', null, {}, 401],
  ['seller list: customer blocked', 'GET', '/api/businesses/mine', null, as('customer'), 403],
  ['customer cannot upload photos', 'POST', `/api/businesses/${ID}/images`, null, as('customer'), 403],
  ['customer cannot create deals', 'POST', `/api/businesses/${ID}/deals`, null, as('customer'), 403],
  ['customer cannot edit deals', 'PATCH', `/api/deals/${ID}`, { isActive: false }, as('customer'), 403],
  ['seller cannot review', 'POST', `/api/businesses/${ID}/reviews`, { rating: 5, comment: 'Great place to visit!' }, as('seller'), 403],
  ['review too short', 'POST', `/api/businesses/${ID}/reviews`, { rating: 5, comment: 'ok' }, as('customer'), 400, /10 characters/],
  ['review needs login', 'POST', `/api/businesses/${ID}/reviews`, { rating: 5, comment: 'Great place to visit!' }, {}, 401],
  ['lead type validated', 'POST', `/api/businesses/${ID}/leads`, { type: 'spam' }, {}, 400],
  ['business needs a real location', 'POST', '/api/businesses', { name: 'X Cafe', category: 'dining', address: '12 Lake Road', latitude: '', longitude: '' }, as('seller'), 400, /location/],
  ['nearby rejects blank coordinates', 'GET', '/api/businesses/nearby?lat=&lng=', null, {}, 400, /lat/],
  ['bad id param', 'GET', '/api/businesses/123', null, {}, 400],
];
for (const [name, method, path, body, headers, status, msg] of cases) {
  test(name, async () => {
    const r = await call(method, path, body, headers);
    assert.equal(r.status, status);
    if (status >= 400) { assert.equal(r.json.success, false); if (msg) assert.match(r.json.error, msg); }
  });
}

test('invalid JSON body is a clean 400', async () => {
  const res = await fetch(base + '/api/auth/seller/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad' });
  assert.equal(res.status, 400);
});
test('unknown browser origin is blocked by CORS', async () => {
  const res = await fetch(base + '/health', { headers: { Origin: 'http://evil.example' } });
  assert.equal(res.status, 403);
});
