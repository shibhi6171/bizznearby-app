import { useQuery } from '@tanstack/react-query';
import { MapPin, MessageCircle, Phone, Globe } from 'lucide-react';
import { api } from '../api/api.js';
import Spinner, { ErrorNote } from '../components/ui/Spinner.jsx';
import { fmtDateTime } from '../utils/format.js';

const META = {
  call: { icon: Phone, text: 'tapped Call on' },
  whatsapp: { icon: MessageCircle, text: 'tapped WhatsApp on' },
  directions: { icon: MapPin, text: 'asked for directions to' },
  website: { icon: Globe, text: 'opened the website of' },
};

export default function Leads() {
  const { data, isLoading, error } = useQuery({ queryKey: ['leads'], queryFn: api.myLeads });
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-4xl font-extrabold tracking-tighter">Leads</h1>
      <p className="mb-6 mt-2 text-ink-soft">Customers who tapped Call, WhatsApp, Directions or Website on your listings.</p>
      <div className="panel">
        {isLoading ? <Spinner /> : error ? <ErrorNote error={error} /> : data.length === 0 ? (
          <p className="text-ink-soft">No leads yet. They appear here when customers contact your shops.</p>
        ) : (
          <ul className="divide-y divide-ink-line">
            {data.map((l) => { const { icon: Icon, text } = META[l.type]; return (
              <li key={l.id} className="flex items-center gap-3 py-3">
                <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-green-50 text-brand-green"><Icon size={18} /></span>
                <p className="flex-1"><b>{l.customer}</b> {text} <b>{l.businessName}</b></p>
                <span className="text-sm text-ink-soft">{fmtDateTime(l.createdAt)}</span>
              </li>
            ); })}
          </ul>
        )}
      </div>
    </div>
  );
}
