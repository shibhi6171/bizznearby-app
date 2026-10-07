import { Star } from 'lucide-react';

export default function Stars({ value = 0, size = 16 }) {
  const n = Math.round(value);
  return (
    <span className="inline-flex" role="img" aria-label={`${n} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} className={i <= n ? 'fill-brand-deal text-brand-deal' : 'text-ink-line'} />
      ))}
    </span>
  );
}
