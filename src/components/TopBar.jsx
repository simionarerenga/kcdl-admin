// src/components/TopBar.jsx
const TITLES = {
  dashboard:  'Dashboard',
  activity:   'Live Activity',
  cpr:        'CPR Records',
  twc:        'TWC Records',
  shedstock:  'Shed & Warehouse',
  shipments:  'Shipments',
  farmers:    'Farmers Registry',
  reports:    'Reports Centre',
  analytics:  'Analytics',
  stations:   'Stations',
  users:      'User Management',
  settings:   'Settings',
};

export default function TopBar({ section, onToggleSidebar, onSignOut, email }) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <div className="topbar">
      <div className="topbar-left">
        <button className="topbar-toggle" onClick={onToggleSidebar} type="button" title="Toggle sidebar">
          ☰
        </button>
        <span className="topbar-title">{TITLES[section] || 'KCDL Admin'}</span>
      </div>

      <div className="topbar-right">
        <span className="topbar-date">{dateStr}</span>
        <span className="topbar-badge">HQ Tarawa</span>
        <button className="topbar-btn" onClick={onSignOut} type="button">
          Sign Out
        </button>
      </div>
    </div>
  );
}
