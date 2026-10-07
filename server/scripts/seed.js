// Demo data around a point. Usage: npm run seed -- <lat> <lng>
// Example: npm run seed -- 28.6139 77.2090
import bcrypt from 'bcryptjs';
import { supabase } from '../src/config/supabase.js';
import { run } from '../src/utils/db.js';

const lat0 = Number(process.argv[2] ?? 28.6139);
const lng0 = Number(process.argv[3] ?? 77.209);
if (Number.isNaN(lat0) || Number.isNaN(lng0)) { console.error('Usage: npm run seed -- <lat> <lng>'); process.exit(1); }
const toLat = (dyKm) => lat0 + dyKm / 111.32;
const toLng = (dxKm) => lng0 + dxKm / (111.32 * Math.cos((lat0 * Math.PI) / 180));
const PASSWORD = 'demo123';

async function ensureUser(u) {
  const found = await run(supabase.from('users').select('id').eq('email', u.email).maybeSingle());
  if (found) return found.id;
  const row = await run(supabase.from('users').insert({ ...u, password_hash: await bcrypt.hash(PASSWORD, 12) }).select('id').single());
  return row.id;
}

const seller = await ensureUser({ name: 'Demo Seller', email: 'seller@demo.com', role: 'seller', phone: '+91 90000 00000', business_name: 'Demo Store' });
const customers = [];
for (const [name, email] of [['Asha K.', 'asha@demo.com'], ['Ravi M.', 'ravi@demo.com'], ['Meena S.', 'meena@demo.com']]) {
  customers.push(await ensureUser({ name, email, role: 'customer' }));
}
await ensureUser({ name: 'Demo Customer', email: 'customer@demo.com', role: 'customer' });

const cats = Object.fromEntries((await run(supabase.from('categories').select('id,slug'))).map((c) => [c.slug, c.id]));
const shops = [
  ['Green Leaf Cafe', 'dining', .4, .6, '12 Lake Road', 20], ['Spice Route Kitchen', 'dining', -1.2, .5, '44 Market Street', 0],
  ['Urban Threads', 'retail', 1.6, -.8, '8 Mall Avenue', 35], ['Fresh Basket Grocers', 'retail', -.6, -1.1, '3 Temple Lane', 10],
  ['QuickFix Mobile Repair', 'services', 2.4, 1.3, '27 Station Road', 0], ['Glow Salon & Spa', 'services', -2.1, -1.7, '61 Garden Street', 25],
  ['CarePlus Clinic', 'healthcare', 1.1, 2.2, '5 Hospital Road', 0], ['Smile Dental', 'healthcare', -3.4, 2.6, '19 Park Avenue', 15],
  ['Starlight Cinemas', 'entertainment', 3.9, -2.8, '1 Bypass Road', 30], ['PlayZone Arcade', 'entertainment', -4.6, -3.3, '72 Ring Road', 40],
];
const comments = ['Friendly staff and great service.', 'Good value, would visit again.', 'Clean, well organised and easy to find.', 'Quick service and fair prices.'];

for (const [i, [name, cat, dx, dy, address, discount]] of shops.entries()) {
  const existing = await run(supabase.from('businesses').select('id').eq('owner_id', seller).eq('name', name).maybeSingle());
  if (existing) continue;
  const biz = await run(supabase.from('businesses').insert({
    owner_id: seller, category_id: cats[cat], name, address, latitude: toLat(dy), longitude: toLng(dx),
    description: `${name} - a favourite local spot.`, phone: '+91 90000 1000' + i,
    opening_hours: Object.fromEntries(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((d) => [d, { open: '09:00', close: '21:00' }])),
  }).select('id').single());
  if (discount) {
    await run(supabase.from('deals').insert({ business_id: biz.id, title: `${discount}% off this week`, discount_percent: discount, expires_at: new Date(Date.now() + 14 * 864e5).toISOString() }));
  }
  for (const [j, userId] of customers.entries()) {
    await run(supabase.from('reviews').insert({ business_id: biz.id, user_id: userId, rating: 4 + ((i + j) % 2), comment: comments[(i + j) % comments.length] }));
  }
}
console.log(`Seeded around (${lat0}, ${lng0}). Demo logins: seller@demo.com / customer@demo.com, password "${PASSWORD}".`);
