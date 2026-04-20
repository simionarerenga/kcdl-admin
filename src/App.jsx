// src/App.jsx
import { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

import Sidebar     from './components/Sidebar';
import TopBar      from './components/TopBar';
import LoginScreen from './sections/LoginScreen';
import Dashboard   from './sections/Dashboard';
import LiveActivity from './sections/LiveActivity';
import CPRMonitor  from './sections/CPRMonitor';
import TWCMonitor  from './sections/TWCMonitor';
import ShedWarehouseMonitor from './sections/ShedWarehouseMonitor';
import ShipmentsMonitor from './sections/ShipmentsMonitor';
import FarmersMonitor from './sections/FarmersMonitor';
import ReportsCentre from './sections/ReportsCentre';
import Analytics   from './sections/Analytics';
import StationsManager from './sections/StationsManager';
import UserManagement from './sections/UserManagement';
import SettingsSection from './sections/SettingsSection';

const SECTIONS = {
  dashboard:  Dashboard,
  activity:   LiveActivity,
  cpr:        CPRMonitor,
  twc:        TWCMonitor,
  shedstock:  ShedWarehouseMonitor,
  shipments:  ShipmentsMonitor,
  farmers:    FarmersMonitor,
  reports:    ReportsCentre,
  analytics:  Analytics,
  stations:   StationsManager,
  users:      UserManagement,
  settings:   SettingsSection,
};

/* ── Access denied (non-admin) ── */
function AccessDenied({ email, onSignOut }) {
  return (
    <div className="login-page">
      <div className="login-bg-circle login-bg-circle-1" />
      <div className="login-card" style={{ textAlign:'center' }}>
        <div style={{ fontSize:'3rem', marginBottom:16 }}>🔒</div>
        <div className="login-title" style={{ fontSize:'1.3rem' }}>Access Denied</div>
        <p style={{ fontSize:'0.85rem', color:'var(--text-secondary)', lineHeight:1.7, margin:'12px 0 24px' }}>
          Your account (<strong style={{color:'var(--text-primary)'}}>{email}</strong>) does not have admin access to the KCDL HQ Portal. Please contact your HQ administrator.
        </p>
        <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center' }} onClick={onSignOut} type="button">
          Sign Out
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   Main App
═══════════════════════════════════════ */
export default function App() {
  const [user,       setUser]       = useState(undefined);
  const [profile,    setProfile]    = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [section,    setSection]    = useState('dashboard');
  const [collapsed,  setCollapsed]  = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authError,  setAuthError]  = useState('');

  /* Auth listener */
  useEffect(() => {
    return onAuthStateChanged(auth, async firebaseUser => {
      setAuthError('');
      setAccessDenied(false);
      if (firebaseUser) {
        try {
          const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (snap.exists()) {
            const p = snap.data();
            // Only allow admin or HQ-role users
            if (p.role === 'admin' || p.role === 'hq' || !p.role) {
              setProfile(p);
              setUser(firebaseUser);
            } else {
              setUser(firebaseUser);
              setAccessDenied(true);
            }
          } else {
            // No Firestore profile — allow for now (HQ admin bootstrap)
            setProfile(null);
            setUser(firebaseUser);
          }
        } catch(e) {
          console.error('[Admin] Auth error:', e.message);
          setAuthError(e.message);
          setUser(firebaseUser);
        }
      } else {
        setUser(null);
        setProfile(null);
        setAccessDenied(false);
      }
    });
  }, []);

  async function handleSignOut() {
    await signOut(auth);
    setSection('dashboard');
    setProfile(null);
    setAccessDenied(false);
  }

  function navigate(id) {
    setSection(id);
    setMobileOpen(false);
  }

  /* Render gates */
  if (user === undefined) {
    return (
      <div className="splash-screen">
        <img src="./img/icon_bg.png" alt="KCDL" className="splash-logo"
          onError={e => { e.target.style.display='none'; }} />
        <p className="splash-text">KCDL Admin · Loading…</p>
      </div>
    );
  }

  if (!user) return <LoginScreen />;

  if (accessDenied) return <AccessDenied email={user.email} onSignOut={handleSignOut} />;

  const SectionComp = SECTIONS[section] || Dashboard;

  return (
    <div className="app-shell">
      <Sidebar
        current={section}
        onNavigate={navigate}
        collapsed={collapsed}
        email={user.email}
        mobileOpen={mobileOpen}
        onOverlayClick={() => setMobileOpen(false)}
      />

      <div className="main-area">
        <TopBar
          section={section}
          onToggleSidebar={() => {
            if (window.innerWidth <= 768) setMobileOpen(o => !o);
            else setCollapsed(c => !c);
          }}
          onSignOut={handleSignOut}
          email={user.email}
        />

        {authError && (
          <div className="flash-bar flash-warn" style={{ margin:'0 24px', borderRadius:0, marginTop:0 }}>
            ⚠️ Profile load error — some features may be limited: {authError}
          </div>
        )}

        <div className="page-body">
          <SectionComp
            onNavigate={navigate}
            user={user}
            profile={profile}
          />
        </div>
      </div>
    </div>
  );
}
