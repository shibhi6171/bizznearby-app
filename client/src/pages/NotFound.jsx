import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="py-24 text-center">
      <h1 className="text-5xl font-extrabold tracking-tighter">404</h1>
      <p className="mb-6 mt-2 text-ink-soft">That page wandered off. Let&apos;s get you back to the neighbourhood.</p>
      <Link to="/explore" className="btn-primary">Explore nearby</Link>
    </div>
  );
}
