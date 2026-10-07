import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { api } from '../../api/api.js';
import { fmtDateTime, thumb, IMAGE_TYPES, MAX_IMAGE_BYTES } from '../../utils/format.js';

// Seller tool: create, pause or delete the promotional offers of one business.
export default function DealManager({ business, onChanged }) {
  const [f, setF] = useState({ title: '', discountPercent: '', expiresAt: '' });
  const [banner, setBanner] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  async function create(e) {
    e.preventDefault();
    setError('');
    if (f.title.trim().length < 2) return setError('Enter a deal title.');
    const d = Number(f.discountPercent);
    if (!(d >= 1 && d <= 100)) return setError('Discount must be between 1 and 100.');
    if (!f.expiresAt || new Date(f.expiresAt) <= new Date()) return setError('Choose an expiry date in the future.');
    const fd = new FormData();
    fd.append('title', f.title.trim());
    fd.append('discountPercent', d);
    fd.append('expiresAt', new Date(f.expiresAt).toISOString());
    if (banner) fd.append('banner', banner);
    setBusy(true);
    try {
      await api.createDeal(business.id, fd);
      setF({ title: '', discountPercent: '', expiresAt: '' }); setBanner(null);
      onChanged();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  function pickBanner(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) return setError('Banner must be a JPEG, PNG or WebP image.');
    if (file.size > MAX_IMAGE_BYTES) return setError('Banner must be 5 MB or smaller.');
    setError(''); setBanner(file);
  }

  const act = (fn) => async () => { try { await fn(); onChanged(); } catch (err) { setError(err.message); } };

  return (
    <section className="panel" aria-label="Deals">
      <h2 className="text-xl font-extrabold tracking-tight">Deals</h2>
      <ul className="mt-4 divide-y divide-ink-line">
        {business.deals.length === 0 && <li className="py-3 text-ink-soft">No deals yet.</li>}
        {business.deals.map((d) => {
          const expired = new Date(d.expires_at) < new Date();
          return (
            <li key={d.id} className="flex flex-wrap items-center gap-3 py-3">
              {d.banner_url && <img src={thumb(d.banner_url, 120)} alt="" className="h-12 w-16 rounded-lg object-cover" />}
              <div className="min-w-0 flex-1">
                <p className="font-bold">{d.title} <span className="rounded-full bg-brand-deal px-2 py-0.5 text-xs font-extrabold text-amber-950">{d.discount_percent}% off</span></p>
                <p className="text-sm text-ink-soft">{expired ? 'Expired' : d.is_active ? 'Live' : 'Paused'} &middot; ends {fmtDateTime(d.expires_at)}</p>
              </div>
              {!expired && <button className="btn !py-1.5 text-sm" onClick={act(() => api.updateDeal(d.id, { isActive: !d.is_active }))}>{d.is_active ? 'Pause' : 'Resume'}</button>}
              <button className="btn-danger !py-1.5 text-sm" aria-label={`Delete ${d.title}`}
                      onClick={() => window.confirm('Delete this deal?') && act(() => api.deleteDeal(d.id))()}><Trash2 size={15} /></button>
            </li>
          );
        })}
      </ul>

      <form onSubmit={create} className="mt-5 grid gap-3 border-t border-ink-line pt-5 sm:grid-cols-2">
        <label className="label">Deal title<input className="input" value={f.title} onChange={set('title')} placeholder="Weekend special" /></label>
        <label className="label">Discount %<input className="input" type="number" min="1" max="100" value={f.discountPercent} onChange={set('discountPercent')} placeholder="20" /></label>
        <label className="label">Expires<input className="input" type="datetime-local" value={f.expiresAt} onChange={set('expiresAt')} /></label>
        <label className="label">Banner (optional)<input className="input" type="file" accept={IMAGE_TYPES.join(',')} onChange={pickBanner} /></label>
        {error && <p className="err-text sm:col-span-2" role="alert">{error}</p>}
        <button className="btn-primary sm:col-span-2 sm:w-fit" disabled={busy}>{busy ? 'Saving...' : 'Add deal'}</button>
      </form>
    </section>
  );
}
