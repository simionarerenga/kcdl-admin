// src/components/TopBar.jsx
import { useState, useEffect, useRef } from 'react';
import { SECTIONS, SECTION_LABEL } from '../App';

export default function TopBar({ sectionMeta, onGoHome, onNavigate, onSignOut, email }) {
  const [menuOpen,     setMenuOpen]     = useState(false);
  const [openGroup,    setOpenGroup]    = useState(null); // which category is expanded
  const menuRef = useRef(null);

  const dateStr = new Date().toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });

  // Close menu when clicking outside
  useEffect(() => {
    function handleOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
        setOpenGroup(null);
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [menuOpen]);

  function toggleMenu() {
    setMenuOpen(o => !o);
    setOpenGroup(null);
  }

  function toggleGroup(group) {
    setOpenGroup(g => g === group ? null : group);
  }

  function handleNavItem(id) {
    onNavigate(id);
    setMenuOpen(false);
    setOpenGroup(null);
  }

  return (
    <div className="topbar">
      {/* LEFT — icon + hamburger + app name */}
      <div className="topbar-left">
        {/* KCDL logo */}
        <img
          src="./icon_bg.png"
          alt="KCDL"
          className="topbar-logo"
          onError={e => { e.target.style.display = 'none'; }}
        />

        {/* Hamburger + dropdown */}
        <div className="hamburger-wrap" ref={menuRef}>
          <button
            type="button"
            className="hamburger-btn"
            onClick={toggleMenu}
            aria-label="Navigation menu"
          >
            <span className="hamburger-line" />
            <span className="hamburger-line" />
            <span className="hamburger-line" />
          </button>

          {menuOpen && (
            <div className="hamburger-dropdown">
              {SECTIONS.map(group => (
                <div key={group.group} className="hd-group">
                  {/* Category row */}
                  <button
                    type="button"
                    className="hd-category"
                    onClick={() => toggleGroup(group.group)}
                  >
                    <span>{group.group}</span>
                    <span className={`hd-chevron${openGroup === group.group ? ' open' : ''}`}>›</span>
                  </button>

                  {/* Section items — shown when category is expanded */}
                  {openGroup === group.group && (
                    <div className="hd-items">
                      {group.items.map(item => (
                        <button
                          key={item.id}
                          type="button"
                          className="hd-item"
                          onClick={() => handleNavItem(item.id)}
                        >
                          <span className="hd-item-icon">{item.icon}</span>
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* App name — tapping goes home */}
        <button
          type="button"
          className="topbar-appname"
          onClick={onGoHome}
        >
          KCDL Admin
        </button>
      </div>

      {/* RIGHT — breadcrumb trail + sign out */}
      <div className="topbar-right">
        {sectionMeta && (
          <div className="topbar-breadcrumb">
            <button type="button" className="topbar-home-btn" onClick={onGoHome}>
              Home
            </button>
            <span className="breadcrumb-sep">›</span>
            <span className="breadcrumb-current">
              {sectionMeta.icon} {sectionMeta.label}
            </span>
          </div>
        )}
        <button className="topbar-btn" onClick={onSignOut} type="button">
          Sign Out
        </button>
      </div>
    </div>
  );
}
