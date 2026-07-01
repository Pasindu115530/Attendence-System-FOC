'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api';
import { setUser, getUser, isAdmin } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const u = getUser();
    if (u && isAdmin(u)) router.replace('/admin/dashboard');
  }, [router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await apiPost('login', { username, password });
    setLoading(false);
    if (result.status === 'success') {
      setUser(result.data);
      if (isAdmin(result.data)) {
        router.replace('/admin/dashboard');
      } else {
        setError('Access denied. Admin or Lecturer role required.');
      }
    } else {
      setError(result.message || 'Invalid credentials');
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">🎓</div>
          <div className="login-title">FOC Attendance System</div>
          <div className="login-subtitle">Admin Portal — Faculty of Computing</div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>User ID</label>
            <input
              type="text"
              placeholder="e.g. admin or L001"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
          </div>
          <div className="form-group">
            <label>Password (NIC)</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: '0.5rem' }} disabled={loading}>
            {loading ? <><span className="spinner" /> Signing in...</> : '→ Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
