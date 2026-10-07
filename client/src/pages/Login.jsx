import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Logo from '../components/ui/Logo.jsx';
import { markWelcome } from '../utils/welcome.js';

const COPY = {
  customer: { title: 'Customer login', sub: 'Sign in to save shops, review them and follow deals near you.', up: 'Create account', other: ['Are you a business owner?', 'Seller login', '/login/seller'] },
  seller: { title: 'Seller login', sub: 'Sign in to manage your listings, photos, deals and leads.', up: 'Register business', other: ['Just looking for shops?', 'Customer login', '/login/customer'] },
};

export default function Login() {
  const { role } = useParams();
  const { user, login, register } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [tab, setTab] = useState('in');
  const [show, setShow] = useState(false);
  const [f, setF] = useState({ name: '', businessName: '', phone: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [noAccount, setNoAccount] = useState(false);
  const errRef = useRef(null);

  // Bring a new error into view so it can't be missed below the fold
  useEffect(() => { if (error) errRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' }); }, [error]);

  if (!COPY[role]) return <Navigate to="/login/customer" replace />;
  if (user) return <Navigate to={user.role === 'seller' ? '/dashboard' : '/explore'} replace />;

  const c = COPY[role];
  const set = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); setError(''); setNoAccount(false); };
  const switchTab = (k) => { setTab(k); setError(''); setNoAccount(false); };

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) return setError('Enter a valid email address.');
    if (!f.password) return setError('Enter your password.');
    if (tab === 'up') {
      if (f.password.length < 6) return setError('Password must be at least 6 characters.');
      if (f.name.trim().length < 2) return setError('Enter your name.');
      if (role === 'seller' && f.businessName.trim().length < 2) return setError('Enter your business name.');
      if (role === 'seller' && f.phone.trim().length < 8) return setError('Enter a valid business phone.');
    }
    setBusy(true);
    try {
      const u = tab === 'in'
        ? await login(role, { email: f.email.trim(), password: f.password })
        : await register(role, { name: f.name.trim(), email: f.email.trim(), password: f.password, ...(role === 'seller' ? { businessName: f.businessName.trim(), phone: f.phone.trim() } : {}) });
      markWelcome();
      nav(loc.state?.from || (u.role === 'seller' ? '/dashboard' : '/explore'), { replace: true });
    } catch (err) { setError(err.message); setNoAccount(tab === 'in' && err.status === 401); setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-5 text-center"><Logo className="text-3xl" /></div>
      <div className="mb-4 grid grid-cols-2 gap-2.5" role="group" aria-label="Account type">
        {['customer', 'seller'].map((r) => (
          <Link key={r} to={`/login/${r}`} aria-current={r === role} replace
                className={`rounded-2xl border bg-white p-3.5 text-left ${r === role ? 'border-brand-green ring-2 ring-brand-green' : 'border-ink-line'}`}>
            <b className="block capitalize">{r}</b>
            <span className="text-xs text-ink-soft">{r === 'customer' ? 'Find local shops and deals' : 'List and manage your business'}</span>
          </Link>
        ))}
      </div>

      <form onSubmit={submit} className="panel grid gap-4" noValidate>
        <div><h1 className="text-2xl font-extrabold tracking-tight">{c.title}</h1><p className="text-ink-soft">{c.sub}</p></div>
        <div className="grid grid-cols-2 rounded-full bg-slate-100 p-1" role="tablist">
          {[['in', 'Sign in'], ['up', c.up]].map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => switchTab(k)}
                    className={`rounded-full py-2 font-semibold ${tab === k ? 'bg-white shadow' : 'text-ink-soft'}`}>{label}</button>
          ))}
        </div>

        {tab === 'up' && (
          <>
            <label className="label">{role === 'seller' ? 'Owner name' : 'Full name'}<input className="input" value={f.name} onChange={set('name')} autoComplete="name" /></label>
            {role === 'seller' && (
              <>
                <label className="label">Business name<input className="input" value={f.businessName} onChange={set('businessName')} /></label>
                <label className="label">Business phone<input className="input" type="tel" value={f.phone} onChange={set('phone')} autoComplete="tel" /></label>
              </>
            )}
          </>
        )}
        <label className="label">Email<input className="input" type="email" value={f.email} onChange={set('email')} autoComplete="email" autoFocus /></label>
        <label className="label">Password
          <span className="relative block">
            <input className="input !pr-20" type={show ? 'text' : 'password'} value={f.password} onChange={set('password')} autoComplete={tab === 'in' ? 'current-password' : 'new-password'} />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-ink-soft">{show ? 'Hide' : 'Show'}</button>
          </span>
        </label>
        {error && (
          <p className="err-text" role="alert" ref={errRef}>
            {error}
            {noAccount && <> <button type="button" className="underline" onClick={() => switchTab('up')}>No account yet? Create one</button></>}
          </p>
        )}
        <button className="btn-primary w-full !py-3.5" disabled={busy}>{busy ? 'Please wait...' : tab === 'in' ? `Sign in as ${role}` : c.up}</button>
      </form>
      <p className="mt-4 text-center text-sm text-ink-soft">
        {tab === 'in'
          ? <>New to BizzNearby? <button type="button" className="font-bold text-brand-green underline" onClick={() => switchTab('up')}>{role === 'seller' ? 'Register your business' : 'Create an account'}</button></>
          : <>Already registered? <button type="button" className="font-bold text-brand-green underline" onClick={() => switchTab('in')}>Sign in</button></>}
      </p>
      <p className="mt-2 text-center text-sm text-ink-soft">{c.other[0]} <Link className="font-bold text-brand-green underline" to={c.other[2]}>{c.other[1]}</Link></p>
    </div>
  );
}
