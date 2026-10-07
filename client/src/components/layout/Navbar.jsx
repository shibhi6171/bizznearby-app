import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import Logo from '../ui/Logo.jsx';

const link = ({ isActive }) => `font-semibold transition ${isActive ? 'text-brand-green' : 'text-ink-soft hover:text-ink'}`;

export default function Navbar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const isSeller = user?.role === 'seller';

  return (
    <header className="sticky top-0 z-20 border-b border-ink-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-4">
        <Link to="/explore" aria-label="BizzNearby home"><Logo /></Link>
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-1" aria-label="Main">
          <NavLink to="/explore" className={link}>Explore</NavLink>
          <NavLink to="/reviews" className={link}>Reviews</NavLink>
          {isSeller && <NavLink to="/leads" className={link}>Leads</NavLink>}
          <NavLink to={isSeller ? '/dashboard' : '/login/seller'} className={link}>Sell</NavLink>
          {user ? (
            <span className="flex items-center gap-3">
              <span className="text-sm font-semibold">{user.name.split(' ')[0]}</span>
              <button className="btn !px-3 !py-1.5 text-sm" onClick={() => { logout(); nav('/explore'); }} aria-label="Sign out">
                <LogOut size={15} /> Sign out
              </button>
            </span>
          ) : (
            <NavLink to="/login/customer" className={link}>Login</NavLink>
          )}
        </nav>
      </div>
    </header>
  );
}
