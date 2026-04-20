// src/sections/SettingsSection.jsx
export default function SettingsSection({ user }) {
  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">⚙️ Settings</div>
          <div className="page-subtitle">System configuration and preferences</div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        {/* Account info */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">👤 Admin Account</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:20 }}>
            <div style={{ width:52, height:52, borderRadius:'50%', background:'var(--teal)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem', fontWeight:800, color:'#fff', flexShrink:0 }}>
              {(user?.email||'HQ').slice(0,2).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight:700, fontSize:'1rem', color:'var(--text-primary)' }}>{user?.displayName || 'HQ Administrator'}</div>
              <div style={{ fontSize:'0.78rem', color:'var(--text-muted)', marginTop:2 }}>{user?.email || '—'}</div>
              <div style={{ fontSize:'0.72rem', color:'var(--teal-light)', marginTop:4 }}>Super Admin · HQ Tarawa</div>
            </div>
          </div>
        </div>

        {/* System info */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">🔥 Firebase Connection</div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {[
              ['Project ID',   'kcdl-1063a'],
              ['Auth Domain',  'kcdl-1063a.firebaseapp.com'],
              ['Storage',      'kcdl-1063a.firebasestorage.app'],
              ['Offline Mode', 'Enabled (Persistent Cache)'],
            ].map(([k,v]) => (
              <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:'0.82rem', padding:'6px 0', borderBottom:'1px solid var(--border)' }}>
                <span style={{ color:'var(--text-muted)' }}>{k}</span>
                <span style={{ color:'var(--text-primary)', fontFamily:'var(--font-mono)', fontSize:'0.78rem' }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop:12, display:'flex', alignItems:'center', gap:8 }}>
            <div className="live-dot" />
            <span style={{ fontSize:'0.75rem', color:'var(--green)', fontWeight:600 }}>Connected to Firebase</span>
          </div>
        </div>

        {/* App info */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">ℹ️ Application Info</div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {[
              ['App Name',    'KCDL Admin'],
              ['Organisation','Kiribati Copra Development Ltd'],
              ['HQ Location', 'Tarawa, Kiribati'],
              ['Version',     '1.0.0'],
              ['Framework',   'React 18 + Vite 5'],
              ['Platform',    'Capacitor 6 (Android) + Electron 32'],
              ['Database',    'Firebase Firestore'],
            ].map(([k,v]) => (
              <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:'0.82rem', padding:'5px 0', borderBottom:'1px solid var(--border)' }}>
                <span style={{ color:'var(--text-muted)' }}>{k}</span>
                <span style={{ color:'var(--text-primary)' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick links */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">🔗 Quick Links</div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {[
              ['🔥 Firebase Console',    'https://console.firebase.google.com/project/kcdl-1063a'],
              ['📊 Firestore Database',  'https://console.firebase.google.com/project/kcdl-1063a/firestore'],
              ['👥 Firebase Auth',       'https://console.firebase.google.com/project/kcdl-1063a/authentication/users'],
              ['☁️ Firebase Storage',    'https://console.firebase.google.com/project/kcdl-1063a/storage'],
            ].map(([label, url]) => (
              <a key={label} href={url} target="_blank" rel="noopener noreferrer"
                style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderRadius:8, color:'var(--teal-light)', fontSize:'0.82rem', textDecoration:'none', background:'var(--navy)', transition:'background 0.15s' }}
                onMouseEnter={e=>e.currentTarget.style.background='var(--navy-hover)'}
                onMouseLeave={e=>e.currentTarget.style.background='var(--navy)'}
              >
                {label} <span style={{ marginLeft:'auto', fontSize:'0.7rem', opacity:0.6 }}>↗</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
