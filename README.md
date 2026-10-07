# BizzNearby - hyper-local business discovery & deals

Customers find nearby shops, deals and reviews. Sellers list their business, upload photos and publish deals.

| Layer | Tech |
|---|---|
| Client | React 18 (Vite), Tailwind CSS, React Router, TanStack Query, Leaflet (OpenStreetMap), Lucide icons |
| API | Node.js, Express (MVC + services), Zod validation, JWT + bcrypt, Multer (memory) -> Cloudinary |
| Database | Supabase PostgreSQL + PostGIS (`geography(Point,4326)`, GIST index, `ST_DWithin` / `ST_Distance`), `pg_trgm` search |

## Features
- **Two separate logins:** customer and seller (`/login/customer`, `/login/seller`). Roles are enforced by the API, not just the UI.
- **Welcome flow:** animated splash (tagline loads red, then sweeps green) -> "customer or seller?" -> matching login; guests can browse.
- **Explore:** geolocation (with a pick-your-area fallback), radius 1/2/5/10/25 km, category chips, debounced search, deals-only, sort, list/map views.
- **Business page:** photo gallery, hours, active deals, Google Maps directions, call / WhatsApp / website (each logged as a lead), reviews.
- **Seller dashboard:** create / edit / delete businesses, upload and remove photos, location picker map, create / pause / delete deals, view leads.
- **Honest reviews:** only signed-in customers, one per shop, sellers cannot review, no edit or delete. Ratings are calculated from the reviews table by a database trigger.
- **Photo protection:** only the seller who owns a business can add or remove its photos (checked on the server for every request).

## Folder structure
```
bizznearby/
├── client/                      React + Vite + Tailwind
│   ├── src/
│   │   ├── api/                 http wrapper (JWT, errors) + endpoint functions
│   │   ├── components/          layout/ ui/ business/ map/ reviews/ deals/
│   │   ├── context/             AuthContext
│   │   ├── hooks/               useGeolocation, useDebounce
│   │   ├── pages/               Welcome, Explore, BusinessDetails, Reviews, Login, Dashboard, BusinessEdit, Leads
│   │   └── utils/
│   └── tests/                   Vitest + Testing Library
├── server/                      Express API
│   ├── sql/                     01_schema.sql, 02_get_nearby_businesses.sql
│   ├── scripts/seed.js          demo data around any coordinates
│   ├── src/
│   │   ├── config/              env, supabase, cloudinary
│   │   ├── controllers/         auth, business, deal, review, lead
│   │   ├── middleware/          auth (JWT + roles), upload (multer), validate (zod), errorHandler
│   │   ├── models/              Supabase data access
│   │   ├── routes/  services/  validators/  utils/
│   │   ├── app.js  server.js
│   └── tests/                   node:test API tests (no database needed)
└── render.yaml                  one-click Render blueprint for the API
```

## Setup (local)
Prerequisites: Node 18+ (20+ recommended), a free [Supabase](https://supabase.com) project, a free [Cloudinary](https://cloudinary.com) account.

**1. Database**
1. Supabase dashboard > **SQL Editor** > run `server/sql/01_schema.sql`, then `server/sql/02_get_nearby_businesses.sql`.
2. Test: `select * from get_nearby_businesses(28.6139, 77.2090, 5000);` (returns rows after seeding).

**2. API**
```bash
cd server
npm install
cp .env.example .env        # fill in Supabase, Cloudinary and JWT values (see below)
npm run dev                 # http://localhost:5000  (health check: /health)
npm run seed -- <lat> <lng> # optional demo data around YOUR coordinates, e.g. npm run seed -- 11.0168 76.9558
```
**3. Client**
```bash
cd client
npm install
cp .env.example .env        # VITE_API_URL=http://localhost:5000/api
npm run dev                 # http://localhost:5173
```
Seed logins (password `demo123`): `seller@demo.com`, `customer@demo.com`.

### Environment variables (`server/.env`)
| Variable | Where to find it |
|---|---|
| `SUPABASE_URL` | Supabase > Project Settings > API > Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page, `service_role` key. **Backend only. Never in the client or Git.** |
| `JWT_SECRET` | Generate: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `CLOUDINARY_*` | Cloudinary dashboard > Settings > API Keys |
| `CLIENT_URL` | Allowed browser origin(s) for CORS, comma-separated |

## API overview
All responses are `{ success, data, error }`.

| Method & path | Who | Notes |
|---|---|---|
| `POST /api/auth/{customer,seller}/{register,login}` | public | returns `{ token, user }`; wrong-portal logins get a clear message |
| `GET /api/auth/me` | signed in | |
| `GET /api/categories` | public | |
| `GET /api/businesses/nearby?lat&lng&radiusKm&category&q&minRating&limit&offset` | public | PostGIS RPC, sorted by distance |
| `GET /api/businesses/:id` | public | owners also see paused deals |
| `GET /api/businesses/mine` | seller | |
| `POST /api/businesses` | seller | multipart: fields + `images[]` (max 6, 5 MB, JPEG/PNG/WebP) |
| `PUT` / `DELETE /api/businesses/:id` | owner | delete also removes Cloudinary files |
| `POST /api/businesses/:id/images`, `DELETE .../images/:imageId` | owner | the only way photos change |
| `POST /api/businesses/:id/deals`, `PATCH` / `DELETE /api/deals/:dealId` | owner | optional banner upload |
| `GET /api/reviews?businessId` | public | includes rating breakdown when `businessId` is set |
| `POST /api/businesses/:id/reviews` | customer | 409 if already reviewed |
| `POST /api/businesses/:id/leads` | anyone | `{ type: call|whatsapp|directions|website }` |
| `GET /api/leads/mine` | seller | |

## Tests
```bash
cd server && npm test     # 22 API tests: validation, auth, role guards, CORS
cd client && npm test     # 7 UI flow tests with a mocked API
```
The API tests do not touch a real database. Before going live, do one manual pass against your own Supabase project (register, create a business, upload a photo, review it).

## Deployment
1. **Database:** Supabase (above).
2. **API on Render or Railway:** push the repo to GitHub. On Render use *New > Blueprint* (reads `render.yaml`), or create a Web Service with root `server`, build `npm install`, start `npm start`. Add the env vars. Set `CLIENT_URL` to your frontend URL. The free tier sleeps when idle, so the first request can take ~30 s.
3. **Client on Vercel:** import the repo, set **Root Directory** to `client`, framework **Vite**, and add `VITE_API_URL=https://YOUR-API.onrender.com/api`. `client/vercel.json` already handles single-page-app routing. (Netlify works too: build `npm run build`, publish `dist`, add a `/* /index.html 200` redirect.)

## Option B: everything on Supabase (no Render, no Cloudinary)
The API also exists as a Supabase Edge Function in `supabase/functions/api` (same endpoints and rules as `/server`, photos stored in Supabase Storage instead of Cloudinary).
1. Run `server/sql/01_schema.sql` and `02_get_nearby_businesses.sql` (SQL Editor).
2. Create a public Storage bucket named `bizznearby` (5 MB limit, JPEG/PNG/WebP):
   `insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('bizznearby','bizznearby',true,5242880,array['image/jpeg','image/png','image/webp']);`
3. Deploy the function with **JWT verification off** (the API signs and checks its own customer/seller tokens):
   `supabase functions deploy api --no-verify-jwt`
   The service key is injected automatically, so there are no secrets to copy.
4. Build the client with `VITE_API_URL=https://<project-ref>.supabase.co/functions/v1/api` (see `client/.env.production`) and publish `client/dist` on any static host (Netlify, Vercel, Cloudflare Pages). `client/public/_redirects` handles single-page-app routing on Netlify.
5. Tests: `deno test --allow-import --allow-env supabase/functions/api` (12 tests, in-memory Supabase stand-in).

## Security notes
- Passwords are hashed with bcrypt (cost 12). Login uses one generic error for unknown email or wrong password and a constant-time dummy compare.
- RLS is enabled on every table with no policies, so the database is reachable only through the API's service-role key.
- Helmet, CORS allow-list, rate limits (stricter on `/api/auth`), body-size limit, Zod validation on every route.
- The seller's ownership (`owner_id === token user`) is checked on every mutating business, photo and deal route.
- Upload limits and MIME checks are enforced by Multer; failed requests clean up their Cloudinary uploads.

## Ideas for later
Address search / reverse geocoding (proxy Nominatim or Photon through the API), marker clustering, favourites, "open now" filter, admin approval of new listings, email verification and password reset, Google / phone sign-in, PWA install.
