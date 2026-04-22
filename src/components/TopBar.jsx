// src/components/TopBar.jsx
import { useState, useEffect, useRef } from 'react';
import { SECTIONS } from '../App';

export default function TopBar({ sectionMeta, onGoHome, onNavigate, onSignOut }) {
  const [menuOpen,  setMenuOpen]  = useState(false);
  const [openGroup, setOpenGroup] = useState(null);
  const menuRef = useRef(null);

  // Close when clicking outside
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

  // Find which group the current section belongs to
  const activeGroup = sectionMeta
    ? SECTIONS.find(g => g.items.some(i => i.label === sectionMeta.label))?.group
    : null;

  return (
    <div className="topbar">
      {/* LEFT — logo + hamburger + app name */}
      <div className="topbar-left">
        {/* KCDL logo */}
        <img
          src="./icon_bg.png"
          alt="KCDL"
          className="topbar-logo"
          onClick={onGoHome}
          style={{ cursor: 'pointer' }}
          onError={e => { e.target.style.display = 'none'; }}
        />

        {/* Hamburger */}
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
              {SECTIONS.map(group => {
                const isActiveGroup = group.group === activeGroup;
                const isGroupOpen   = openGroup === group.group;

                return (
                  <div key={group.group} className="hd-group">
                    {/* Category row — highlighted if current section is in this group */}
                    <button
                      type="button"
                      className="hd-category"
                      onClick={() => toggleGroup(group.group)}
                      style={{
                        background: isActiveGroup ? 'var(--teal-dim)' : 'none',
                        color: isActiveGroup ? 'var(--teal)' : 'var(--text-secondary)',
                      }}
                    >
                      <span>{group.group}</span>
                      <span className={`hd-chevron${isGroupOpen ? ' open' : ''}`}>›</span>
                    </button>

                    {/* Section items */}
                    {isGroupOpen && (
                      <div className="hd-items">
                        {group.items.map(item => {
                          const isActive = sectionMeta?.label === item.label;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              className="hd-item"
                              onClick={() => handleNavItem(item.id)}
                              style={{
                                background: isActive ? 'var(--teal-dim)' : 'none',
                                color:      isActive ? 'var(--teal)'     : 'var(--text-primary)',
                                fontWeight: isActive ? 700               : 500,
                              }}
                            >
                              <span className="hd-item-icon">{item.icon}</span>
                              <span>{item.label}</span>
                              {isActive && (
                                <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--teal)', fontWeight: 700 }}>
                                  ● HERE
                                </span>
                              )}
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

        {/* App name */}
        <button type="button" className="topbar-appname" onClick={onGoHome}>
          KCDL Admin
        </button>
      </div>

      {/* RIGHT — sign out only */}
      <div className="topbar-right">
        <button className="topbar-btn" onClick={onSignOut} type="button">
          Sign Out
        </button>
      </div>
    </div>
  );
}
