import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Store } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import Logo from '../components/ui/Logo.jsx';
import { markWelcome } from '../utils/welcome.js';

// Step 1: animated splash (name + tagline). Step 2: "customer or seller?" choice.
export default function Welcome() {
  const [phase, setPhase] = useState('splash');
  const { user } = useAuth();
  const nav = useNavigate();

  useEffect(() => { if (user) { markWelcome(); nav('/explore', { replace: true }); } }, [user, nav]);
  useEffect(() => {
    if (phase !== 'splash') return undefined;
    const t = setTimeout(() => setPhase('choose'), 4500);
    return () => clearTimeout(t);
  }, [phase]);

  const go = (to) => { markWelcome(); nav(to); };

  if (phase === 'splash') {
    return (
      <div className="fixed inset-0 grid place-items-center overflow-hidden bg-ink-bg" role="status" aria-label="BizzNearby. Every business around the corner.">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <i className="sp-ring" /><i className="sp-ring" style={{ animationDelay: '1s' }} /><i className="sp-ring" style={{ animationDelay: '2s' }} />
        </div>
        <div className="relative px-6 text-center">
          <h1 className="anim-up" style={{ animationDelay: '.2s' }}><Logo className="text-5xl sm:text-7xl" /></h1>
          <p className="sp-tag mt-3 text-xl font-semibold tracking-tight sm:text-2xl">Every business around the corner</p>
        </div>
        <button className="btn absolute bottom-6 right-6 !py-2 text-ink-soft" onClick={() => setPhase('choose')}>Skip</button>
      </div>
    );
  }

  const Card = ({ icon: Icon, title, text, cta, to }) => (
    <button onClick={() => go(to)} className="group grid justify-items-center gap-2 rounded-3xl border border-ink-line bg-ink-bg p-7 text-center transition hover:border-brand-green hover:shadow-[0_14px_30px_-18px_#3fc45a]">
      <Icon size={36} className="text-brand-green" aria-hidden />
      <h3 className="text-xl font-bold tracking-tight">{title}</h3>
      <p className="max-w-[230px] text-sm text-ink-soft">{text}</p>
      <span className="mt-2 rounded-full bg-brand-green px-5 py-2.5 font-bold text-white">{cta} &rarr;</span>
    </button>
  );

  return (
    <div className="fixed inset-0 grid place-items-center overflow-auto bg-ink-bg p-5">
      <div className="anim-up w-full max-w-3xl rounded-[32px] border border-ink-line bg-white p-8 text-center sm:p-11">
        <Logo className="text-3xl" />
        <h2 className="mb-7 mt-2 text-lg font-semibold text-ink-soft sm:text-xl">Choose your experience to get started</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card icon={ShoppingBag} title="Customer" text="Discover local shops, get exclusive deals & rewards" cta="Continue as Customer" to="/login/customer" />
          <Card icon={Store} title="Seller" text="List your business, manage leads & grow" cta="Continue as Seller" to="/login/seller" />
        </div>
        <p className="mt-6 text-ink-soft">Just browsing? <button className="font-bold text-ink underline underline-offset-4" onClick={() => go('/explore')}>Continue as Guest</button></p>
      </div>
    </div>
  );
}
