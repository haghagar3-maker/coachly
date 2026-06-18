import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Store from './pages/Store';
import CoachOnboarding from './pages/CoachOnboarding';
import CoachLogin from './pages/CoachLogin';
import CoachDashboard from './pages/CoachDashboard';
import UserDashboard from './pages/UserDashboard';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import UserLogin from './pages/UserLogin';

function getToken() {
  return localStorage.getItem('coachly_token');
}

function getAdminToken() {
  return localStorage.getItem('coachly_admin_token');
}

function getTokenType() {
  try {
    const raw = localStorage.getItem('coachly_token_type');
    return raw || null;
  } catch {
    return null;
  }
}

function RequireCoach({ children }) {
  const token = getToken();
  const type = getTokenType();
  const location = useLocation();
  if (!token || type !== 'coach') {
    return <Navigate to="/coach/login" state={{ from: location }} replace />;
  }
  return children;
}

function RequireUser({ children }) {
  const token = getToken();
  const type = getTokenType();
  const location = useLocation();
  if (!token || type !== 'user') {
    return <Navigate to="/" state={{ from: location }} replace />;
  }
  return children;
}

function RequireAdmin({ children }) {
  const token = getAdminToken();
  const location = useLocation();
  if (!token) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/coach/signup" element={<CoachOnboarding />} />
        <Route path="/coach/login" element={<CoachLogin />} />
        <Route path="/user/login" element={<UserLogin />} />
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Coach store — public, must come after /coach/signup and /coach/login */}
        <Route path="/coach/:id" element={<Store />} />
        <Route path="/c/:slug" element={<Store />} />

        {/* Protected — coach */}
        <Route
          path="/coach/dashboard"
          element={
            <RequireCoach>
              <CoachDashboard />
            </RequireCoach>
          }
        />

        {/* Protected — user */}
        <Route
          path="/dashboard"
          element={
            <RequireUser>
              <UserDashboard />
            </RequireUser>
          }
        />

        {/* Protected — admin */}
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminDashboard />
            </RequireAdmin>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
