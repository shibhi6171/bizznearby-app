import { Link } from 'react-router-dom';
import { Star, Store } from 'lucide-react';
import { fmtDistance, fmtRating, thumb } from '../../utils/format.js';

export default function BusinessCard({ b, index = 0 }) {
  return (
    <Link
      to={`/business/${b.id}`}
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
      className="anim-up group flex flex-col overflow-hidden rounded-[28px] border border-ink-line bg-white transition hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="relative grid h-48 place-items-center overflow-hidden bg-gradient-to-br from-green-100 to-blue-100">
        {b.cover_image_url ? (
          <img src={thumb(b.cover_image_url, 600)} alt={`Photo of ${b.name}`} loading="lazy"
               className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <Store size={44} className="text-ink-soft/50" aria-hidden />
        )}
        {b.max_discount > 0 && (
          <span className="absolute left-3 top-3 rounded-full bg-brand-deal px-3 py-0.5 text-xs font-extrabold text-amber-950">{b.max_discount}% off</span>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-bold tracking-tight">{b.name}</h3>
        <p className="mt-0.5 flex items-center gap-1 text-sm text-ink-soft">
          <Star size={14} className="fill-brand-deal text-brand-deal" /> {fmtRating(b.avg_rating)}
          {b.review_count > 0 && <span>({b.review_count})</span>} &middot; {fmtDistance(b.distance_meters)}
        </p>
        <p className="text-sm text-ink-soft">{b.category_name}</p>
      </div>
    </Link>
  );
}
