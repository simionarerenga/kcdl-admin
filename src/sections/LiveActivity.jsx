// src/sections/LiveActivity.jsx
import { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { fmt } from '../utils/helpers';

const COLORS = {
  cpr:     'var(--teal)',
  twc:     'var(--purple)',
  shed:    'var(--amber)',
  ship:    'var(--green)',
  farmer:  'var(--gold)',
};

function buildFeed(cprs, twcs, stocks, farmers) {
  const items = [];

  cprs.slice(0, 30).forEach(r => items.push({
    id: 'cpr-' + r.id,
    type: 'cpr',
    icon: '📋',
    title: `CPR #${r.cpr_number || 'N/A'} — ${r.island || 'Unknown Island'}`,
    detail: `${r.cooperative_name || 'N/A'} · ${r.total_weight_cpr ? fmt.kg(r.total_weight_cpr) : '—'} · Inspector: ${r.inspectorEmail || r.copra_inspector_name || '—'}`,
    time: r.savedAt || r.date || '',
    color: COLORS.cpr,
  }));

  twcs.slice(0, 20).forEach(r => items.push({
    id: 'twc-' + r.id,
    type: 'twc',
    icon: '🚢',
    title: `TWC #${r.twc_number || 'N/A'} — ${r.vessel_name || 'Unknown Vessel'}`,
    detail: `${r.island || 'N/A'} · ${r.number_of_sacks || 0} sacks · ${r.total_weight_twc ? fmt.kg(r.total_weight_twc) : '—'}`,
    time: r.savedAt || r.date || '',
    color: COLORS.twc,
  }));

  stocks.slice(0, 20).forEach(r => items.push({
    id: 'shed-' + r.id,
    type: 'shed',
    icon: '⚖️',
    title: `Bag ${r.bagSerial || r.id} — ${r.status?.replace(/_/g,' ') || 'Unknown status'}`,
    detail: `Farmer: ${r.farmerName || 'N/A'} · Weight: ${r.stationWeight ? fmt.kg(r.stationWeight) : '—'}`,
    time: r.weighedAt || r.createdAt || '',
    color: COLORS.shed,
  }));

  farmers.slice(0, 10).forEach(r => items.push({
    id: 'frm-' + r.id,
    type: 'farmer',
    icon: '👩‍🌾',
    title: `Farmer Registered: ${r.name || 'N/A'}`,
    detail: `ID: ${r.farmerId || '—'} · Village: ${r.village || '—'} · ${r.gender || ''}`,
    time: r.createdAt || '',
    color: COLORS.farmer,
  }));

  return items.sort((a, b) => (b.time > a.time ? 1 : -1));
}

export default function LiveActivity() {
  const [cprs,    setCprs]    = useState([]);
  const [twcs,    setTwcs]    = useState([]);
  const [stocks,  setStocks]  = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [filter,  setFilter]  = useState('all');
  const [loading, setLoading] = useState(true);
  const [newCount, setNewCount] = useState(0);
  const prevFeedLen = useRef(0);

  useEffect(() => {
    const unsubs = [];
    unsubs.push(onSnapshot(collection(db, 'cprEntries'),  s => setCprs(s.docs.map(d => ({ id: d.id, ...d.data() })))));
    unsubs.push(onSnapshot(collection(db, 'twcEntries'),  s => setTwcs(s.docs.map(d => ({ id: d.id, ...d.data() })))));
    unsubs.push(onSnapshot(collection(db, 'shedStock'),   s => { setStocks(s.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); }));
    unsubs.push(onSnapshot(collection(db, 'farmers'),     s => setFarmers(s.docs.map(d => ({ id: d.id, ...d.data() })))));
    return () => unsubs.forEach(u => u());
  }, []);

  const allFeed = buildFeed(cprs, twcs, stocks, farmers);

  useEffect(() => {
    if (allFeed.length > prevFeedLen.current && prevFeedLen.current > 0) {
      setNewCount(c => c + (allFeed.length - prevFeedLen.current));
    }
    prevFeedLen.current = allFeed.length;
  }, [allFeed.length]);

  const filtered = filter === 'all' ? allFeed : allFeed.filter(i => i.type === filter);

  if (loading) return <div className="spinner-wrap"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">⚡ Live Activity Feed</div>
          <div className="page-subtitle">Real-time stream of all field operations — updates automatically</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {newCount > 0 && (
            <div className="dashboard-live-badge" style={{ cursor: 'pointer' }} onClick={() => setNewCount(0)}>
              <div className="live-dot" />
              {newCount} new
            </div>
          )}
          <div className="dashboard-live-badge">
            <div className="live-dot" />
            {allFeed.length} events
          </div>
        </div>
      </div>

      <div className="tab-bar">
        {[['all','All Events'],['cpr','CPR'],['twc','TWC'],['shed','Shed/Stock'],['farmer','Farmers']].map(([v,l]) => (
          <button key={v} className={`tab-btn${filter===v?' active':''}`} onClick={() => setFilter(v)} type="button">{l}</button>
        ))}
      </div>

      <div className="card">
        <div className="timeline">
          {filtered.slice(0, 100).map(item => (
            <div key={item.id} className="tl-item">
              <div className="tl-dot" style={{ borderColor: item.color, color: item.color }}>
                <span style={{ fontSize: '0.75rem' }}>{item.icon}</span>
              </div>
              <div className="tl-content">
                <div className="tl-title">{item.title}</div>
                <div className="tl-meta">{item.detail}</div>
                {item.time && (
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 3, fontFamily: 'var(--font-mono)' }}>
                    {fmt.datetime(item.time)}
                  </div>
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="empty-state"><div className="empty-state-icon">📭</div><div className="empty-state-text">No events</div></div>
          )}
        </div>
      </div>
    </div>
  );
}
