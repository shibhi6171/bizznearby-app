import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Clock, Globe, MapPin, MessageCircle, Navigation, Pencil, Phone, Star } from 'lucide-react';
import { api } from '../api/api.js';
import ImageGallery from '../components/business/ImageGallery.jsx';
import MapView from '../components/map/MapView.jsx';
import ReviewForm from '../components/reviews/ReviewForm.jsx';
import ReviewList from '../components/reviews/ReviewList.jsx';
import Spinner, { ErrorNote } from '../components/ui/Spinner.jsx';
import { digits, fmtDateTime, fmtRating, mapsDirections, mapsView, thumb, todaysHours } from '../utils/format.js';

export default function BusinessDetails() {
  const { id } = useParams();
  const { data: b, isLoading, error } = useQuery({ queryKey: ['business', id], queryFn: () => api.business(id) });
  const { data: rv } = useQuery({ queryKey: ['reviews', id], queryFn: () => api.reviews({ businessId: id, limit: 10 }) });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorNote error={error} />;

  const hours = todaysHours(b.opening_hours);
  const wa = digits(b.whatsapp || b.phone);
  const lead = (type) => () => api.addLead(b.id, type);
  const A = ({ href, type, icon: Icon, children, primary }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" onClick={lead(type)} className={primary ? 'btn-primary' : 'btn'}><Icon size={16} /> {children}</a>
  );

  return (
    <article className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
      <div>
        <ImageGallery images={b.images} name={b.name} />
        <section className="panel mt-8" aria-label="Reviews">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-xl font-extrabold tracking-tight">Customer reviews</h2>
            <Link className="text-sm font-bold text-brand-green hover:underline" to={`/reviews?business=${b.id}`}>See all</Link>
          </div>
          <ReviewList reviews={rv?.reviews || []} />
          <div className="mt-6 border-t border-ink-line pt-5"><h3 className="mb-3 font-bold">Write a review</h3><ReviewForm businessId={b.id} /></div>
        </section>
      </div>

      <div className="grid content-start gap-6">
        <div>
          <p className="text-sm font-semibold text-brand-green">{b.category?.name}</p>
          <h1 className="text-3xl font-extrabold tracking-tighter">{b.name}</h1>
          <Link to={`/reviews?business=${b.id}`} className="mt-1 inline-flex items-center gap-1.5 text-ink-soft hover:underline">
            <Star size={16} className="fill-brand-deal text-brand-deal" /> {fmtRating(b.avg_rating)} ({b.review_count} {b.review_count === 1 ? 'review' : 'reviews'})
          </Link>
          {b.description && <p className="mt-3">{b.description}</p>}
          <ul className="mt-4 grid gap-1.5 text-sm text-ink-soft">
            <li className="flex gap-2"><MapPin size={16} className="mt-0.5 flex-none" /> {b.address}</li>
            {hours && <li className="flex gap-2"><Clock size={16} className="mt-0.5 flex-none" /> Today: {hours}</li>}
          </ul>
        </div>

        {b.deals.length > 0 && (
          <div className="grid gap-3">
            {b.deals.map((d) => (
              <div key={d.id} className="overflow-hidden rounded-2xl bg-brand-deal text-amber-950">
                {d.banner_url && <img src={thumb(d.banner_url, 700)} alt="" className="h-28 w-full object-cover" />}
                <div className="p-4"><p className="font-extrabold">{d.discount_percent}% off &middot; {d.title}</p>
                  {d.description && <p className="text-sm">{d.description}</p>}
                  <p className="text-xs opacity-80">Until {fmtDateTime(d.expires_at)}</p></div>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2.5">
          <A primary href={mapsDirections(b.latitude, b.longitude)} type="directions" icon={Navigation}>Get directions</A>
          <A href={mapsView(b.latitude, b.longitude)} type="directions" icon={MapPin}>View on Google Maps</A>
          {b.phone && <A href={`tel:${b.phone}`} type="call" icon={Phone}>Call</A>}
          {wa && <A href={`https://wa.me/${wa}`} type="whatsapp" icon={MessageCircle}>WhatsApp</A>}
          {b.website && <A href={b.website} type="website" icon={Globe}>Website</A>}
          {b.isOwner && <Link to={`/dashboard/${b.id}`} className="btn"><Pencil size={16} /> Manage listing</Link>}
        </div>

        <MapView center={{ lat: b.latitude, lng: b.longitude }} radiusKm={0.6} items={[{ ...b, distance_meters: null }]} height="280px" showCenter={false} link={false} />
      </div>
    </article>
  );
}
