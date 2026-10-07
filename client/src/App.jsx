import { Route, Routes, Navigate } from 'react-router-dom';
import Shell from './components/layout/Shell.jsx';
import ProtectedRoute from './components/layout/ProtectedRoute.jsx';
import Welcome from './pages/Welcome.jsx';
import Explore from './pages/Explore.jsx';
import BusinessDetails from './pages/BusinessDetails.jsx';
import Reviews from './pages/Reviews.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import BusinessEdit from './pages/BusinessEdit.jsx';
import Leads from './pages/Leads.jsx';
import NotFound from './pages/NotFound.jsx';

const seller = (el) => <ProtectedRoute role="seller">{el}</ProtectedRoute>;

export default function App() {
  return (
    <Routes>
      <Route path="/welcome" element={<Welcome />} />
      <Route element={<Shell />}>
        <Route index element={<Navigate to="/explore" replace />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/business/:id" element={<BusinessDetails />} />
        <Route path="/reviews" element={<Reviews />} />
        <Route path="/login/:role" element={<Login />} />
        <Route path="/dashboard" element={seller(<Dashboard />)} />
        <Route path="/dashboard/new" element={seller(<BusinessEdit />)} />
        <Route path="/dashboard/:id" element={seller(<BusinessEdit />)} />
        <Route path="/leads" element={seller(<Leads />)} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
