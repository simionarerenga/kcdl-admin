// src/components/TopBar.jsx
export default function TopBar({ sectionMeta, onGoHome, onSignOut, email }) {
  const dateStr = new Date().toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <div className="topbar">
      <div className="topbar-left">
        {sectionMeta ? (
          /* Breadcrumb when inside a section */
          <div className="breadcrumb" style={{ margin: 0 }}>
            <button
              type="button"
              className="topbar-toggle"
              onClick={onGoHome}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', fontSize: '0.88rem', fontWeight: 600 }}
            >
              🏠 Home
            </button>
            <span className="breadcrumb-sep">›</span>
            <span className="breadcrumb-current" style={{ fontSize: '0.95rem' }}>
              {sectionMeta.icon} {sectionMeta.label}
            </span>
          </div>
        ) : (
          /* Home screen title */
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img
              src="./img/icon_bg.png"
              alt="KCDL"
              style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover' }}
              onError={e => { e.target.style.display = 'none'; }}
            />
            <span className="topbar-title">KCDL Admin</span>
          </div>
        )}
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
