import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginUser, registerUser } from '../services/api';

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', age: '', gender: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { saveLogin } = useAuth();
  const navigate = useNavigate();

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      if (isRegister) {
        await registerUser({ ...form, age: form.age ? Number(form.age) : undefined });
        setSuccess('Account created. Please log in.');
        setIsRegister(false);
      } else {
        const data = await loginUser(form.email, form.password);
        saveLogin(data);
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = () => {
    window.location.href = 'http://localhost:5000/api/auth/google';
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-icon">+</div>
          <h1>Health Ledger</h1>
          <p>AI-Assisted Health Monitoring</p>
        </div>

        <form onSubmit={submit}>
          <h2>{isRegister ? 'Create Account' : 'Sign In'}</h2>

          {isRegister && (
            <>
              <div className="field">
                <label>Full Name</label>
                <input name="name" value={form.name} onChange={update} placeholder="John Doe" required />
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Age</label>
                  <input name="age" type="number" value={form.age} onChange={update} placeholder="25" />
                </div>
                <div className="field">
                  <label>Gender</label>
                  <select name="gender" value={form.gender} onChange={update}>
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </>
          )}

          <div className="field">
            <label>Email</label>
            <input name="email" type="email" value={form.email} onChange={update} placeholder="you@example.com" required />
          </div>
          <div className="field">
            <label>Password</label>
            <input name="password" type="password" value={form.password} onChange={update} placeholder="••••••••" required minLength={6} />
          </div>

          {error && <div className="msg msg-error">{error}</div>}
          {success && <div className="msg msg-success">{success}</div>}

          <button type="submit" className="btn btn-blue" disabled={loading}>
            {loading ? 'Please wait...' : isRegister ? 'Create Account' : 'Sign In'}
          </button>

          <div className="divider"><span>or</span></div>

          <button type="button" className="btn btn-google" onClick={googleLogin}>
            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
            Sign in with Google
          </button>

          <p className="toggle">
            {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
            <span onClick={() => { setIsRegister(!isRegister); setError(''); setSuccess(''); }}>
              {isRegister ? 'Sign In' : 'Create Account'}
            </span>
          </p>
        </form>
      </div>
    </div>
  );
}
