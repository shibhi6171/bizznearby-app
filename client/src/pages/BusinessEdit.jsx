import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/api.js';
import BusinessForm from '../components/business/BusinessForm.jsx';
import DealManager from '../components/deals/DealManager.jsx';
import Spinner, { ErrorNote } from '../components/ui/Spinner.jsx';

// /dashboard/new creates a listing; /dashboard/:id edits one and manages its deals.
export default function BusinessEdit() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const creating = !id;
  const { data: b, isLoading, error, refetch } = useQuery({ queryKey: ['business', id], queryFn: () => api.business(id), enabled: !creating });

  const back = <Link to="/dashboard" className="mb-4 inline-block font-bold text-brand-green hover:underline">&larr; All businesses</Link>;
  const refresh = () => { qc.invalidateQueries({ queryKey: ['mine'] }); qc.invalidateQueries({ queryKey: ['business', id] }); refetch(); };

  if (creating) {
    return (
      <div>{back}<h1 className="mb-6 text-4xl font-extrabold tracking-tighter">List your business</h1>
        <BusinessForm onSaved={(saved) => { qc.invalidateQueries({ queryKey: ['mine'] }); nav(`/dashboard/${saved.id}`, { replace: true }); }} /></div>
    );
  }
  if (isLoading) return <Spinner />;
  if (error) return <div>{back}<ErrorNote error={error} /></div>;
  if (!b.isOwner) return <div>{back}<ErrorNote error={{ message: 'You can only manage your own businesses.' }} /></div>;

  return (
    <div>
      {back}
      <h1 className="mb-6 text-4xl font-extrabold tracking-tighter">{b.name}</h1>
      <BusinessForm key={b.images.length} business={b} onSaved={refresh} />
      <div className="mt-8"><DealManager business={b} onChanged={refresh} /></div>
    </div>
  );
}
