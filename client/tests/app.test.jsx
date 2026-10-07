import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '../src/App.jsx';
import { AuthProvider } from '../src/context/AuthContext.jsx';

const ok = (data) => ({ ok: true, status: 200, json: async () => ({ success: true, data, error: null }) });
const bad = (status, error) => ({ ok: false, status, json: async () => ({ success: false, data: null, error }) });
let routes;
const mount = (path) => {
  global.fetch = vi.fn(async (url, opts = {}) => {
    const u = new URL(url); const key = `${opts.method || 'GET'} ${u.pathname.replace('/api', '')}`;
    const h = routes[key] || routes[key.split('?')[0]];
    if (!h) throw new Error('unmocked ' + key);
    return typeof h === 'function' ? h(opts, u) : h;
  });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<MemoryRouter initialEntries={[path]}><QueryClientProvider client={qc}><AuthProvider><App /></AuthProvider></QueryClientProvider></MemoryRouter>);
};
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); routes = {}; });

const biz = (n, extra = {}) => ({ id: n, name: `Shop ${n}`, category_name: 'Dining', category_slug: 'dining', latitude: 11, longitude: 77, avg_rating: 4.5, review_count: 2, cover_image_url: null, distance_meters: 400 * n, active_deals_count: n === 1 ? 1 : 0, max_discount: n === 1 ? 20 : null, ...extra });

test('first visit goes to the welcome splash, then role choice, then the matching login', async () => {
  const user = userEvent.setup();
  mount('/explore');
  expect(await screen.findByText('Every business around the corner')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Skip' }));
  expect(await screen.findByText('Choose your experience to get started')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /Continue as Seller/ }));
  expect(await screen.findByRole('heading', { name: 'Seller login' })).toBeInTheDocument();
});

test('guest can continue to Explore, sees nearby shops with deal badge', async () => {
  const user = userEvent.setup();
  global.navigator.geolocation = { getCurrentPosition: (ok) => ok({ coords: { latitude: 11, longitude: 77 } }) };
  routes['GET /businesses/nearby'] = (o, u) => { expect(u.searchParams.get('lat')).toBe('11'); expect(u.searchParams.get('radiusKm')).toBe('2'); return ok([biz(1), biz(2)]); };
  mount('/welcome');
  await user.click(await screen.findByRole('button', { name: 'Skip' }));
  await user.click(await screen.findByRole('button', { name: 'Continue as Guest' }));
  expect(await screen.findByText('Shop 1')).toBeInTheDocument();
  expect(screen.getByText('20% off')).toBeInTheDocument();
  expect(screen.getByText('2 listings')).toBeInTheDocument();
  await user.click(screen.getByLabelText('Deals only'));
  expect(await screen.findByText('1 listing')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /Map/ }));
  expect(screen.getByTestId('map')).toBeInTheDocument();
});

test('seller registers, lands on the dashboard, can reach the add-business form', async () => {
  const user = userEvent.setup();
  sessionStorage.setItem('bn_welcomed', '1');
  routes['POST /auth/seller/register'] = (o) => { const b = JSON.parse(o.body); expect(b.businessName).toBe('Green Leaf'); return ok({ token: 't', user: { id: 'u1', name: 'Sam Seller', role: 'seller', email: b.email } }); };
  routes['GET /businesses/mine'] = ok([]);
  mount('/login/seller');
  await user.click(screen.getByRole('tab', { name: 'Register business' }));
  await user.type(screen.getByLabelText('Owner name'), 'Sam Seller');
  await user.type(screen.getByLabelText('Business name'), 'Green Leaf');
  await user.type(screen.getByLabelText('Business phone'), '9000000000');
  await user.type(screen.getByLabelText('Email'), 'sam@x.com');
  await user.type(screen.getByLabelText('Password'), 'secret1');
  await user.click(screen.getByRole('button', { name: 'Register business' }));
  expect(await screen.findByText('Your businesses')).toBeInTheDocument();
  expect(screen.getByText(/haven.t listed a business yet/)).toBeInTheDocument();
  await user.click(screen.getByRole('link', { name: /Add business/ }));
  expect(await screen.findByText('List your business')).toBeInTheDocument();
  // publishing without a location is blocked client-side
  await user.type(screen.getByLabelText('Business name'), 'Green Leaf Cafe');
  await user.type(screen.getByLabelText('Address'), '12 Lake Road');
  await user.click(screen.getByRole('button', { name: 'Publish listing' }));
  expect(await screen.findByText('Click the map to set the business location.')).toBeInTheDocument();
});

test('wrong portal and bad password show the server message inline', async () => {
  const user = userEvent.setup();
  sessionStorage.setItem('bn_welcomed', '1');
  routes['POST /auth/customer/login'] = bad(403, 'This email is registered as a seller. Use the seller login.');
  mount('/login/customer');
  await user.type(screen.getByLabelText('Email'), 'sam@x.com');
  await user.type(screen.getByLabelText('Password'), 'secret1');
  await user.click(screen.getByRole('button', { name: 'Sign in as customer' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('registered as a seller');
});

test('seller routes are protected: a customer is redirected away from the dashboard', async () => {
  sessionStorage.setItem('bn_welcomed', '1'); localStorage.setItem('bn_token', 't');
  global.navigator.geolocation = { getCurrentPosition: () => {} };
  routes['GET /auth/me'] = ok({ id: 'c1', name: 'Cathy', role: 'customer', email: 'c@x.com' });
  mount('/dashboard');
  expect(await screen.findByText('Connecting you to the heartbeat of your neighborhood.')).toBeInTheDocument();
});

test('business page: no photo controls for a customer; review form posts once', async () => {
  const user = userEvent.setup();
  sessionStorage.setItem('bn_welcomed', '1'); localStorage.setItem('bn_token', 't');
  routes['GET /auth/me'] = ok({ id: 'c1', name: 'Cathy', role: 'customer', email: 'c@x.com' });
  routes['GET /businesses/b1'] = ok({ ...biz('b1'), name: 'Green Leaf Cafe', images: [], deals: [{ id: 'd1', title: 'Weekend special', discount_percent: 20, expires_at: '2030-01-01T00:00:00Z' }], category: { name: 'Dining' }, address: '12 Lake Road', opening_hours: {}, isOwner: false, description: 'Cosy.' });
  routes['GET /reviews'] = ok({ reviews: [{ id: 'r1', rating: 5, comment: 'Lovely coffee and staff.', createdAt: '2026-09-01T00:00:00Z', businessId: 'b1', author: 'Asha K.' }], summary: null });
  let posted = null;
  routes['POST /businesses/b1/reviews'] = (o) => { posted = JSON.parse(o.body); return ok({ id: 'r2' }); };
  mount('/business/b1');
  expect(await screen.findByRole('heading', { name: 'Green Leaf Cafe' })).toBeInTheDocument();
  expect(screen.getByText(/seller hasn.t added photos yet/)).toBeInTheDocument();
  expect(screen.queryByText(/Add shop photo|Manage listing/)).toBeNull();
  expect(screen.getByText('Lovely coffee and staff.')).toBeInTheDocument();
  expect(screen.getByText('20% off · Weekend special')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Get directions/ })).toHaveAttribute('href', expect.stringContaining('destination=11,77'));
  await user.click(screen.getByRole('button', { name: 'Post review' }));
  expect(await screen.findByText('Choose a star rating.')).toBeInTheDocument();
  await user.click(screen.getByRole('radio', { name: '4 stars' }));
  await user.type(screen.getByLabelText('Your review'), 'Really enjoyed the visit here.');
  await user.click(screen.getByRole('button', { name: 'Post review' }));
  await waitFor(() => expect(posted).toEqual({ rating: 4, comment: 'Really enjoyed the visit here.' }));
  expect(await screen.findByText(/review has been posted/)).toBeInTheDocument();
});

test('reviews page lists reviews with the rating breakdown', async () => {
  sessionStorage.setItem('bn_welcomed', '1');
  routes['GET /reviews'] = ok({ reviews: [{ id: 'r1', rating: 4, comment: 'Quick service and fair prices.', createdAt: '2026-09-01T00:00:00Z', businessId: 'b1', businessName: 'Shop 1', author: 'Ravi M.' }], summary: { count: 1, average: 4, distribution: [0, 1, 0, 0, 0] } });
  mount('/reviews?business=b1');
  expect(await screen.findByText('Quick service and fair prices.')).toBeInTheDocument();
  expect(screen.getByText('Verified customer')).toBeInTheDocument();
  expect(screen.getByLabelText('Rating breakdown')).toBeInTheDocument();
});

test('new seller who tries to sign in is guided to register', async () => {
  const user = userEvent.setup();
  sessionStorage.setItem('bn_welcomed', '1');
  routes['POST /auth/seller/login'] = bad(401, 'Invalid email or password');
  mount('/login/seller');
  // the register option is visible without hunting for a tab
  expect(screen.getByRole('button', { name: 'Register your business' })).toBeInTheDocument();
  await user.type(screen.getByLabelText('Email'), 'new@x.com');
  await user.type(screen.getByLabelText('Password'), 'secret1');
  await user.click(screen.getByRole('button', { name: 'Sign in as seller' }));
  await user.click(await screen.findByRole('button', { name: /No account yet\? Create one/ }));
  expect(await screen.findByLabelText('Business name')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Register business' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument(); // way back
});
