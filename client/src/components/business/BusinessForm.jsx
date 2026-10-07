import { useEffect, useMemo, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { api } from '../../api/api.js';
import LocationPicker from '../map/LocationPicker.jsx';
import { CATEGORIES, IMAGE_TYPES, MAX_IMAGE_BYTES, thumb } from '../../utils/format.js';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

// Create (business = null) or edit a listing. Photos go through the API, which checks ownership.
export default function BusinessForm({ business, onSaved }) {
  const editing = Boolean(business);
  const [f, setF] = useState(() => ({
    name: business?.name || '', category: business?.category?.slug || 'dining', description: business?.description || '',
    address: business?.address || '', phone: business?.phone || '', whatsapp: business?.whatsapp || '',
    email: business?.email || '', website: business?.website || '',
    opens: business?.opening_hours?.mon?.open || '09:00', closes: business?.opening_hours?.mon?.close || '21:00',
  }));
  const [pos, setPos] = useState(business ? { lat: business.latitude, lng: business.longitude } : null);
  const [files, setFiles] = useState([]);
  const [existing, setExisting] = useState(business?.images || []);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  function pick(e) {
    const ok = [];
    for (const file of e.target.files) {
      if (!IMAGE_TYPES.includes(file.type)) { setError(`${file.name}: only JPEG, PNG or WebP images.`); continue; }
      if (file.size > MAX_IMAGE_BYTES) { setError(`${file.name} is over 5 MB.`); continue; }
      ok.push(file);
    }
    setFiles((prev) => [...prev, ...ok].slice(0, 6));
    e.target.value = '';
  }

  async function deleteExisting(img) {
    if (!window.confirm('Remove this photo?')) return;
    try { await api.deleteImage(business.id, img.id); setExisting((x) => x.filter((i) => i.id !== img.id)); }
    catch (err) { setError(err.message); }
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (f.name.trim().length < 2) return setError('Enter the business name.');
    if (f.address.trim().length < 3) return setError('Enter the address.');
    if (!pos) return setError('Click the map to set the business location.');
    const openingHours = Object.fromEntries(DAYS.map((d) => [d, { open: f.opens, close: f.closes }]));
    const fields = { name: f.name.trim(), category: f.category, description: f.description.trim(), address: f.address.trim(), phone: f.phone.trim(), whatsapp: f.whatsapp.trim(), email: f.email.trim(), website: f.website.trim() };
    setBusy(true);
    try {
      let saved;
      if (editing) {
        saved = await api.updateBusiness(business.id, { ...fields, latitude: pos.lat, longitude: pos.lng, openingHours });
        if (files.length) {
          const fd = new FormData();
          files.forEach((file) => fd.append('images', file));
          await api.addImages(business.id, fd);
        }
      } else {
        const fd = new FormData();
        Object.entries(fields).forEach(([k, v]) => fd.append(k, v));
        fd.append('latitude', pos.lat);
        fd.append('longitude', pos.lng);
        fd.append('openingHours', JSON.stringify(openingHours));
        files.forEach((file) => fd.append('images', file));
        saved = await api.createBusiness(fd);
      }
      setFiles([]);
      onSaved(saved);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-2">
      <div className="panel grid content-start gap-4">
        <label className="label">Business name<input className="input" value={f.name} onChange={set('name')} placeholder="e.g. Green Leaf Cafe" /></label>
        <label className="label">Category
          <select className="input" value={f.category} onChange={set('category')}>
            {CATEGORIES.filter((c) => c.slug !== 'all').map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
        </label>
        <label className="label">Address<input className="input" value={f.address} onChange={set('address')} placeholder="Street, area" /></label>
        <label className="label">Description<textarea className="input min-h-[90px]" value={f.description} onChange={set('description')} placeholder="What makes your business worth a visit?" /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="label">Phone<input className="input" type="tel" value={f.phone} onChange={set('phone')} /></label>
          <label className="label">WhatsApp<input className="input" type="tel" value={f.whatsapp} onChange={set('whatsapp')} /></label>
          <label className="label">Email<input className="input" type="email" value={f.email} onChange={set('email')} /></label>
          <label className="label">Website<input className="input" value={f.website} onChange={set('website')} placeholder="https://" /></label>
          <label className="label">Opens<input className="input" type="time" value={f.opens} onChange={set('opens')} /></label>
          <label className="label">Closes<input className="input" type="time" value={f.closes} onChange={set('closes')} /></label>
        </div>

        <div>
          <p className="label">Photos (JPEG, PNG or WebP, up to 5 MB each)</p>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {existing.map((img) => (
              <div key={img.id} className="relative">
                <img src={thumb(img.url, 200)} alt="Saved photo" className="aspect-square w-full rounded-xl object-cover" />
                <button type="button" aria-label="Remove photo" onClick={() => deleteExisting(img)} className="absolute right-1 top-1 rounded-full bg-white p-1.5 shadow"><Trash2 size={14} /></button>
              </div>
            ))}
            {previews.map((src, i) => (
              <div key={src} className="relative">
                <img src={src} alt={`New photo ${i + 1}`} className="aspect-square w-full rounded-xl object-cover" />
                <button type="button" aria-label="Remove new photo" onClick={() => setFiles((x) => x.filter((_, j) => j !== i))} className="absolute right-1 top-1 rounded-full bg-white p-1.5 shadow"><Trash2 size={14} /></button>
              </div>
            ))}
            <label className="grid aspect-square cursor-pointer place-items-center rounded-xl border border-dashed border-ink-line text-ink-soft hover:border-brand-green">
              <ImagePlus /><input type="file" accept={IMAGE_TYPES.join(',')} multiple hidden onChange={pick} />
            </label>
          </div>
        </div>
      </div>

      <div className="grid content-start gap-4">
        <div className="panel">
          <p className="label mb-2">Location (click the map or drag the pin)</p>
          <LocationPicker value={pos} onChange={setPos} />
        </div>
        {error && <p className="err-text" role="alert">{error}</p>}
        <button className="btn-primary w-full !py-3.5" disabled={busy}>{busy ? 'Saving...' : editing ? 'Save changes' : 'Publish listing'}</button>
      </div>
    </form>
  );
}
