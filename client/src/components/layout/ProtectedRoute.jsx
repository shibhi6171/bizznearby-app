import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import Spinner from '../ui/Spinner.jsx';

export default function ProtectedRoute({ role, children }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to={`/login/${role || 'customer'}`} state={{ from: loc.pathname }} replace />;
  if (role && user.role !== role) return <Navigate to="/explore" replace />;
  return children;
}
