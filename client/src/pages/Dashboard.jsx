import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Store, Trash2 } from 'lucide-react';
import { api } from '../api/api.js';
import Spinner, { ErrorNote } from '../components/ui/Spinner.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { fmtRating, thumb } from '../utils/format.js';

export default function Dashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ['mine'], queryFn: api.myBusinesses });
  const del = useMutation({ mutationFn: api.deleteBusiness, onSuccess: () => qc.invalidateQueries({ queryKey: ['mine'] }) });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tighter">Your businesses</h1>
          <p className="mt-1 text-ink-soft">Welcome, {user.name}. Add listings, photos and deals so nearby customers can find you.</p>
        </div>
        <Link to="/dashboard/new" className="btn-primary"><Plus size={18} /> Add business</Link>
      </div>

      {isLoading ? <Spinner /> : error ? <ErrorNote error={error} /> : data.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-ink-line p-12 text-center text-ink-soft">You haven&apos;t listed a business yet. Click <b>Add business</b> to start.</div>
      ) : (
        <ul className="grid gap-4">
          {data.map((b) => {
            const cover = b.business_images?.find((i) => i.is_cover) || b.business_images?.[0];
            const liveDeals = (b.deals || []).filter((d) => d.is_active && new Date(d.expires_at) > new Date()).length;
            return (
              <li key={b.id} className="panel flex flex-wrap items-center gap-4 !p-4">
                <div className="grid h-20 w-24 flex-none place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-green-100 to-blue-100">
                  {cover ? <img src={thumb(cover.url, 200)} alt="" className="h-full w-full object-cover" /> : <Store className="text-ink-soft/50" />}
                </div>
                <div className="min-w-0 flex-1">
                  <Link to={`/business/${b.id}`} className="font-bold hover:underline">{b.name}</Link>
                  <p className="truncate text-sm text-ink-soft">{b.categories?.name} &middot; {b.address}</p>
                  <p className="text-sm text-ink-soft">&#9733; {fmtRating(b.avg_rating)} ({b.review_count}) &middot; {liveDeals} live {liveDeals === 1 ? 'deal' : 'deals'}</p>
                </div>
                <Link to={`/dashboard/${b.id}`} className="btn"><Pencil size={15} /> Edit</Link>
                <button className="btn-danger" aria-label={`Delete ${b.name}`} disabled={del.isPending}
                        onClick={() => window.confirm(`Delete "${b.name}" and all its photos, deals and reviews?`) && del.mutate(b.id)}><Trash2 size={15} /></button>
              </li>
            );
          })}
        </ul>
      )}
      {del.error && <div className="mt-4"><ErrorNote error={del.error} /></div>}
    </div>
  );
}
