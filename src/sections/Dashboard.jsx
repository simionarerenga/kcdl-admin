// src/sections/Dashboard.jsx
import { useState, useEffect } from 'react';
import {
  collection, onSnapshot, query, orderBy, limit, where
} from 'firebase/firestore';
import { db } from '../firebase';
import { fmt, sumField, groupBy } from '../utils/helpers';

function StatCard({ icon, value, label, accent, sub }) {
  return (
    <div className="stat-card" style={{ '--accent-color': accent }}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-change up" style={{ marginTop: 8, color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.73rem' }}>{sub}</div>}
    </div>
  );
}

function MiniBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="mini-bar-row">
      <div className="mini-bar-label" title={label}>{label}</div>
      <div className="mini-bar-track">
        <div className="mini-bar-fill" style={{ width: `${pct}%`, background: color || 'var(--teal)' }} />
      </div>
      <div className="mini-bar-val">{fmt.kg(value)}</div>
    </div>
  );
}

export default function Dashboard({ onNavigate }) {
  const [cprList,  setCprList]  = useState([]);
  const [twcList,  setTwcList]  = useState([]);
  const [stock,    setStock]    = useState([]);
  const [farmers,  setFarmers]  = useState([]);
  const [stations, setStations] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const unsubs = [];

    unsubs.push(onSnapshot(collection(db, 'cprEntries'),  s => setCprList(s.docs.map(d => ({ id: d.id, ...d.data() })))));
    unsubs.push(onSnapshot(collection(db, 'twcEntries'),  s => setTwcList(s.docs.map(d => ({ id: d.id, ...d.data() })))));
    unsubs.push(onSnapshot(collection(db, 'shedStock'),   s => { setStock(s.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); }));
    unsubs.push(onSnapshot(collection(db, 'farmers'),     s => setFarmers(s.docs.map(d => ({ id: d.id, ...d.data() })))));
    unsubs.push(onSnapshot(collection(db, 'users'),       s => setStations(s.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.stationId))));

    return () => unsubs.forEach(u => u());
  }, []);

  // Derived metrics
  const today = new Date().toISOString().slice(0, 10);
  const totalCPRWeight   = sumField(cprList, 'total_weight_cpr');
  const totalTWCWeight   = sumField(twcList, 'total_weight_twc');
  const totalSacks       = twcList.reduce((s, t) => s + (parseInt(t.number_of_sacks) || 0), 0);
  const todayCPR         = cprList.filter(c => c.date === today);
  const todayWeight      = sumField(todayCPR, 'total_weight_cpr');
  const inShed           = stock.filter(s => s.status === 'in_shed');
  const inWarehouse      = stock.filter(s => s.status === 'in_warehouse');
  const readyToShip      = stock.filter(s => s.status === 'ready_to_ship');
  const shedWeight       = sumField(inShed, 'stationWeight');
  const warehouseWeight  = sumField(inWarehouse, 'stationWeight');
  const shipWeight       = sumField(readyToShip, 'stationWeight');

  // Island breakdown
  const byIsland = groupBy(cprList, 'island');
  const islandWeights = Object.entries(byIsland)
    .map(([island, items]) => ({ island, weight: sumField(items, 'total_weight_cpr') }))
    .sort((a, b) => b.weight - a.weight);
  const maxIslandWeight = islandWeights[0]?.weight || 1;

  // Recent CPRs
  const recentCPRs = [...cprList]
    .sort((a, b) => (b.savedAt || b.date || '') > (a.savedAt || a.date || '') ? 1 : -1)
    .slice(0, 8);

  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  })();

  if (loading) return (
    <div className="spinner-wrap"><div className="spinner" /></div>
  );

  return (
    <div>
      {/* Header bar */}
      <div className="dashboard-header-bar">
        <div className="dashboard-greeting">
          <div className="dashboard-greeting-text">{greeting}, HQ Admin</div>
          <div className="dashboard-greeting-title">Copra Operations Overview</div>
          <div className="dashboard-greeting-date">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div className="dashboard-live-badge">
            <div className="live-dot" />
            Live · Firebase
          </div>
          <button className="btn btn-sm btn-primary" onClick={() => onNavigate('reports')} type="button">
            📑 Generate Report
          </button>
        </div>
      </div>

      {/* KPI stat cards */}
      <div className="stat-grid">
        <StatCard icon="📋" value={cprList.length} label="Total CPR Records" accent="var(--teal)" sub={`${todayCPR.length} today`} />
        <StatCard icon="⚖️"  value={fmt.kg(totalCPRWeight)} label="Total CPR Weight" accent="var(--gold)" />
        <StatCard icon="🚢" value={twcList.length} label="Total TWC Records" accent="var(--purple)" sub={`${totalSacks.toLocaleString()} sacks`} />
        <StatCard icon="🏝️" value={stations.length} label="Active Stations" accent="var(--green)" />
        <StatCard icon="🏚️" value={inShed.length + inWarehouse.length} label="Bags in Storage" accent="var(--amber)" sub={fmt.kg(shedWeight + warehouseWeight)} />
        <StatCard icon="✅" value={readyToShip.length} label="Ready to Ship" accent="var(--green)" sub={fmt.kg(shipWeight)} />
        <StatCard icon="👩‍🌾" value={farmers.length} label="Registered Farmers" accent="var(--teal-light)" />
        <StatCard icon="📅" value={fmt.kg(todayWeight)} label="Today's CPR Weight" accent="var(--gold)" sub={`${todayCPR.length} sessions`} />
      </div>

      {/* Weight by Island — full width */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <div>
            <div className="card-title">⚖️ Weight by Island</div>
            <div className="card-subtitle">CPR cumulative totals</div>
          </div>
          <button className="btn btn-sm btn-ghost" onClick={() => onNavigate('analytics')} type="button">View All →</button>
        </div>
        <div className="mini-bar-wrap">
          {islandWeights.slice(0, 8).map((row, i) => (
            <MiniBar
              key={row.island}
              label={row.island}
              value={row.weight}
              max={maxIslandWeight}
              color={['var(--teal)', 'var(--gold)', 'var(--purple)', 'var(--green)', 'var(--amber)'][i % 5]}
            />
          ))}
          {islandWeights.length === 0 && <div className="empty-state" style={{ padding: 20 }}><div className="empty-state-text">No data yet</div></div>}
        </div>
      </div>

      {/* Bag Stock Status — full width */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <div>
            <div className="card-title">📦 Bag Stock Status</div>
            <div className="card-subtitle">All stations combined</div>
          </div>
          <button className="btn btn-sm btn-ghost" onClick={() => onNavigate('shedstock')} type="button">View All →</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
          {[
            { label: 'Recently Weighed', items: stock.filter(s => s.status === 'recently_weighed'), color: 'var(--amber)' },
            { label: 'In Shed',          items: inShed,       color: 'var(--teal)' },
            { label: 'In Warehouse',     items: inWarehouse,  color: 'var(--purple)' },
            { label: 'Ready to Ship',    items: readyToShip,  color: 'var(--green)' },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: row.color, flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{row.label}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                {row.items.length} bags
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)', minWidth: 90, textAlign: 'right' }}>
                {fmt.kg(sumField(row.items, 'stationWeight'))}
              </div>
            </div>
          ))}
        </div>
        <div className="divider" />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
          <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Total bags</span>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 700 }}>
            {stock.length} · {fmt.kg(sumField(stock, 'stationWeight'))}
          </span>
        </div>
      </div>

      {/* Recent CPR activity */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">🕒 Recent CPR Sessions</div>
            <div className="card-subtitle">Latest weighing records across all stations</div>
          </div>
          <button className="btn btn-sm btn-ghost" onClick={() => onNavigate('cpr')} type="button">View All →</button>
        </div>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>CPR No.</th>
                <th>Island</th>
                <th>Cooperative</th>
                <th>Inspector</th>
                <th>Weight</th>
              </tr>
            </thead>
            <tbody>
              {recentCPRs.map(r => (
                <tr key={r.id}>
                  <td className="tbl-mono">{fmt.date(r.date)}</td>
                  <td className="tbl-mono" style={{ color: 'var(--teal)' }}>{r.cpr_number || '—'}</td>
                  <td>{r.island || '—'}</td>
                  <td>{r.cooperative_name || '—'}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{r.inspectorEmail || r.copra_inspector_name || '—'}</td>
                  <td className="tbl-mono" style={{ fontWeight: 700, color: 'var(--gold)' }}>
                    {r.total_weight_cpr ? fmt.kg(r.total_weight_cpr) : '—'}
                  </td>
                </tr>
              ))}
              {recentCPRs.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 30 }}>No CPR records yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
