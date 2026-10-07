import { Loader2 } from 'lucide-react';

export default function Spinner({ label = 'Loading...' }) {
  return (
    <div className="grid place-items-center gap-2 py-16 text-ink-soft" role="status">
      <Loader2 className="animate-spin text-brand-green" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export const ErrorNote = ({ error }) => (
  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-brand-red" role="alert">
    {error?.message || 'Something went wrong.'}
  </div>
);
