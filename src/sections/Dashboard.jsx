// src/sections/Dashboard.jsx
import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { fmt, sumField, groupBy } from '../utils/helpers';

/* ─── Filter helpers ─────────────────────────────────── */
const TODAY      = new Date().toISOString().slice(0, 10);
const WEEK_AGO   = new Date(Date.now() - 7  * 864e5).toISOString().slice(0, 10);
const MONTH_AGO  = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
const YEAR_AGO   = new Date(Date.now() - 365* 864e5).toISOString().slice(0, 10);

const DATE_PRESETS = [
  { label: 'All Time',    from: '',         to: '' },
  { label: 'Today',       from: TODAY,      to: TODAY },
  { label: 'Last 7 days', from: WEEK_AGO,   to: TODAY },
  { label: 'Last 30 days',from: MONTH_AGO,  to: TODAY },
  { label: 'Last Year',   from: YEAR_AGO,   to: TODAY },
  { label: 'Custom…',     from: null,       to: null },
];

function applyDateFilter(arr, dateField, from, to) {
  return arr.filter(r => {
    const d = (r[dateField] || '').slice(0, 10);
    if (from && d < from) return false;
    if (to   && d > to)   return false;
    return true;
  });
}

/* ─── Reusable filter bar ────────────────────────────── */
function FilterBar({ from, to, setFrom, setTo }) {
  const [open,   setOpen]   = useState(false);
  const [custom, setCustom] = useState(false);

  const activeLabel = useMemo(() => {
    if (!from && !to) return 'All Time';
    if (from === TODAY && to === TODAY) return 'Today';
    if (from === WEEK_AGO)  return 'Last 7 days';
    if (from === MONTH_AGO) return 'Last 30 days';
    if (from === YEAR_AGO)  return 'Last Year';
    return `${from || '…'} → ${to || '…'}`;
  }, [from, to]);

  function pick(preset) {
    if (preset.from === null) { setCustom(true); setOpen(false); return; }
    setFrom(preset.from);
    setTo(preset.to);
    setCustom(false);
    setOpen(false);
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        className="btn btn-sm btn-secondary"
        onClick={() => setOpen(o => !o)}
        style={{ gap: 6 }}
      >
        🗓 {activeLabel} ▾
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 6px)',
          background: 'var(--surface)', border: '1.5px solid var(--border-mid)',
          borderRadius: 10, boxShadow: 'var(--shadow-lg)', zIndex: 50,
          minWidth: 180, overflow: 'hidden',
        }}>
          {DATE_PRESETS.map(p => (
            <button
              key={p.label}
              type="button"
              onClick={() => pick(p)}
              style={{
                display: 'block', width: '100%', padding: '10px 16px',
                textAlign: 'left', background: 'none', border: 'none',
                cursor: 'pointer', fontSize: '0.85rem',
                color: activeLabel === p.label ? 'var(--teal)' : 'var(--text-primary)',
                fontWeight: activeLabel === p.label ? 700 : 400,
                borderBottom: '1px solid var(--border)',
              }}
            >{p.label}</button>
          ))}
        </div>
      )}

      {custom && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="date" className="form-input" style={{ width: 148 }}
            value={from} onChange={e => setFrom(e.target.value)} />
          <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>to</span>
          <input type="date" className="form-input" style={{ width: 148 }}
            value={to} onChange={e => setTo(e.target.value)} />
        </div>
      )}
    </div>
  );
}

/* ─── Breadcrumb ─────────────────────────────────────── */
function Breadcrumb({ label, onBack }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
      <button type="button" className="btn btn-sm btn-ghost" onClick={onBack} style={{ gap: 5 }}>
        ← Dashboard
      </button>
      <span style={{ color: 'var(--text-muted)' }}>›</span>
      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{label}</span>
    </div>
  );
}

/* ─── Section header row (title left, filter right) ─── */
function SectionHeader({ title, subtitle, from, to, setFrom, setTo }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{title}</div>
        {subtitle && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</div>}
      </div>
      <FilterBar from={from} to={to} setFrom={setFrom} setTo={setTo} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   DETAIL SCREENS
═══════════════════════════════════════════════════════ */

/* 1. CPR Records — by Island */
function DetailCPRRecords({ cprList, onBack }) {
  const [from, setFrom] = useState('');
  const [to,   setTo]   = useState('');

  const filtered = useMemo(() => applyDateFilter(cprList, 'date', from, to), [cprList, from, to]);

  const rows = useMemo(() => {
    const byIsland = groupBy(filtered, 'island');
    return Object.entries(byIsland)
      .map(([island, items]) => ({
        island,
        sessions: items.length,
        weight:   sumField(items, 'total_weight_cpr'),
      }))
      .sort((a, b) => b.weight - a.weight);
  }, [filtered]);

  const totalSessions = rows.reduce((s, r) => s + r.sessions, 0);
  const totalWeight   = rows.reduce((s, r) => s + r.weight,   0);

  return (
    <div>
      <Breadcrumb label="CPR Records by Island" onBack={onBack} />
      <SectionHeader
        title="CPR Records by Island"
        subtitle={`${totalSessions} sessions · ${fmt.kg(totalWeight)} total`}
        from={from} to={to} setFrom={setFrom} setTo={setTo}
      />
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Island</th>
              <th style={{ textAlign: 'right' }}>CPR Sessions</th>
              <th style={{ textAlign: 'right' }}>Total Weight</th>
              <th style={{ textAlign: 'right' }}>% of Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.island}>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{i + 1}</td>
                <td style={{ fontWeight: 600 }}>{r.island}</td>
                <td style={{ textAlign: 'right' }}>{r.sessions}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--teal)', fontFamily: 'var(--font-mono)' }}>{fmt.kg(r.weight)}</td>
                <td style={{ textAlign: 'right', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {totalWeight > 0 ? ((r.weight / totalWeight) * 100).toFixed(1) + '%' : '—'}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No records found</td></tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={2} style={{ fontWeight: 700 }}>Total</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{totalSessions}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{fmt.kg(totalWeight)}</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>100%</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

/* 2. CPR Weight — by Cooperative (island, cooperative, sessions, kg) */
function DetailCPRWeight({ cprList, onBack }) {
  const [from, setFrom] = useState('');
  const [to,   setTo]   = useState('');
  const [sortBy, setSortBy] = useState('weight'); // weight | sessions | island | cooperative

  const filtered = useMemo(() => applyDateFilter(cprList, 'date', from, to), [cprList, from, to]);

  const rows = useMemo(() => {
    const byCoop = groupBy(filtered, 'cooperative_name');
    return Object.entries(byCoop)
      .map(([coop, items]) => ({
        cooperative: coop,
        island:      items[0]?.island || '—',
        sessions:    items.length,
        weight:      sumField(items, 'total_weight_cpr'),
      }))
      .sort((a, b) => {
        if (sortBy === 'island') return (a.island).localeCompare(b.island);
        if (sortBy === 'cooperative') return a.cooperative.localeCompare(b.cooperative);
        if (sortBy === 'sessions') return b.sessions - a.sessions;
        return b.weight - a.weight;
      });
  }, [filtered, sortBy]);

  const totalWeight   = rows.reduce((s, r) => s + r.weight,   0);
  const totalSessions = rows.reduce((s, r) => s + r.sessions, 0);

  const SortBtn = ({ field, label }) => (
    <button
      type="button"
      onClick={() => setSortBy(field)}
      style={{
        background: sortBy === field ? 'var(--teal)' : 'none',
        color: sortBy === field ? '#fff' : 'var(--text-secondary)',
        border: '1px solid var(--border-mid)',
        borderRadius: 6, padding: '4px 10px',
        fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
      }}
    >{label}</button>
  );

  return (
    <div>
      <Breadcrumb label="CPR Weight by Cooperative" onBack={onBack} />
      <SectionHeader
        title="CPR Weight by Cooperative"
        subtitle={`${rows.length} cooperatives · ${totalSessions} sessions · ${fmt.kg(totalWeight)}`}
        from={from} to={to} setFrom={setFrom} setTo={setTo}
      />
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', alignSelf: 'center', marginRight: 4 }}>Sort by:</span>
        <SortBtn field="weight"      label="Weight ↓" />
        <SortBtn field="sessions"    label="Sessions ↓" />
        <SortBtn field="island"      label="Island A–Z" />
        <SortBtn field="cooperative" label="Cooperative A–Z" />
      </div>
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Island</th>
              <th>Cooperative</th>
              <th style={{ textAlign: 'right' }}>Sessions</th>
              <th style={{ textAlign: 'right' }}>Total Weight</th>
              <th style={{ textAlign: 'right' }}>% Share</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.cooperative}>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{i + 1}</td>
                <td>{r.island}</td>
                <td style={{ fontWeight: 600 }}>{r.cooperative}</td>
                <td style={{ textAlign: 'right' }}>{r.sessions}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--gold)', fontFamily: 'var(--font-mono)' }}>{fmt.kg(r.weight)}</td>
                <td style={{ textAlign: 'right', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {totalWeight > 0 ? ((r.weight / totalWeight) * 100).toFixed(1) + '%' : '—'}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No records found</td></tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={3} style={{ fontWeight: 700 }}>Total</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{totalSessions}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{fmt.kg(totalWeight)}</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>100%</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

/* 3. TWC Records — by Island */
function DetailTWCRecords({ twcList, onBack }) {
  const [from, setFrom] = useState('');
  const [to,   setTo]   = useState('');

  const filtered = useMemo(() => applyDateFilter(twcList, 'date', from, to), [twcList, from, to]);

  const rows = useMemo(() => {
    const byIsland = groupBy(filtered, 'island');
    return Object.entries(byIsland)
      .map(([island, items]) => ({
        island,
        sessions: items.length,
        sacks:    items.reduce((s, t) => s + (parseInt(t.number_of_sacks) || 0), 0),
        weight:   sumField(items, 'total_weight_twc'),
      }))
      .sort((a, b) => b.weight - a.weight);
  }, [filtered]);

  const totals = rows.reduce((acc, r) => ({
    sessions: acc.sessions + r.sessions,
    sacks:    acc.sacks    + r.sacks,
    weight:   acc.weight   + r.weight,
  }), { sessions: 0, sacks: 0, weight: 0 });

  return (
    <div>
      <Breadcrumb label="TWC Records by Island" onBack={onBack} />
      <SectionHeader
        title="TWC Records by Island"
        subtitle={`${totals.sessions} shipments · ${totals.sacks.toLocaleString()} sacks · ${fmt.kg(totals.weight)}`}
        from={from} to={to} setFrom={setFrom} setTo={setTo}
      />
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Island</th>
              <th style={{ textAlign: 'right' }}>Shipments</th>
              <th style={{ textAlign: 'right' }}>Sacks</th>
              <th style={{ textAlign: 'right' }}>Total Weight</th>
              <th style={{ textAlign: 'right' }}>% of Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.island}>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{i + 1}</td>
                <td style={{ fontWeight: 600 }}>{r.island}</td>
                <td style={{ textAlign: 'right' }}>{r.sessions}</td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{r.sacks.toLocaleString()}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--purple)', fontFamily: 'var(--font-mono)' }}>{fmt.kg(r.weight)}</td>
                <td style={{ textAlign: 'right', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {totals.weight > 0 ? ((r.weight / totals.weight) * 100).toFixed(1) + '%' : '—'}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No records found</td></tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={2} style={{ fontWeight: 700 }}>Total</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{totals.sessions}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{totals.sacks.toLocaleString()}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{fmt.kg(totals.weight)}</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>100%</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

/* 4. Inspectors — list with island */
function DetailInspectors({ inspectors, onBack }) {
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    const q = search.toLowerCase();
    return inspectors
      .filter(u => !q
        || (u.email || '').toLowerCase().includes(q)
        || (u.displayName || '').toLowerCase().includes(q)
        || (u.island || '').toLowerCase().includes(q)
        || (u.stationId || '').toLowerCase().includes(q))
      .sort((a, b) => (a.island || '').localeCompare(b.island || ''));
  }, [inspectors, search]);

  return (
    <div>
      <Breadcrumb label="Inspectors" onBack={onBack} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>Inspector Accounts</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{rows.length} inspectors with assigned stations</div>
        </div>
        <div className="search-bar" style={{ maxWidth: 240 }}>
          <input
            type="text"
            placeholder="Search inspectors…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Island</th>
              <th>Station ID</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(u => (
              <tr key={u.id}>
                <td style={{ fontWeight: 600 }}>{u.displayName || u.name || '—'}</td>
                <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{u.email || '—'}</td>
                <td>{u.island || '—'}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{u.stationId || '—'}</td>
                <td>
                  <span className={`tbl-badge ${u.role === 'admin' || u.role === 'hq' ? 'badge-teal' : 'badge-muted'}`}>
                    {u.role || 'inspector'}
                  </span>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No inspectors found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* 5. Bags in Storage — tabs: All / In Shed / In Warehouse */
function DetailBagsInStorage({ stock, onBack }) {
  const [tab,     setTab]     = useState('all');
  const [station, setStation] = useState('');

  const stations = useMemo(() =>
    [...new Set(stock.map(s => s.stationId).filter(Boolean))].sort(), [stock]);

  const stageStock = useMemo(() => ({
    all:          stock.filter(s => ['recently_weighed','in_shed','in_warehouse'].includes(s.status)),
    in_shed:      stock.filter(s => s.status === 'in_shed'),
    in_warehouse: stock.filter(s => s.status === 'in_warehouse'),
  }), [stock]);

  const base = stageStock[tab] || [];
  const filtered = useMemo(() =>
    base.filter(s => !station || s.stationId === station), [base, station]);

  const byStation = useMemo(() => {
    const grp = groupBy(filtered, 'stationId');
    return Object.entries(grp).map(([sid, bags]) => ({
      stationId: sid,
      bags:      bags.length,
      weight:    sumField(bags, 'stationWeight'),
      shed:      bags.filter(b => b.status === 'in_shed').length,
      warehouse: bags.filter(b => b.status === 'in_warehouse').length,
      weighed:   bags.filter(b => b.status === 'recently_weighed').length,
    })).sort((a, b) => b.bags - a.bags);
  }, [filtered]);

  const totalBags   = byStation.reduce((s, r) => s + r.bags,   0);
  const totalWeight = byStation.reduce((s, r) => s + r.weight, 0);

  const TABS = [
    { id: 'all',          label: `All (${stageStock.all.length})` },
    { id: 'in_shed',      label: `In Shed (${stageStock.in_shed.length})` },
    { id: 'in_warehouse', label: `In Warehouse (${stageStock.in_warehouse.length})` },
  ];

  return (
    <div>
      <Breadcrumb label="Bags in Storage" onBack={onBack} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>Bags in Storage by Station</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{totalBags} bags · {fmt.kg(totalWeight)}</div>
        </div>
        <select className="form-select" style={{ width: 180 }}
          value={station} onChange={e => setStation(e.target.value)}>
          <option value="">All Stations</option>
          {stations.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="tab-bar" style={{ marginBottom: 14 }}>
        {TABS.map(t => (
          <button key={t.id} type="button"
            className={`tab-btn${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>Station</th>
              <th style={{ textAlign: 'right' }}>Total Bags</th>
              {tab === 'all' && <th style={{ textAlign: 'right' }}>Recently Weighed</th>}
              {tab === 'all' && <th style={{ textAlign: 'right' }}>In Shed</th>}
              {tab === 'all' && <th style={{ textAlign: 'right' }}>In Warehouse</th>}
              <th style={{ textAlign: 'right' }}>Total Weight</th>
            </tr>
          </thead>
          <tbody>
            {byStation.map(r => (
              <tr key={r.stationId}>
                <td style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{r.stationId}</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{r.bags}</td>
                {tab === 'all' && <td style={{ textAlign: 'right', color: 'var(--amber)' }}>{r.weighed}</td>}
                {tab === 'all' && <td style={{ textAlign: 'right', color: 'var(--teal)' }}>{r.shed}</td>}
                {tab === 'all' && <td style={{ textAlign: 'right', color: 'var(--purple)' }}>{r.warehouse}</td>}
                <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--amber)' }}>{fmt.kg(r.weight)}</td>
              </tr>
            ))}
            {byStation.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No bags found</td></tr>
            )}
          </tbody>
          {byStation.length > 0 && (
            <tfoot>
              <tr>
                <td style={{ fontWeight: 700 }}>Total</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{totalBags}</td>
                {tab === 'all' && <td style={{ textAlign: 'right', fontWeight: 700 }}>{byStation.reduce((s,r)=>s+r.weighed,0)}</td>}
                {tab === 'all' && <td style={{ textAlign: 'right', fontWeight: 700 }}>{byStation.reduce((s,r)=>s+r.shed,0)}</td>}
                {tab === 'all' && <td style={{ textAlign: 'right', fontWeight: 700 }}>{byStation.reduce((s,r)=>s+r.warehouse,0)}</td>}
                <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{fmt.kg(totalWeight)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

/* 6. Ready to Ship — by station/island */
function DetailReadyToShip({ stock, onBack }) {
  const [island, setIsland] = useState('');

  const ready = useMemo(() => stock.filter(s => s.status === 'ready_to_ship'), [stock]);
  const islands = useMemo(() => [...new Set(ready.map(s => s.island || s.stationId).filter(Boolean))].sort(), [ready]);

  const filtered = useMemo(() =>
    ready.filter(s => !island || (s.island || s.stationId) === island), [ready, island]);

  const byStation = useMemo(() => {
    const grp = groupBy(filtered, 'stationId');
    return Object.entries(grp).map(([sid, bags]) => ({
      stationId: sid,
      island:    bags[0]?.island || '—',
      bags:      bags.length,
      weight:    sumField(bags, 'stationWeight'),
    })).sort((a, b) => b.bags - a.bags);
  }, [filtered]);

  const totalBags   = byStation.reduce((s, r) => s + r.bags,   0);
  const totalWeight = byStation.reduce((s, r) => s + r.weight, 0);

  return (
    <div>
      <Breadcrumb label="Ready to Ship" onBack={onBack} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>Bags Ready to Ship — by Station</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{totalBags} bags · {fmt.kg(totalWeight)} awaiting vessel loading</div>
        </div>
        <select className="form-select" style={{ width: 180 }}
          value={island} onChange={e => setIsland(e.target.value)}>
          <option value="">All Islands</option>
          {islands.map(i => <option key={i} value={i}>{i}</option>)}
        </select>
      </div>
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Island</th>
              <th>Station</th>
              <th style={{ textAlign: 'right' }}>Bags</th>
              <th style={{ textAlign: 'right' }}>Total Weight</th>
            </tr>
          </thead>
          <tbody>
            {byStation.map((r, i) => (
              <tr key={r.stationId}>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{i + 1}</td>
                <td>{r.island}</td>
                <td style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{r.stationId}</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{r.bags}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>{fmt.kg(r.weight)}</td>
              </tr>
            ))}
            {byStation.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No bags ready to ship</td></tr>
            )}
          </tbody>
          {byStation.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={3} style={{ fontWeight: 700 }}>Total</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{totalBags}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{fmt.kg(totalWeight)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

/* 7. Registered Farmers — by Island */
function DetailFarmers({ farmers, onBack }) {
  const [from, setFrom] = useState('');
  const [to,   setTo]   = useState('');

  const rows = useMemo(() => {
    const byIsland = groupBy(farmers, 'island');
    return Object.entries(byIsland)
      .map(([island, items]) => ({
        island,
        total:  items.length,
        male:   items.filter(f => f.gender === 'Male').length,
        female: items.filter(f => f.gender === 'Female').length,
        other:  items.filter(f => f.gender && f.gender !== 'Male' && f.gender !== 'Female').length,
      }))
      .sort((a, b) => b.total - a.total);
  }, [farmers]);

  const totals = rows.reduce((acc, r) => ({
    total:  acc.total  + r.total,
    male:   acc.male   + r.male,
    female: acc.female + r.female,
    other:  acc.other  + r.other,
  }), { total: 0, male: 0, female: 0, other: 0 });

  return (
    <div>
      <Breadcrumb label="Registered Farmers" onBack={onBack} />
      <SectionHeader
        title="Registered Farmers by Island"
        subtitle={`${totals.total} total · ${totals.male} male · ${totals.female} female`}
        from={from} to={to} setFrom={setFrom} setTo={setTo}
      />
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Island</th>
              <th style={{ textAlign: 'right' }}>Total</th>
              <th style={{ textAlign: 'right' }}>Male</th>
              <th style={{ textAlign: 'right' }}>Female</th>
              <th style={{ textAlign: 'right' }}>Other</th>
              <th style={{ textAlign: 'right' }}>% of Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.island}>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{i + 1}</td>
                <td style={{ fontWeight: 600 }}>{r.island}</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{r.total}</td>
                <td style={{ textAlign: 'right', color: 'var(--teal)' }}>{r.male}</td>
                <td style={{ textAlign: 'right', color: 'var(--purple)' }}>{r.female}</td>
                <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{r.other || '—'}</td>
                <td style={{ textAlign: 'right', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {totals.total > 0 ? ((r.total / totals.total) * 100).toFixed(1) + '%' : '—'}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No farmers registered</td></tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={2} style={{ fontWeight: 700 }}>Total</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{totals.total}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--teal)' }}>{totals.male}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--purple)' }}>{totals.female}</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{totals.other}</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>100%</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN DASHBOARD
═══════════════════════════════════════════════════════ */
export default function Dashboard({ onNavigate }) {
  const [cprList,     setCprList]     = useState([]);
  const [twcList,     setTwcList]     = useState([]);
  const [stock,       setStock]       = useState([]);
  const [farmers,     setFarmers]     = useState([]);
  const [inspectors,  setInspectors]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [detail,      setDetail]      = useState(null); // which card is open

  useEffect(() => {
    const unsubs = [
      onSnapshot(collection(db, 'cprEntries'),  s => setCprList(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'twcEntries'),  s => setTwcList(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'shedStock'),   s => { setStock(s.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); }),
      onSnapshot(collection(db, 'farmers'),     s => setFarmers(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'users'),       s => setInspectors(s.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.stationId))),
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  // Derived
  const totalCPRWeight  = sumField(cprList, 'total_weight_cpr');
  const totalTWCWeight  = sumField(twcList, 'total_weight_twc');
  const totalSacks      = twcList.reduce((s, t) => s + (parseInt(t.number_of_sacks) || 0), 0);
  const inShed          = stock.filter(s => s.status === 'in_shed');
  const inWarehouse     = stock.filter(s => s.status === 'in_warehouse');
  const readyToShip     = stock.filter(s => s.status === 'ready_to_ship');
  const shedWeight      = sumField(inShed, 'stationWeight');
  const warehouseWeight = sumField(inWarehouse, 'stationWeight');
  const shipWeight      = sumField(readyToShip, 'stationWeight');

  // Island bar chart
  const byIsland = groupBy(cprList, 'island');
  const islandWeights = Object.entries(byIsland)
    .map(([island, items]) => ({ island, weight: sumField(items, 'total_weight_cpr') }))
    .sort((a, b) => b.weight - a.weight);
  const maxIslandWeight = islandWeights[0]?.weight || 1;

  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  })();

  if (loading) return <div className="spinner-wrap"><div className="spinner" /></div>;

  // ── Detail screen routing ──
  if (detail === 'cpr_records')  return <DetailCPRRecords   cprList={cprList}         onBack={() => setDetail(null)} />;
  if (detail === 'cpr_weight')   return <DetailCPRWeight    cprList={cprList}         onBack={() => setDetail(null)} />;
  if (detail === 'twc_records')  return <DetailTWCRecords   twcList={twcList}         onBack={() => setDetail(null)} />;
  if (detail === 'inspectors')   return <DetailInspectors   inspectors={inspectors}   onBack={() => setDetail(null)} />;
  if (detail === 'bags_storage') return <DetailBagsInStorage stock={stock}            onBack={() => setDetail(null)} />;
  if (detail === 'ready_ship')   return <DetailReadyToShip  stock={stock}             onBack={() => setDetail(null)} />;
  if (detail === 'farmers')      return <DetailFarmers      farmers={farmers}         onBack={() => setDetail(null)} />;

  // ── Clickable stat card ──
  function ClickCard({ id, icon, value, label, accent, sub, hint }) {
    return (
      <button
        type="button"
        className="stat-card stat-card-btn"
        style={{ '--accent-color': accent, textAlign: 'left', width: '100%' }}
        onClick={() => setDetail(id)}
      >
        <div className="stat-icon">{icon}</div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        {sub  && <div style={{ marginTop: 6, fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400 }}>{sub}</div>}
        {hint && <div style={{ marginTop: 4, fontSize: '0.68rem', color: 'var(--teal)', fontWeight: 600 }}>Tap to view details →</div>}
      </button>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="dashboard-header-bar">
        <div className="dashboard-greeting">
          <div className="dashboard-greeting-text">{greeting}, HQ Admin</div>
          <div className="dashboard-greeting-title">Copra Operations Overview</div>
          <div className="dashboard-greeting-date">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="dashboard-live-badge">
            <div className="live-dot" /> Live · Firebase
          </div>
          <button className="btn btn-sm btn-primary" onClick={() => onNavigate('reports')} type="button">
            📑 Generate Report
          </button>
        </div>
      </div>

      {/* Clickable KPI cards */}
      <div className="stat-grid">
        <ClickCard id="cpr_records"  icon="📋" value={cprList.length}          label="Total CPR Records"   accent="var(--teal)"         sub={`All time · ${[...new Set(cprList.map(c=>c.island))].length} islands`} hint />
        <ClickCard id="cpr_weight"   icon="⚖️"  value={fmt.kg(totalCPRWeight)}  label="Total CPR Weight"    accent="var(--gold)"         sub={`${[...new Set(cprList.map(c=>c.cooperative_name).filter(Boolean))].length} cooperatives`} hint />
        <ClickCard id="twc_records"  icon="🚢" value={twcList.length}          label="Total TWC Records"   accent="var(--purple)"       sub={`${totalSacks.toLocaleString()} sacks shipped`} hint />
        <ClickCard id="inspectors"   icon="👤" value={inspectors.length}       label="Inspectors"          accent="var(--green)"        sub="With assigned stations" hint />
        <ClickCard id="bags_storage" icon="📦" value={inShed.length + inWarehouse.length} label="Bags in Storage" accent="var(--amber)" sub={fmt.kg(shedWeight + warehouseWeight)} hint />
        <ClickCard id="ready_ship"   icon="✅" value={readyToShip.length}      label="Ready to Ship"       accent="var(--green)"        sub={fmt.kg(shipWeight)} hint />
        <ClickCard id="farmers"      icon="👩‍🌾" value={farmers.length}          label="Registered Farmers"  accent="var(--teal-light)"   sub={`Across ${[...new Set(farmers.map(f=>f.island).filter(Boolean))].length} islands`} hint />
      </div>

      {/* Weight by Island mini chart */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <div>
            <div className="card-title">⚖️ CPR Weight by Island</div>
            <div className="card-subtitle">Cumulative totals across all time</div>
          </div>
          <button className="btn btn-sm btn-ghost" onClick={() => onNavigate('analytics')} type="button">
            Full Analytics →
          </button>
        </div>
        <div className="mini-bar-wrap">
          {islandWeights.slice(0, 8).map((row, i) => (
            <div key={row.island} className="mini-bar-row">
              <div className="mini-bar-label" title={row.island}>{row.island}</div>
              <div className="mini-bar-track">
                <div className="mini-bar-fill" style={{
                  width: `${Math.min(100, (row.weight / maxIslandWeight) * 100)}%`,
                  background: ['var(--teal)','var(--gold)','var(--purple)','var(--green)','var(--amber)'][i % 5],
                }} />
              </div>
              <div className="mini-bar-val">{fmt.kg(row.weight)}</div>
            </div>
          ))}
          {islandWeights.length === 0 && (
            <div className="empty-state" style={{ padding: 20 }}>
              <div className="empty-state-text">No CPR data yet</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
