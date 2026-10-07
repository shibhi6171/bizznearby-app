import BusinessCard from './BusinessCard.jsx';

export default function BusinessGrid({ items, loading }) {
  if (loading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-72 animate-pulse rounded-[28px] bg-white/70" />)}
      </div>
    );
  }
  if (!items.length) {
    return (
      <div className="rounded-3xl border border-dashed border-ink-line p-12 text-center text-ink-soft">
        Nothing matches here yet. Try a wider radius, another category, or clear the search.
      </div>
    );
  }
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((b, i) => <BusinessCard key={b.id} b={b} index={i} />)}
    </div>
  );
}
