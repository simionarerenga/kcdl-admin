// src/App.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

import TopBar               from './components/TopBar';
import LoginScreen          from './sections/LoginScreen';
import Dashboard            from './sections/Dashboard';
import LiveActivity         from './sections/LiveActivity';
import CPRMonitor           from './sections/CPRMonitor';
import TWCMonitor           from './sections/TWCMonitor';
import ShedWarehouseMonitor from './sections/ShedWarehouseMonitor';
import ShipmentsMonitor     from './sections/ShipmentsMonitor';
import FarmersMonitor       from './sections/FarmersMonitor';
import ReportsCentre        from './sections/ReportsCentre';
import Analytics            from './sections/Analytics';
import StationsManager      from './sections/StationsManager';
import UserManagement       from './sections/UserManagement';
import SettingsSection      from './sections/SettingsSection';

export const SECTIONS = [
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
      { id: 'stations', icon: '🏝️', label: 'Stations',        desc: 'Field station & cooperative registry' },
      { id: 'users',    icon: '👤', label: 'User Management', desc: 'Inspector accounts & access roles' },
      { id: 'settings', icon: '⚙️', label: 'Settings',        desc: 'System info & account details' },
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

export const SECTION_LABEL = {};
SECTIONS.forEach(g => g.items.forEach(i => {
  SECTION_LABEL[i.id] = { label: i.label, icon: i.icon };
}));

/* ── Exit Confirm Modal ── */
function ExitModal({ onStay, onExit }) {
  return (
    <div className="modal-overlay" style={{ zIndex: 999 }}>
      <div className="modal-box" style={{ maxWidth: 320, textAlign: 'center' }}>
        <div className="modal-body" style={{ padding: '32px 24px 24px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>👋</div>
          <div className="modal-title" style={{ marginBottom: 10, fontSize: '1.1rem' }}>
            Exit KCDL Admin?
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24 }}>
            Are you sure you want to close the app?
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={onStay}
            >
              Stay
            </button>
            <button
              type="button"
              className="btn btn-danger"
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={onExit}
            >
              Exit App
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Access Denied ── */
function AccessDenied({ email, onSignOut }) {
  return (
    <div className="login-page">
      <div className="login-bg-circle login-bg-circle-1" />
      <div className="login-card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔒</div>
        <div className="login-title" style={{ fontSize: '1.3rem' }}>Access Denied</div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.7, margin: '12px 0 24px' }}>
          <strong style={{ color: 'var(--text-primary)' }}>{email}</strong> does not have admin access.
          Contact your HQ administrator.
        </p>
        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
          onClick={onSignOut} type="button">
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
  const [showExit,     setShowExit]     = useState(false);

  // Keep a ref so the back-button handler always sees the latest section
  const sectionRef = useRef(section);
  useEffect(() => { sectionRef.current = section; }, [section]);

  /* ── Auth listener ── */
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

  /* ── Android hardware back button ── */
  useEffect(() => {
    // Capacitor back button (Android)
    let removeListener = null;

    async function setupBackButton() {
      try {
        const { App: CapApp } = await import('@capacitor/app');
        const handle = await CapApp.addListener('backButton', () => {
          const cur = sectionRef.current;
          if (cur === null) {
            // Already on home → go to Dashboard
            setSection('dashboard');
          } else if (cur === 'dashboard') {
            // On Dashboard → show exit confirm
            setShowExit(true);
          } else {
            // On any other section → go home
            setSection(null);
          }
        });
        removeListener = () => handle.remove();
      } catch {
        // Not running in Capacitor (web/dev) — fall back to browser popstate
        const onPop = () => {
          const cur = sectionRef.current;
          if (cur === null) {
            setSection('dashboard');
          } else if (cur === 'dashboard') {
            setShowExit(true);
          } else {
            setSection(null);
          }
        };
        window.history.pushState(null, '', window.location.href);
        window.addEventListener('popstate', onPop);
        removeListener = () => window.removeEventListener('popstate', onPop);
      }
    }

    setupBackButton();
    return () => { if (removeListener) removeListener(); };
  }, []);

  /* ── Push a history entry whenever section changes so browser back fires ── */
  useEffect(() => {
    window.history.pushState(null, '', window.location.href);
  }, [section]);

  async function handleSignOut() {
    await signOut(auth);
    setSection(null);
    setProfile(null);
    setAccessDenied(false);
  }

  function navigate(id) { setSection(id || null); }

  function handleExitApp() {
    try {
      import('@capacitor/app').then(({ App: CapApp }) => CapApp.exitApp());
    } catch {
      window.close(); // web fallback
    }
  }

  /* ── Render gates ── */
  if (user === undefined) {
    return (
      <div className="splash-screen">
        <img src="./icon_bg.png" alt="KCDL" className="splash-logo"
          onError={e => { e.target.style.display = 'none'; }} />
        <p className="splash-text">KCDL Admin · Loading…</p>
      </div>
    );
  }

  if (!user)        return <LoginScreen />;
  if (accessDenied) return <AccessDenied email={user.email} onSignOut={handleSignOut} />;

  const SectionComp = section ? SECTION_MAP[section] : null;
  const sectionMeta = section ? SECTION_LABEL[section] : null;

  return (
    <div className="app-shell">
      {showExit && (
        <ExitModal
          onStay={() => setShowExit(false)}
          onExit={handleExitApp}
        />
      )}

      <TopBar
        sectionMeta={sectionMeta}
        onGoHome={() => setSection(null)}
        onNavigate={navigate}
        onSignOut={handleSignOut}
        email={user.email}
      />

      {authError && (
        <div className="flash-bar flash-warn" style={{ margin: '0 5px', borderRadius: 6 }}>
          ⚠️ Profile load error — some features may be limited: {authError}
        </div>
      )}

      <div className="page-body">
        {SectionComp ? (
          <SectionComp onNavigate={navigate} user={user} profile={profile} />
        ) : (
          <HomeScreen onNavigate={navigate} email={user.email} />
        )}
      </div>
    </div>
  );
}
