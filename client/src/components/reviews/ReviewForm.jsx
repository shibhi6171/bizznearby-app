import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import { api } from '../../api/api.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function ReviewForm({ businessId }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const post = useMutation({
    mutationFn: () => api.addReview(businessId, { rating, comment }),
    onSuccess: () => { setDone(true); qc.invalidateQueries({ queryKey: ['reviews'] }); qc.invalidateQueries({ queryKey: ['business', businessId] }); },
    onError: (e) => setError(e.message),
  });

  if (!user) return <p className="text-ink-soft"><Link className="font-bold text-brand-green underline" to="/login/customer" state={{ from: `/business/${businessId}` }}>Sign in as a customer</Link> to write a review.</p>;
  if (user.role !== 'customer') return <p className="text-ink-soft">Seller accounts can&apos;t post reviews. This keeps ratings honest.</p>;
  if (done) return <p className="font-semibold text-brand-green" role="status">Thanks! Your review has been posted.</p>;

  function submit(e) {
    e.preventDefault();
    setError('');
    if (!rating) return setError('Choose a star rating.');
    if (comment.trim().length < 10) return setError('Write at least 10 characters.');
    post.mutate();
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      <div role="radiogroup" aria-label="Rating" className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => setRating(n)}>
            <Star size={28} className={n <= rating ? 'fill-brand-deal text-brand-deal' : 'text-ink-line'} />
          </button>
        ))}
      </div>
      <textarea className="input min-h-[96px]" maxLength={400} value={comment} onChange={(e) => setComment(e.target.value)}
                placeholder="Share what you actually experienced (10-400 characters)" aria-label="Your review" />
      {error && <p className="err-text" role="alert">{error}</p>}
      <button className="btn-primary self-start" disabled={post.isPending}>{post.isPending ? 'Posting...' : 'Post review'}</button>
      <p className="text-xs text-ink-soft">One review per shop. Reviews can&apos;t be edited or removed, so keep it honest.</p>
    </form>
  );
}
