// src/sections/AuditLog.jsx
import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';

const ACTION_STYLE = {
  create: { color: 'var(--green)',  bg: 'rgba(34,197,94,0.12)',  icon: '➕' },
  update: { color: 'var(--teal)',   bg: 'rgba(0,124,145,0.12)',  icon: '✏️' },
  delete: { color: 'var(--red)',    bg: 'rgba(239,68,68,0.12)',  icon: '🗑️' },
};

const ENTITY_ICON = {
  user:        '👤',
  cooperative: '🤝',
  island:      '🏝️',
  village:     '🏘️',
  station:     '📡',
};

function fmt(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export default function AuditLog() {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState(''); // action filter

  useEffect(() => {
    const q = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'), limit(200));
    return onSnapshot(q, s => {
      setLogs(s.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return logs.filter(l => {
      if (filter && l.action !== filter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (l.entityName   || '').toLowerCase().includes(q)
          || (l.entity       || '').toLowerCase().includes(q)
          || (l.performedBy  || '').toLowerCase().includes(q)
          || (l.action       || '').toLowerCase().includes(q);
    });
  }, [logs, search, filter]);

  if (loading) return <div className="spinner-wrap"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">📋 Audit Log</div>
          <div className="page-subtitle">All admin actions — last 200 entries</div>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 20 }}>
        {[
          { icon: '➕', val: logs.filter(l => l.action === 'create').length, lbl: 'Created', col: 'var(--green)'  },
          { icon: '✏️', val: logs.filter(l => l.action === 'update').length, lbl: 'Updated', col: 'var(--teal)'   },
          { icon: '🗑️', val: logs.filter(l => l.action === 'delete').length, lbl: 'Deleted', col: 'var(--red)'    },
        ].map(s => (
          <div key={s.lbl} className="stat-card" style={{ '--accent-color': s.col }}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-value" style={{ fontSize: '1.8rem' }}>{s.val}</div>
            <div className="stat-label">{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="toolbar" style={{ marginBottom: 16, gap: 10 }}>
        <div className="search-bar" style={{ flex: 1 }}>
          <input placeholder="Search by name, entity, admin email…" value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-select" style={{ width: 'auto', minWidth: 130 }}
          value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="">All Actions</option>
          <option value="create">Created</option>
          <option value="update">Updated</option>
          <option value="delete">Deleted</option>
        </select>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          {filtered.length} entries
        </div>
      </div>

      {/* Log entries */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filtered.map(l => {
          const style = ACTION_STYLE[l.action] || ACTION_STYLE.update;
          const entityIcon = ENTITY_ICON[l.entity] || '📄';
          return (
            <div key={l.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderLeft: `4px solid ${style.color}`,
              borderRadius: 8, padding: '10px 14px',
            }}>
              {/* Action badge */}
              <div style={{
                flexShrink: 0, width: 28, height: 28, borderRadius: 6,
                background: style.bg, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '0.9rem',
              }}>{style.icon}</div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                  <span style={{ fontSize: '0.75rem', color: style.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {l.action}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {entityIcon} {l.entity}
                  </span>
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {l.entityName}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  by <strong style={{ color: 'var(--teal-light)' }}>{l.performedBy}</strong>
                  {' · '}{fmt(l.timestamp)}
                </div>
                {l.details && Object.keys(l.details).length > 0 && (
                  <div style={{ marginTop: 4, fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', background: 'var(--navy)', borderRadius: 4, padding: '3px 8px', display: 'inline-block' }}>
                    {Object.entries(l.details).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-text">No audit entries yet</div>
          </div>
        )}
      </div>
    </div>
  );
}
