import { useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { List, LocateFixed, Map as MapIcon, Search } from 'lucide-react';
import { api } from '../api/api.js';
import BusinessGrid from '../components/business/BusinessGrid.jsx';
import { CategoryChips, RadiusSlider } from '../components/business/FilterBar.jsx';
import LocationPicker from '../components/map/LocationPicker.jsx';
import MapView from '../components/map/MapView.jsx';
import { ErrorNote } from '../components/ui/Spinner.jsx';
import { useDebounce } from '../hooks/useDebounce.js';
import { useGeolocation } from '../hooks/useGeolocation.js';
import { RADII_KM } from '../utils/format.js';

const LOC_KEY = 'bn_loc';
const readLoc = () => { try { return JSON.parse(localStorage.getItem(LOC_KEY)); } catch { return null; } };

export default function Explore() {
  const { coords, status, request } = useGeolocation();
  const [manual, setManual] = useState(readLoc);
  const [picking, setPicking] = useState(false);
  const [draft, setDraft] = useState(null);
  const loc = manual || coords;

  const [q, setQ] = useState('');
  const dq = useDebounce(q);
  const [cat, setCat] = useState('all');
  const [ri, setRi] = useState(1);
  const [dealsOnly, setDealsOnly] = useState(false);
  const [sort, setSort] = useState('distance');
  const [view, setView] = useState('list');
  const radiusKm = RADII_KM[ri];

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['nearby', loc?.lat, loc?.lng, radiusKm, cat, dq],
    queryFn: () => api.nearby({ lat: loc.lat, lng: loc.lng, radiusKm, category: cat, q: dq }),
    enabled: Boolean(loc),
    placeholderData: keepPreviousData,
  });

  const items = useMemo(() => {
    let r = data || [];
    if (dealsOnly) r = r.filter((b) => b.active_deals_count > 0);
    r = [...r];
    if (sort === 'rating') r.sort((a, b) => b.avg_rating - a.avg_rating);
    if (sort === 'discount') r.sort((a, b) => (b.max_discount || 0) - (a.max_discount || 0));
    return r;
  }, [data, dealsOnly, sort]);

  function confirmArea() {
    try { localStorage.setItem(LOC_KEY, JSON.stringify(draft)); } catch { /* ignore */ }
    setManual(draft); setPicking(false);
  }

  const needsPicker = picking || (!loc && (status === 'denied' || status === 'unsupported'));

  return (
    <div>
      <h1 className="text-4xl font-extrabold leading-tight tracking-tighter sm:text-5xl">BizzNearby &mdash; Discover local shops, services and deals</h1>
      <p className="mb-6 mt-2 text-ink-soft">Connecting you to the heartbeat of your neighborhood.</p>

      {needsPicker ? (
        <div className="panel">
          <h2 className="text-xl font-extrabold tracking-tight">{picking ? 'Change your area' : 'Where should we look?'}</h2>
          <p className="mb-4 mt-1 text-ink-soft">
            {status === 'denied' ? 'Location access is off, so pick your area on the map.' : 'Click the map to choose the centre of your search.'}
          </p>
          <LocationPicker value={draft || loc} onChange={setDraft} />
          <div className="mt-4 flex flex-wrap gap-3">
            <button className="btn-primary" disabled={!draft} onClick={confirmArea}>Search this area</button>
            {picking && <button className="btn" onClick={() => setPicking(false)}>Cancel</button>}
            {!picking && <button className="btn" onClick={request}>Try my location again</button>}
          </div>
        </div>
      ) : !loc ? (
        <p className="py-16 text-center text-ink-soft" role="status">Finding your location... please allow location access when your browser asks.</p>
      ) : (
        <>
          <label className="relative block">
            <Search className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-ink-soft" size={20} />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search shops, cafes, clinics, deals..." aria-label="Search"
                   className="w-full rounded-full border border-ink-line bg-white py-5 pl-14 pr-6 text-lg outline-none focus:border-brand-green" />
          </label>
          <div className="my-6"><CategoryChips value={cat} onChange={setCat} /></div>

          <div className="mb-7 flex flex-wrap items-center gap-4">
            <RadiusSlider value={ri} onChange={setRi} />
            <label className="flex items-center gap-2 font-semibold"><input type="checkbox" className="accent-brand-green" checked={dealsOnly} onChange={(e) => setDealsOnly(e.target.checked)} /> Deals only</label>
            <select className="input !w-auto !rounded-full !py-2" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
              <option value="distance">Nearest first</option><option value="rating">Top rated</option><option value="discount">Biggest discount</option>
            </select>
            <div className="flex rounded-full bg-slate-100 p-1" role="group" aria-label="View">
              {[['list', List, 'List'], ['map', MapIcon, 'Map']].map(([k, Icon, label]) => (
                <button key={k} aria-pressed={view === k} onClick={() => setView(k)}
                        className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 font-semibold ${view === k ? 'bg-white shadow' : 'text-ink-soft'}`}><Icon size={15} /> {label}</button>
              ))}
            </div>
            <button className="btn !py-2 text-sm" onClick={() => { setDraft(loc); setPicking(true); }}><LocateFixed size={15} /> Change area</button>
          </div>

          {view === 'map' && <div className="mb-8"><MapView center={loc} radiusKm={radiusKm} items={items} /></div>}

          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-xl font-extrabold tracking-tight">Latest in your vicinity</h2>
            <span className="text-sm text-ink-soft">{isFetching && !isLoading ? 'Updating...' : `${items.length} ${items.length === 1 ? 'listing' : 'listings'}`}</span>
          </div>
          {error ? <ErrorNote error={error} /> : <BusinessGrid items={items} loading={isLoading} />}
        </>
      )}
    </div>
  );
}
