import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { hasSeenWelcome } from '../../utils/welcome.js';
import Navbar from './Navbar.jsx';
import Spinner from '../ui/Spinner.jsx';

// Wraps every page. First visit of a session goes through the welcome screens.
export default function Shell() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user && !hasSeenWelcome()) return <Navigate to="/welcome" replace />;
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="anim-fade mx-auto w-full max-w-6xl flex-1 px-5 py-10"><Outlet /></main>
      <footer className="border-t border-ink-line py-6 text-center text-sm text-ink-soft">
        BizzNearby - every business around the corner. Map data &copy; OpenStreetMap contributors.
      </footer>
    </div>
  );
}
