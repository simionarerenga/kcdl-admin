// src/App.jsx
import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

import TopBar        from './components/TopBar';
import LoginScreen   from './sections/LoginScreen';
import Dashboard     from './sections/Dashboard';
import LiveActivity  from './sections/LiveActivity';
import CPRMonitor    from './sections/CPRMonitor';
import TWCMonitor    from './sections/TWCMonitor';
import ShedWarehouseMonitor from './sections/ShedWarehouseMonitor';
import ShipmentsMonitor     from './sections/ShipmentsMonitor';
import FarmersMonitor       from './sections/FarmersMonitor';
import ReportsCentre        from './sections/ReportsCentre';
import Analytics     from './sections/Analytics';
import StationsManager      from './sections/StationsManager';
import UserManagement       from './sections/UserManagement';
import SettingsSection      from './sections/SettingsSection';

const SECTIONS = [
  {
    group: 'Overview',
    items: [
      { id: 'dashboard', icon: '📊', label: 'Dashboard',     desc: 'Live KPIs, island weights & recent activity' },
      { id: 'activity',  icon: '⚡', label: 'Live Activity', desc: 'Real-time feed of all operations' },
    ],
  },
  {
    group: 'Field Data',
    items: [
      { id: 'cpr',       icon: '📋', label: 'CPR Records',       desc: 'Copra Purchase Records — search & export' },
      { id: 'twc',       icon: '🚢', label: 'TWC Records',       desc: 'Transport Weighing Certificates' },
      { id: 'shedstock', icon: '📦', label: 'Shed & Warehouse',  desc: 'Bag inventory by stage and station' },
      { id: 'shipments', icon: '🛳️', label: 'Shipments',         desc: 'Ready-to-ship & shipped bag manifests' },
      { id: 'farmers',   icon: '👩‍🌾', label: 'Farmers Registry', desc: 'Registered farmer profiles & search' },
    ],
  },
  {
    group: 'Reports',
    items: [
      { id: 'reports',   icon: '📑', label: 'Reports Centre', desc: 'Generate, preview & print all reports' },
      { id: 'analytics', icon: '📈', label: 'Analytics',      desc: 'Charts & production trend breakdowns' },
    ],
  },
  {
    group: 'Admin',
    items: [
      { id: 'stations',  icon: '🏝️', label: 'Stations',        desc: 'Field station registry & details' },
      { id: 'users',     icon: '👤', label: 'User Management', desc: 'Inspector accounts & access roles' },
      { id: 'settings',  icon: '⚙️', label: 'Settings',        desc: 'System info & account details' },
    ],
  },
];

const SECTION_MAP = {
  dashboard: Dashboard,
  activity:  LiveActivity,
  cpr:       CPRMonitor,
  twc:       TWCMonitor,
  shedstock: ShedWarehouseMonitor,
  shipments: ShipmentsMonitor,
  farmers:   FarmersMonitor,
  reports:   ReportsCentre,
  analytics: Analytics,
  stations:  StationsManager,
  users:     UserManagement,
  settings:  SettingsSection,
};

const SECTION_LABEL = {};
SECTIONS.forEach(g => g.items.forEach(i => { SECTION_LABEL[i.id] = { label: i.label, icon: i.icon }; }));

/* ── Access Denied ── */
function AccessDenied({ email, onSignOut }) {
  return (
    <div className="login-page">
      <div className="login-bg-circle login-bg-circle-1" />
      <div className="login-card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔒</div>
        <div className="login-title" style={{ fontSize: '1.3rem' }}>Access Denied</div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.7, margin: '12px 0 24px' }}>
          <strong style={{ color: 'var(--text-primary)' }}>{email}</strong> does not have admin access. Contact your HQ administrator.
        </p>
        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={onSignOut} type="button">
          Sign Out
        </button>
      </div>
    </div>
  );
}

/* ── Home Screen ── */
function HomeScreen({ onNavigate, email }) {
  const initials = (email || 'HQ').slice(0, 2).toUpperCase();
  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  })();
  const dateStr = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="home-screen">
      {/* Hero */}
      <div className="home-hero">
        <div className="home-hero-avatar">{initials}</div>
        <div>
          <div className="home-hero-greeting">{greeting}</div>
          <div className="home-hero-title">KCDL Admin Portal</div>
          <div className="home-hero-date">{dateStr} · HQ Tarawa</div>
        </div>
        <div className="dashboard-live-badge" style={{ marginLeft: 'auto' }}>
          <div className="live-dot" />
          Live · Firebase
        </div>
      </div>

      {/* Section groups */}
      {SECTIONS.map(group => (
        <div key={group.group} className="home-group">
          <div className="home-group-label">{group.group}</div>
          <div className="home-tiles">
            {group.items.map(item => (
              <button
                key={item.id}
                type="button"
                className="home-tile"
                onClick={() => onNavigate(item.id)}
              >
                <div className="home-tile-icon">{item.icon}</div>
                <div className="home-tile-label">{item.label}</div>
                <div className="home-tile-desc">{item.desc}</div>
                <div className="home-tile-arrow">›</div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════
   Main App
═══════════════════════════════════════ */
export default function App() {
  const [user,         setUser]         = useState(undefined);
  const [profile,      setProfile]      = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [section,      setSection]      = useState(null); // null = home
  const [authError,    setAuthError]    = useState('');

  useEffect(() => {
    return onAuthStateChanged(auth, async firebaseUser => {
      setAuthError('');
      setAccessDenied(false);
      if (firebaseUser) {
        try {
          const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (snap.exists()) {
            const p = snap.data();
            if (p.role === 'admin' || p.role === 'hq' || !p.role) {
              setProfile(p); setUser(firebaseUser);
            } else {
              setUser(firebaseUser); setAccessDenied(true);
            }
          } else {
            setProfile(null); setUser(firebaseUser);
          }
        } catch (e) {
          setAuthError(e.message); setUser(firebaseUser);
        }
      } else {
        setUser(null); setProfile(null); setAccessDenied(false);
      }
    });
  }, []);

  async function handleSignOut() {
    await signOut(auth);
    setSection(null);
    setProfile(null);
    setAccessDenied(false);
  }

  function navigate(id) { setSection(id || null); }

  /* Gates */
  if (user === undefined) {
    return (
      <div className="splash-screen">
        <img src="./icon_bg.png" alt="KCDL" className="splash-logo"
          onError={e => { e.target.style.display = 'none'; }} />
        <p className="splash-text">KCDL Admin · Loading…</p>
      </div>
    );
  }

  if (!user)         return <LoginScreen />;
  if (accessDenied)  return <AccessDenied email={user.email} onSignOut={handleSignOut} />;

  const SectionComp = section ? SECTION_MAP[section] : null;
  const sectionMeta = section ? SECTION_LABEL[section] : null;

  return (
    <div className="app-shell">
      <TopBar
        sectionMeta={sectionMeta}
        onGoHome={() => setSection(null)}
        onSignOut={handleSignOut}
        email={user.email}
      />

      {authError && (
        <div className="flash-bar flash-warn" style={{ margin: '0 24px', borderRadius: 0 }}>
          ⚠️ Profile load error — some features may be limited: {authError}
        </div>
      )}

      <div className="page-body">
        {SectionComp ? (
          <SectionComp
            onNavigate={navigate}
            user={user}
            profile={profile}
          />
        ) : (
          <HomeScreen onNavigate={navigate} email={user.email} />
        )}
      </div>
    </div>
  );
}
