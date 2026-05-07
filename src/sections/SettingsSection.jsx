// src/sections/SettingsSection.jsx
import { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAppData } from '../context/AppDataContext';

const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';

export default function SettingsSection({ user }) {
  const { pricing, currentPrice } = useAppData();
  const [newPrice, setNewPrice]   = useState('');
  const [currency, setCurrency]   = useState('AUD');
  const [saving,   setSaving]     = useState(false);
  const [pMsg,     setPMsg]       = useState('');

  async function handleSetPrice() {
    const val = parseFloat(newPrice);
    if (!val || val <= 0) { setPMsg('⚠️ Enter a valid price.'); return; }
    setSaving(true);
    try {
      await addDoc(collection(db, 'pricing'), {
        pricePerKg:    val,
        currency:      currency,
        effectiveDate: new Date().toISOString().slice(0, 10),
        setBy:         user?.email || 'admin',
        setAt:         new Date().toISOString(),
      });
      setNewPrice('');
      setPMsg('✅ Price updated successfully.');
      setTimeout(() => setPMsg(''), 4000);
    } catch(e) { setPMsg('❌ ' + e.message); }
    finally { setSaving(false); }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">⚙️ Settings</div>
          <div className="page-subtitle">System configuration and preferences</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Account info */}
        <div className="card" style={{ overflowX: 'auto' }}>
          <div className="card-header">
            <div className="card-title">👤 Admin Account</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, minWidth: 280 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 800, color: '#fff', flexShrink: 0 }}>
              {(user?.email || 'HQ').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{user?.displayName || 'HQ Administrator'}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{user?.email || '—'}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--teal-light)', marginTop: 4 }}>Super Admin · HQ Tarawa</div>
            </div>
          </div>
        </div>

        {/* System info */}
        <div className="card" style={{ overflowX: 'auto' }}>
          <div className="card-header">
            <div className="card-title">🔥 Firebase Connection</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 280 }}>
            {[
              ['Project ID',   'kcdl-1063a'],
              ['Auth Domain',  'kcdl-1063a.firebaseapp.com'],
              ['Storage',      'kcdl-1063a.firebasestorage.app'],
              ['Offline Mode', 'Enabled (Persistent Cache)'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', padding: '6px 0', borderBottom: '1px solid var(--border)', gap: 12 }}>
                <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{k}</span>
                <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', textAlign: 'right', wordBreak: 'break-all' }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="live-dot" />
            <span style={{ fontSize: '0.75rem', color: 'var(--green)', fontWeight: 600 }}>Connected to Firebase</span>
          </div>
        </div>

        {/* App info */}
        <div className="card" style={{ overflowX: 'auto' }}>
          <div className="card-header">
            <div className="card-title">ℹ️ Application Info</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 280 }}>
            {[
              ['App Name',     'KCDL Admin'],
              ['Organisation', 'Kiribati Copra Development Ltd'],
              ['HQ Location',  'Tarawa, Kiribati'],
              ['Version',      '1.0.0'],
              ['Framework',    'React 18 + Vite 5'],
              ['Platform',     'Capacitor 6 (Android) + Electron 32'],
              ['Database',     'Firebase Firestore'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', padding: '5px 0', borderBottom: '1px solid var(--border)', gap: 12 }}>
                <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{k}</span>
                <span style={{ color: 'var(--text-primary)', textAlign: 'right' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>


        {/* Phase 2A: Copra Price Setting */}
        <div className="card" style={{ overflowX: 'auto' }}>
          <div className="card-header">
            <div className="card-title">💰 Copra Price per kg</div>
          </div>

          {pMsg && (
            <div className={`flash-bar ${pMsg.startsWith('✅') ? 'flash-success' : 'flash-warn'}`}
              style={{ marginBottom: 12 }}>{pMsg}</div>
          )}

          {/* Current price */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, padding: '12px 14px', background: 'var(--navy)', borderRadius: 8 }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Current Price</div>
              {currentPrice
                ? <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--gold)', fontFamily: 'var(--font-mono)' }}>
                    {currentPrice.pricePerKg.toFixed(4)} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{currentPrice.currency}/kg</span>
                  </div>
                : <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Not yet set</div>
              }
              {currentPrice && (
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Set on {currentPrice.effectiveDate} by {currentPrice.setBy}
                </div>
              )}
            </div>
          </div>

          {/* Set new price */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 120 }}>
              <label className="form-label" style={{ marginBottom: 6 }}>New Price per kg</label>
              <input className="form-input" type="number" step="0.0001" min="0"
                value={newPrice} onChange={e => setNewPrice(e.target.value)}
                placeholder="e.g. 0.8500" />
            </div>
            <div style={{ width: 90 }}>
              <label className="form-label" style={{ marginBottom: 6 }}>Currency</label>
              <select className="form-select" value={currency} onChange={e => setCurrency(e.target.value)}>
                <option value="AUD">AUD</option>
                <option value="USD">USD</option>
                <option value="NZD">NZD</option>
                <option value="KID">KID</option>
              </select>
            </div>
            <button className="btn btn-primary" onClick={handleSetPrice} disabled={saving} type="button" style={{ height: 38 }}>
              {saving ? '…Saving' : 'Set Price'}
            </button>
          </div>

          {/* Price history */}
          {pricing.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Price History</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                {pricing.slice(0, 5).map((p, i) => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 12px', fontSize: '0.8rem', background: i === 0 ? 'var(--navy)' : 'none', borderBottom: i < pricing.slice(0,5).length-1 ? '1px solid var(--border-dim)' : 'none' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{p.effectiveDate}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: i === 0 ? 'var(--gold)' : 'var(--text-secondary)', fontWeight: i === 0 ? 700 : 400 }}>
                      {p.pricePerKg.toFixed(4)} {p.currency}/kg
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{p.setBy}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick links */}
        <div className="card" style={{ overflowX: 'auto' }}>
          <div className="card-header">
            <div className="card-title">🔗 Quick Links</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 280 }}>
            {[
              ['🔥 Firebase Console',   'https://console.firebase.google.com/project/kcdl-1063a'],
              ['📊 Firestore Database', 'https://console.firebase.google.com/project/kcdl-1063a/firestore'],
              ['👥 Firebase Auth',      'https://console.firebase.google.com/project/kcdl-1063a/authentication/users'],
              ['☁️ Firebase Storage',   'https://console.firebase.google.com/project/kcdl-1063a/storage'],
            ].map(([label, url]) => (
              <a key={label} href={url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, color: 'var(--teal-light)', fontSize: '0.82rem', textDecoration: 'none', background: 'var(--navy)', transition: 'background 0.15s', whiteSpace: 'nowrap' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--navy-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--navy)'}
              >
                {label} <span style={{ marginLeft: 'auto', fontSize: '0.7rem', opacity: 0.6 }}>↗</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
