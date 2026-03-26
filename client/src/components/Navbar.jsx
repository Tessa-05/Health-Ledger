import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const links = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/logs', label: 'Logs' },
    { to: '/doctor', label: 'AI Doctor' },
    { to: '/manual', label: 'Symptoms' },
  ];

  return (
    <nav className="navbar">
      <div className="nav-brand" onClick={() => navigate('/dashboard')}>
        <span className="nav-icon">+</span> Health Ledger
      </div>
      <div className="nav-links">
        {links.map((l) => (
          <button key={l.to} className={'nav-btn' + (location.pathname === l.to ? ' active' : '')} onClick={() => navigate(l.to)}>
            {l.label}
          </button>
        ))}
      </div>
      <div className="nav-profile">
        <button className="avatar" onClick={() => setOpen(!open)}>
          {user?.name?.charAt(0).toUpperCase() || '?'}
        </button>
        {open && (
          <div className="dropdown">
            <div className="dropdown-name">{user?.name}</div>
            <div className="dropdown-email">{user?.email}</div>
            <hr />
            <button onClick={() => { logout(); navigate('/login'); }}>Logout</button>
          </div>
        )}
      </div>
    </nav>
  );
}
