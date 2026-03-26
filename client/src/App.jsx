import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import LogsPage from './pages/LogsPage';
import DoctorPage from './pages/DoctorPage';
import ManualInputPage from './pages/ManualInputPage';

function Guard({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="center">Loading...</div>;
  return user ? children : <Navigate to="/login" />;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <div className="center">Loading...</div>;

  return (
    <>
      {user && <Navbar />}
      <div className={user ? 'container' : ''}>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage />} />
          <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} />} />
          <Route path="/dashboard" element={<Guard><Dashboard /></Guard>} />
          <Route path="/logs" element={<Guard><LogsPage /></Guard>} />
          <Route path="/doctor" element={<Guard><DoctorPage /></Guard>} />
          <Route path="/manual" element={<Guard><ManualInputPage /></Guard>} />
        </Routes>
      </div>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
