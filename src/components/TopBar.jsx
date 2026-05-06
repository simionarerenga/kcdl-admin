// src/components/TopBar.jsx
import { useState, useEffect, useRef } from 'react';
import { SECTIONS } from '../App';

export default function TopBar({ sectionMeta, onGoHome, onNavigate, onSignOut }) {
  const [menuOpen,      setMenuOpen]      = useState(false);
  const [openGroup,     setOpenGroup]     = useState(null);
  const [confirmSignOut,setConfirmSignOut]= useState(false);
  const [isOnline,      setIsOnline]      = useState(navigator.onLine);
  const menuRef = useRef(null);

  // #11 — track online/offline status
  useEffect(() => {
    const goOn  = () => setIsOnline(true);
    const goOff = () => setIsOnline(false);
    window.addEventListener('online',  goOn);
    window.addEventListener('offline', goOff);
    return () => { window.removeEventListener('online', goOn); window.removeEventListener('offline', goOff); };
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    function onOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
        setOpenGroup(null);
      }
    }
    if (menuOpen) document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [menuOpen]);

  function toggleMenu() { setMenuOpen(o => !o); setOpenGroup(null); }
  function toggleGroup(group) { setOpenGroup(g => g === group ? null : group); }
  function handleNavItem(id) { onNavigate(id); setMenuOpen(false); setOpenGroup(null); }

  const activeGroup = sectionMeta
    ? SECTIONS.find(g => g.items.some(i => i.label === sectionMeta.label))?.group
    : null;

  return (
    <>
      <div className="topbar">
        {/* LEFT */}
        <div className="topbar-left">
          <img src="./icon_bg.png" alt="KCDL" className="topbar-logo" onClick={onGoHome}
            style={{ cursor: 'pointer' }} onError={e => { e.target.style.display = 'none'; }} />

          <div className="hamburger-wrap" ref={menuRef}>
            <button type="button" className="hamburger-btn" onClick={toggleMenu} aria-label="Navigation menu">
              <span className="hamburger-line" />
              <span className="hamburger-line" />
              <span className="hamburger-line" />
            </button>

            {menuOpen && (
              <div className="hamburger-dropdown">
                {SECTIONS.map(group => {
                  const isActiveGroup = group.group === activeGroup;
                  const isGroupOpen   = openGroup === group.group;
                  return (
                    <div key={group.group} className="hd-group">
                      <button type="button" className="hd-category" onClick={() => toggleGroup(group.group)}
                        style={{ background: isActiveGroup ? 'var(--teal-dim)' : 'none', color: isActiveGroup ? 'var(--teal)' : 'var(--text-secondary)' }}>
                        <span>{group.group}</span>
                        <span className={`hd-chevron${isGroupOpen ? ' open' : ''}`}>›</span>
                      </button>
                      {isGroupOpen && (
                        <div className="hd-items">
                          {group.items.map(item => {
                            const isActive = sectionMeta?.label === item.label;
                            return (
                              <button key={item.id} type="button" className="hd-item"
                                onClick={() => handleNavItem(item.id)}
                                style={{ background: isActive ? 'var(--teal-dim)' : 'none', color: isActive ? 'var(--teal)' : 'var(--text-primary)', fontWeight: isActive ? 700 : 500 }}>
                                <span className="hd-item-icon">{item.icon}</span>
                                <span>{item.label}</span>
                                {isActive && <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--teal)', fontWeight: 700 }}>● HERE</span>}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <button type="button" className="topbar-appname" onClick={onGoHome}>KCDL Admin</button>
        </div>

        {/* RIGHT — offline badge + sign out */}
        <div className="topbar-right" style={{ gap: 8 }}>
          {/* #11 online/offline indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.7rem', fontWeight: 600,
            color: isOnline ? 'var(--green)' : 'var(--amber)', userSelect: 'none' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: isOnline ? 'var(--green)' : 'var(--amber)',
              boxShadow: isOnline ? '0 0 5px var(--green)' : '0 0 5px var(--amber)' }} />
            {isOnline ? 'Live' : 'Offline'}
          </div>
          {/* #5 sign out with confirmation */}
          <button className="topbar-btn" onClick={() => setConfirmSignOut(true)} type="button">Sign Out</button>
        </div>
      </div>

      {/* #5 Sign-out confirmation dialog */}
      {confirmSignOut && (
        <div className="modal-overlay" onClick={() => setConfirmSignOut(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 340 }}>
            <div className="modal-head">
              <div className="modal-title">Sign Out</div>
              <button className="modal-close" onClick={() => setConfirmSignOut(false)} type="button">✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Are you sure you want to sign out of <strong style={{ color: 'var(--text-primary)' }}>KCDL Admin</strong>?
              </p>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setConfirmSignOut(false)} type="button">Cancel</button>
              <button className="btn btn-danger" onClick={() => { setConfirmSignOut(false); onSignOut(); }} type="button">Sign Out</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

