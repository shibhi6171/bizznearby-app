import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/api.js';
import ReviewList from '../components/reviews/ReviewList.jsx';
import Spinner, { ErrorNote } from '../components/ui/Spinner.jsx';
import Stars from '../components/ui/Stars.jsx';

export default function Reviews() {
  const [params] = useSearchParams();
  const businessId = params.get('business') || undefined;
  const { data, isLoading, error } = useQuery({ queryKey: ['reviews', businessId, 'page'], queryFn: () => api.reviews({ businessId, limit: 30 }) });
  const s = data?.summary;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-4xl font-extrabold tracking-tighter">Customer reviews</h1>
      <p className="mb-6 mt-2 text-ink-soft">Original reviews from signed-in customers. One review per shop, and nobody can edit or remove them.</p>
      {businessId && <Link to={`/business/${businessId}`} className="mb-4 inline-block font-bold text-brand-green hover:underline">&larr; Back to the shop</Link>}

      {s && s.count > 0 && (
        <div className="panel mb-6 grid items-center gap-6 sm:grid-cols-[auto_1fr]">
          <div><div className="text-5xl font-extrabold tracking-tighter">{s.average.toFixed(1)}</div><Stars value={s.average} /><p className="text-sm text-ink-soft">{s.count} {s.count === 1 ? 'review' : 'reviews'}</p></div>
          <div className="grid gap-1.5" aria-label="Rating breakdown">
            {s.distribution.map((n, i) => (
              <div key={i} className="grid grid-cols-[28px_1fr_28px] items-center gap-2 text-sm text-ink-soft">
                <span>{5 - i}&#9733;</span>
                <span className="h-2 overflow-hidden rounded-full bg-slate-100"><span className="block h-full bg-brand-deal" style={{ width: `${(n / s.count) * 100}%` }} /></span>
                <span>{n}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="panel">
        {isLoading ? <Spinner /> : error ? <ErrorNote error={error} /> : <ReviewList reviews={data.reviews} showShop={!businessId} />}
      </div>
    </div>
  );
}
