import { BadgeCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fmtDate } from '../../utils/format.js';
import Stars from '../ui/Stars.jsx';

export default function ReviewList({ reviews, showShop = false }) {
  if (!reviews.length) return <p className="text-ink-soft">No reviews yet. Be the first to review after your visit.</p>;
  return (
    <ul className="divide-y divide-ink-line">
      {reviews.map((r) => (
        <li key={r.id} className="py-5 first:pt-0 last:pb-0">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-brand-green font-extrabold text-white" aria-hidden>{r.author[0]}</span>
            <div>
              <p className="flex flex-wrap items-center gap-2 font-bold">
                {r.author}
                <span className="inline-flex items-center gap-1 rounded-full border border-brand-green px-2 text-xs font-bold text-brand-green"><BadgeCheck size={12} /> Verified customer</span>
              </p>
              <p className="text-sm text-ink-soft">
                {showShop && r.businessName && <><Link className="hover:underline" to={`/business/${r.businessId}`}>{r.businessName}</Link> &middot; </>}
                {fmtDate(r.createdAt)}
              </p>
            </div>
          </div>
          <div className="mt-2"><Stars value={r.rating} /></div>
          <p className="mt-1">{r.comment}</p>
        </li>
      ))}
    </ul>
  );
}
