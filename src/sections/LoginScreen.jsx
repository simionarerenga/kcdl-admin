// src/sections/LoginScreen.jsx
import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

export default function LoginScreen() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [showPw,   setShowPw]   = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    if (!email.trim() || !password) { setError('Please enter your email and password.'); return; }
    setError(''); setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      const msgs = {
        'auth/user-not-found':    'No account found with this email.',
        'auth/wrong-password':    'Incorrect password.',
        'auth/invalid-email':     'Invalid email address.',
        'auth/too-many-requests': 'Too many attempts — try again later.',
        'auth/invalid-credential':'Invalid email or password.',
      };
      setError(msgs[err.code] || `Sign-in failed: ${err.message}`);
    } finally { setLoading(false); }
  }

  return (
    <div className="login-page">
      <div className="login-bg-circle login-bg-circle-1" />
      <div className="login-bg-circle login-bg-circle-2" />

      <div className="login-card">
        <div className="login-header">
          <img src="./img/icon_bg.png" alt="KCDL" className="login-logo"
            onError={e => { e.target.style.display='none'; }} />
          <div className="login-title">KCDL Admin</div>
          <div className="login-sub">
            Kiribati Copra Development Ltd<br />
            HQ Tarawa · Operations Dashboard
          </div>
        </div>

        {error && (
          <div className="flash-bar flash-error" style={{ marginBottom: 16 }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              placeholder="admin@kcdl.ki"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 24 }}>
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={loading}
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                style={{
                  position: 'absolute', right: 12, top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '0.85rem', color: 'var(--text-muted)',
                }}
              >{showPw ? '🙈' : '👁️'}</button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '11px 0', fontSize: '0.95rem' }}
            disabled={loading}
          >
            {loading ? '🔄 Signing in…' : '🔐 Sign In to Admin'}
          </button>
        </form>

        <div className="login-security-note">
          🔒 This portal is restricted to authorised HQ staff only. Unauthorised access is prohibited and may be prosecuted under the laws of Kiribati.
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          KCDL Copra Operations Platform · v1.0
        </div>
      </div>
    </div>
  );
}
