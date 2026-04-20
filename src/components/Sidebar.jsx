// src/components/Sidebar.jsx
export const NAV = [
  { section: 'OVERVIEW' },
  { id: 'dashboard',   icon: '📊', label: 'Dashboard' },
  { id: 'activity',    icon: '⚡', label: 'Live Activity' },

  { section: 'FIELD DATA' },
  { id: 'cpr',         icon: '📋', label: 'CPR Records' },
  { id: 'twc',         icon: '🚢', label: 'TWC Records' },
  { id: 'shedstock',   icon: '⚖️',  label: 'Shed & Warehouse' },
  { id: 'shipments',   icon: '🛳️', label: 'Shipments' },
  { id: 'farmers',     icon: '👩‍🌾', label: 'Farmers Registry' },

  { section: 'REPORTS' },
  { id: 'reports',     icon: '📑', label: 'Reports Centre' },
  { id: 'analytics',   icon: '📈', label: 'Analytics' },

  { section: 'ADMIN' },
  { id: 'stations',    icon: '🏝️', label: 'Stations' },
  { id: 'users',       icon: '👤', label: 'User Management' },
  { id: 'settings',    icon: '⚙️',  label: 'Settings' },
];

export default function Sidebar({ current, onNavigate, collapsed, email, mobileOpen, onOverlayClick }) {
  const initials = (email || 'HQ').slice(0, 2).toUpperCase();

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay${mobileOpen ? ' visible' : ''}`}
        onClick={onOverlayClick}
      />

      <nav className={`sidebar${collapsed ? ' collapsed' : ''}${mobileOpen ? ' mobile-open' : ''}`}>
        {/* Brand */}
        <div className="sidebar-brand">
          <img src="./img/icon_bg.png" alt="KCDL" className="sidebar-logo"
            onError={e => { e.target.style.display='none'; }} />
          <div className="sidebar-brand-text">
            <div className="sidebar-brand-title">KCDL Admin</div>
            <div className="sidebar-brand-sub">HQ Tarawa · Operations</div>
          </div>
        </div>

        {/* Navigation */}
        <div style={{ flex: 1, paddingBottom: 8 }}>
          {NAV.map((item, i) => {
            if (item.section) {
              return (
                <div key={i} className="sidebar-section-label">{item.section}</div>
              );
            }
            return (
              <button
                key={item.id}
                className={`nav-item${current === item.id ? ' active' : ''}`}
                onClick={() => onNavigate(item.id)}
                type="button"
                title={collapsed ? item.label : ''}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Footer user */}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{email || 'HQ Admin'}</div>
              <div className="sidebar-user-role">Super Admin</div>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
