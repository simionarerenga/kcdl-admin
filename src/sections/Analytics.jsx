// src/sections/Analytics.jsx
import { useState, useEffect, useMemo, useRef } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { fmt, sumField, groupBy } from '../utils/helpers';

const PALETTE = ['#007c91','#e8a000','#8b5cf6','#22c55e','#ef4444','#f59e0b','#00a5bf','#6366f1'];

/* ─── Bar chart (horizontally scrollable) ────────────── */
function BarChart({ data, height = 180, valueKey = 'value', labelKey = 'label', color = '#007c91', valueFormatter = v => v }) {
  const max = Math.max(...data.map(d => d[valueKey]), 1);
  const barW = Math.max(44, Math.floor(300 / Math.max(data.length, 1)));
  const totalW = data.length * (barW + 6);
  return (
    <div style={{ overflowX: 'auto', overflowY: 'hidden', WebkitOverflowScrolling: 'touch' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height, paddingBottom: 28, minWidth: totalW, position: 'relative' }}>
        {data.map((d, i) => {
          const pct = (d[valueKey] / max) * 100;
          return (
            <div key={i}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: barW, flexShrink: 0, position: 'relative' }}
              title={`${d[labelKey]}: ${valueFormatter(d[valueKey])}`}
            >
              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: 4, fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                {valueFormatter(d[valueKey])}
              </div>
              <div style={{
                width: '100%',
                background: typeof color === 'string' ? color : PALETTE[i % PALETTE.length],
                borderRadius: '4px 4px 0 0', transition: 'height 0.6s ease',
                height: `${pct}%`, minHeight: d[valueKey] > 0 ? 4 : 0,
              }} />
              <div style={{
                position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
                fontSize: '0.6rem', color: 'var(--text-muted)', whiteSpace: 'nowrap',
              }}>
                {d[labelKey]}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Donut chart ─────────────────────────────────────── */
function DonutChart({ data, size = 150 }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>No data</div>;
  let cum = 0;
  const segments = data.map((d, i) => {
    const pct = d.value / total, start = cum; cum += pct;
    const sa = start * 2 * Math.PI - Math.PI / 2, ea = cum * 2 * Math.PI - Math.PI / 2;
    const r = size / 2 - 14, cx = size / 2, cy = size / 2;
    return { ...d, color: PALETTE[i % PALETTE.length], pct,
      d: `M ${cx} ${cy} L ${cx+r*Math.cos(sa)} ${cy+r*Math.sin(sa)} A ${r} ${r} 0 ${pct>.5?1:0} 1 ${cx+r*Math.cos(ea)} ${cy+r*Math.sin(ea)} Z` };
  });
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
      <svg width={size} height={size} style={{ flexShrink: 0 }}>
        {segments.map((s, i) => <path key={i} d={s.d} fill={s.color} stroke="var(--surface)" strokeWidth={2} />)}
        <circle cx={size/2} cy={size/2} r={size/2-34} fill="var(--surface)" />
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {segments.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem' }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flexShrink: 0 }} />
            <span style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 700 }}>
              {(s.pct * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Breadcrumb ─────────────────────────────────────── */
function Breadcrumb({ label, onBack }) {
  useEffect(() => {
    window.history.pushState({ analyticsDetail: true }, '');
    function onPop() { onBack(); }
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [onBack]);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
      <button type="button" className="btn btn-sm btn-ghost" onClick={onBack}
        style={{ gap: 4, color: 'var(--teal)', fontFamily: 'var(--font-head)', fontWeight: 600 }}>
        ← Analytics
      </button>
      <span style={{ color: 'var(--teal)', fontWeight: 700, fontSize: '1rem' }}>›</span>
      <span style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: '1.05rem', color: 'var(--teal)' }}>{label}</span>
    </div>
  );
}

/* ─── Dropdown ────────────────────────────────────────── */
function Dropdown({ trigger, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    function onOut(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    if (open) document.addEventListener('mousedown', onOut);
    return () => document.removeEventListener('mousedown', onOut);
  }, [open]);
  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block', zIndex: 100 }}>
      <div onClick={() => setOpen(o => !o)}>{trigger}</div>
      {open && (
        <div style={{
          position: 'absolute', left: 0, top: 'calc(100% + 6px)',
          background: 'var(--surface)', border: '1.5px solid var(--border-mid)',
          borderRadius: 10, boxShadow: 'var(--shadow-lg)', zIndex: 9999,
          minWidth: 240, overflow: 'hidden',
        }}>
          {typeof children === 'function' ? children(() => setOpen(false)) : children}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════
   DETAIL SCREENS
═══════════════════════════ */

function DetailMonthlyTrend({ monthlyData, onBack }) {
  return (
    <div>
      <Breadcrumb label="Monthly CPR Weight Trend" onBack={onBack} />
      <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: 4 }}>Monthly CPR Weight Trend</div>
      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 16 }}>Last 12 months — kg</div>
      <div className="card" style={{ marginBottom: 16, overflowX: 'auto' }}>
        <BarChart data={monthlyData} height={200} color="var(--teal)" valueFormatter={v => (v/1000).toFixed(1)+'t'} />
      </div>
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th><th>Month</th>
              <th style={{ textAlign:'right' }}>Weight (kg)</th>
              <th style={{ textAlign:'right' }}>Weight (t)</th>
            </tr>
          </thead>
          <tbody>
            {monthlyData.map((r, i) => (
              <tr key={r.label}>
                <td style={{ color:'var(--text-muted)', fontSize:'0.78rem' }}>{i+1}</td>
                <td style={{ fontWeight:600 }}>{r.label}</td>
                <td style={{ textAlign:'right', fontFamily:'var(--font-mono)' }}>{r.value.toLocaleString()}</td>
                <td style={{ textAlign:'right', fontFamily:'var(--font-mono)', color:'var(--teal)', fontWeight:700 }}>{(r.value/1000).toFixed(2)}t</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} style={{ fontWeight:700 }}>Total</td>
              <td style={{ textAlign:'right', fontWeight:700, fontFamily:'var(--font-mono)' }}>{monthlyData.reduce((s,r)=>s+r.value,0).toLocaleString()}</td>
              <td style={{ textAlign:'right', fontWeight:700, fontFamily:'var(--font-mono)' }}>{(monthlyData.reduce((s,r)=>s+r.value,0)/1000).toFixed(2)}t</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function DetailWeeklySessions({ weeklyData, onBack }) {
  return (
    <div>
      <Breadcrumb label="Weekly CPR Sessions" onBack={onBack} />
      <div style={{ fontWeight:700, fontSize:'1rem', color:'var(--text-primary)', marginBottom:4 }}>Weekly CPR Sessions</div>
      <div style={{ fontSize:'0.78rem', color:'var(--text-muted)', marginBottom:16 }}>Last 8 weeks — number of sessions</div>
      <div className="card" style={{ marginBottom:16 }}>
        <BarChart data={weeklyData} height={180} color="var(--purple)" valueFormatter={v => v.toString()} />
      </div>
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr><th>Week</th><th style={{ textAlign:'right' }}>CPR Sessions</th></tr>
          </thead>
          <tbody>
            {weeklyData.map(r => (
              <tr key={r.label}>
                <td style={{ fontWeight:600 }}>{r.label}</td>
                <td style={{ textAlign:'right', fontFamily:'var(--font-mono)', fontWeight:700, color:'var(--purple)' }}>{r.value}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td style={{ fontWeight:700 }}>Total</td>
              <td style={{ textAlign:'right', fontWeight:700, fontFamily:'var(--font-mono)' }}>{weeklyData.reduce((s,r)=>s+r.value,0)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function DetailTopCoops({ topCoops, onBack }) {
  const max = topCoops[0]?.value || 1;
  return (
    <div>
      <Breadcrumb label="Top Cooperatives by Sessions" onBack={onBack} />
      <div style={{ fontWeight:700, fontSize:'1rem', color:'var(--text-primary)', marginBottom:4 }}>Top Cooperatives by CPR Sessions</div>
      <div style={{ fontSize:'0.78rem', color:'var(--text-muted)', marginBottom:16 }}>{topCoops.length} cooperatives ranked by session count</div>
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th><th>Cooperative</th>
              <th style={{ textAlign:'right' }}>Sessions</th>
              <th style={{ textAlign:'right' }}>% Share</th>
              <th>Bar</th>
            </tr>
          </thead>
          <tbody>
            {topCoops.map((r, i) => (
              <tr key={r.label}>
                <td style={{ color:'var(--text-muted)', fontSize:'0.78rem' }}>{i+1}</td>
                <td style={{ fontWeight:600 }}>{r.label}</td>
                <td style={{ textAlign:'right', fontFamily:'var(--font-mono)', fontWeight:700, color: PALETTE[i%PALETTE.length] }}>{r.value}</td>
                <td style={{ textAlign:'right', color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>
                  {max > 0 ? ((r.value/topCoops.reduce((s,x)=>s+x.value,0))*100).toFixed(1)+'%' : '—'}
                </td>
                <td style={{ width:120 }}>
                  <div style={{ height:8, background:'var(--bg)', borderRadius:99, overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:99, background: PALETTE[i%PALETTE.length], width:`${(r.value/max)*100}%`, transition:'width 0.5s' }} />
                  </div>
                </td>
              </tr>
            ))}
            {topCoops.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign:'center', padding:32, color:'var(--text-muted)' }}>No data</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DetailBagStock({ stockStatusData, stock, onBack }) {
  const total = stockStatusData.reduce((s,d)=>s+d.value,0);
  return (
    <div>
      <Breadcrumb label="Bag Stock Distribution" onBack={onBack} />
      <div style={{ fontWeight:700, fontSize:'1rem', color:'var(--text-primary)', marginBottom:4 }}>Bag Stock Distribution</div>
      <div style={{ fontSize:'0.78rem', color:'var(--text-muted)', marginBottom:16 }}>{total} bags total — current status breakdown</div>
      <div className="card" style={{ marginBottom:16 }}>
        <DonutChart data={stockStatusData} size={160} />
      </div>
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th style={{ textAlign:'right' }}>Bags</th>
              <th style={{ textAlign:'right' }}>% of Total</th>
            </tr>
          </thead>
          <tbody>
            {stockStatusData.map((r, i) => (
              <tr key={r.label}>
                <td style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:10, height:10, borderRadius:3, background: PALETTE[i%PALETTE.length], flexShrink:0 }} />
                  <span style={{ fontWeight:600 }}>{r.label}</span>
                </td>
                <td style={{ textAlign:'right', fontFamily:'var(--font-mono)', fontWeight:700, color: PALETTE[i%PALETTE.length] }}>{r.value}</td>
                <td style={{ textAlign:'right', color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>
                  {total > 0 ? ((r.value/total)*100).toFixed(1)+'%' : '—'}
                </td>
              </tr>
            ))}
            {stockStatusData.length === 0 && (
              <tr><td colSpan={3} style={{ textAlign:'center', padding:32, color:'var(--text-muted)' }}>No data</td></tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td style={{ fontWeight:700 }}>Total</td>
              <td style={{ textAlign:'right', fontWeight:700, fontFamily:'var(--font-mono)' }}>{total}</td>
              <td style={{ textAlign:'right', fontWeight:700 }}>100%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

/* ═══════════════════════════
   MAIN ANALYTICS
═══════════════════════════ */
const VIEWS = [
  { id: 'monthly',  label: '📅 Monthly CPR Weight Trend' },
  { id: 'weekly',   label: '📋 Weekly CPR Sessions' },
  { id: 'coops',    label: '🤝 Top Cooperatives by Sessions' },
  { id: 'bagstock', label: '📦 Bag Stock Distribution' },
];

export default function Analytics() {
  const [cprs,    setCprs]    = useState([]);
  const [twcs,    setTwcs]    = useState([]);
  const [stock,   setStock]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail,  setDetail]  = useState(null);

  useEffect(() => {
    const u1 = onSnapshot(collection(db,'cprEntries'),  s => setCprs(s.docs.map(d=>({id:d.id,...d.data()}))));
    const u2 = onSnapshot(collection(db,'twcEntries'),  s => setTwcs(s.docs.map(d=>({id:d.id,...d.data()}))));
    const u3 = onSnapshot(collection(db,'shedStock'),   s => { setStock(s.docs.map(d=>({id:d.id,...d.data()}))); setLoading(false); });
    return () => { u1(); u2(); u3(); };
  }, []);

  /* ── Derived data ── */
  const islandData = useMemo(() => {
    const g = groupBy(cprs, 'island');
    return Object.entries(g)
      .map(([label, items]) => ({ label: label||'Unknown', value: sumField(items,'total_weight_cpr') }))
      .sort((a,b) => b.value-a.value).slice(0,10);
  }, [cprs]);

  const monthlyData = useMemo(() => {
    const months = {};
    const now = new Date();
    for (let i=11; i>=0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
      const key   = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      const label = d.toLocaleDateString('en-GB', { month:'short', year:'2-digit' });
      months[key] = { label, value: 0 };
    }
    cprs.forEach(c => {
      const m = (c.date||'').slice(0,7);
      if (months[m]) months[m].value += parseFloat(c.total_weight_cpr)||0;
    });
    return Object.values(months);
  }, [cprs]);

  const stockStatusData = useMemo(() => [
    { label:'Recently Weighed', value: stock.filter(s=>s.status==='recently_weighed').length },
    { label:'In Shed',          value: stock.filter(s=>s.status==='in_shed').length },
    { label:'In Warehouse',     value: stock.filter(s=>s.status==='in_warehouse').length },
    { label:'Ready to Ship',    value: stock.filter(s=>s.status==='ready_to_ship').length },
    { label:'Shipped',          value: stock.filter(s=>s.status==='shipped').length },
  ].filter(d => d.value > 0), [stock]);

  const topCoops = useMemo(() => {
    const g = groupBy(cprs, 'cooperative_name');
    return Object.entries(g)
      .map(([label, items]) => ({ label: label||'Unknown', value: items.length }))
      .sort((a,b) => b.value-a.value).slice(0,12);
  }, [cprs]);

  const weeklyData = useMemo(() => {
    const weeks = [];
    const now = new Date();
    for (let i=7; i>=0; i--) {
      const d = new Date(now); d.setDate(d.getDate()-i*7);
      const ws = new Date(d); ws.setDate(d.getDate()-d.getDay());
      const we = new Date(ws); we.setDate(ws.getDate()+6);
      const s = ws.toISOString().slice(0,10), e = we.toISOString().slice(0,10);
      weeks.push({ label:`W${8-i}`, value: cprs.filter(c => c.date>=s && c.date<=e).length });
    }
    return weeks;
  }, [cprs]);

  if (loading) return <div className="spinner-wrap"><div className="spinner" /></div>;

  /* ── Detail routing ── */
  if (detail === 'monthly')  return <DetailMonthlyTrend  monthlyData={monthlyData}       onBack={() => setDetail(null)} />;
  if (detail === 'weekly')   return <DetailWeeklySessions weeklyData={weeklyData}         onBack={() => setDetail(null)} />;
  if (detail === 'coops')    return <DetailTopCoops       topCoops={topCoops}             onBack={() => setDetail(null)} />;
  if (detail === 'bagstock') return <DetailBagStock       stockStatusData={stockStatusData} stock={stock} onBack={() => setDetail(null)} />;

  return (
    <div>
      {/* Page header with Sort By dropdown */}
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div className="page-title">📈 Analytics</div>
        <Dropdown trigger={
          <button type="button" className="btn btn-primary btn-sm" style={{ gap: 6 }}>
            Sort By ▾
          </button>
        }>
          {(close) => VIEWS.map(v => (
            <button key={v.id} type="button"
              onClick={() => { setDetail(v.id); close(); }}
              style={{
                display: 'block', width: '100%', padding: '12px 18px', textAlign: 'left',
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)',
                borderBottom: '1px solid var(--border)', transition: 'background 0.12s',
              }}
              onMouseEnter={e => e.currentTarget.style.background='var(--teal-dim)'}
              onMouseLeave={e => e.currentTarget.style.background='none'}
            >
              {v.label}
            </button>
          ))}
        </Dropdown>
      </div>

      {/* KPI cards — min-height to prevent text clipping */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(2,1fr)', marginBottom: 20 }}>
        {[
          { icon:'⚖️', val: fmt.kg(sumField(cprs,'total_weight_cpr')), lbl:'All-Time CPR Weight',  col:'var(--gold)'   },
          { icon:'🚢', val: fmt.kg(sumField(twcs,'total_weight_twc')), lbl:'All-Time TWC Weight',  col:'var(--purple)' },
          { icon:'📋', val: cprs.length,                               lbl:'Total CPR Records',    col:'var(--teal)'   },
          { icon:'✅', val: fmt.kg(sumField(stock.filter(s=>s.status==='ready_to_ship'),'stationWeight')), lbl:'Pending Shipment', col:'var(--green)' },
        ].map(s => (
          <div key={s.lbl} className="stat-card"
            style={{ '--accent-color': s.col, minHeight: 110, justifyContent: 'flex-start', paddingTop: 14 }}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-value" style={{ fontSize: s.val.toString().length > 8 ? '0.95rem' : '1.3rem', lineHeight: 1.1, wordBreak:'break-all' }}>{s.val}</div>
            <div className="stat-label" style={{ marginTop: 6, whiteSpace: 'normal', lineHeight: 1.3 }}>{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* Charts — 2-col grid */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        {/* Monthly trend — horizontally scrollable, isolated */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="card-header">
            <div>
              <div className="card-title">📅 Monthly CPR Weight Trend</div>
              <div className="card-subtitle">Last 12 months (kg) — scroll →</div>
            </div>
            <button className="btn btn-sm btn-ghost" type="button" onClick={() => setDetail('monthly')}>Detail →</button>
          </div>
          {/* Scrollable wrapper — only this scrolls */}
          <div style={{ overflowX: 'auto', overflowY: 'hidden', WebkitOverflowScrolling: 'touch' }}>
            <div style={{ minWidth: 520 }}>
              <BarChart data={monthlyData} height={160} color="var(--teal)" valueFormatter={v => (v/1000).toFixed(1)+'t'} />
            </div>
          </div>
        </div>

        {/* CPR by island */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">🏝️ CPR Weight by Island</div>
              <div className="card-subtitle">Cumulative (kg) — top 10</div>
            </div>
          </div>
          <BarChart data={islandData} height={160} color="var(--gold)" valueFormatter={v => (v/1000).toFixed(1)+'t'} />
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        {/* Bag stock donut */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">📦 Bag Stock Distribution</div>
              <div className="card-subtitle">Current status breakdown</div>
            </div>
            <button className="btn btn-sm btn-ghost" type="button" onClick={() => setDetail('bagstock')}>Detail →</button>
          </div>
          <DonutChart data={stockStatusData} size={150} />
        </div>

        {/* Weekly CPR */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">📋 Weekly CPR Sessions</div>
              <div className="card-subtitle">Last 8 weeks</div>
            </div>
            <button className="btn btn-sm btn-ghost" type="button" onClick={() => setDetail('weekly')}>Detail →</button>
          </div>
          <BarChart data={weeklyData} height={160} color="var(--purple)" valueFormatter={v => v.toString()} />
        </div>
      </div>

      {/* Top cooperatives mini list */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">🤝 Top Cooperatives by Sessions</div>
            <div className="card-subtitle">Number of CPR sessions recorded</div>
          </div>
          <button className="btn btn-sm btn-ghost" type="button" onClick={() => setDetail('coops')}>Detail →</button>
        </div>
        <div className="mini-bar-wrap">
          {topCoops.slice(0,6).map((row, i) => {
            const max = topCoops[0]?.value || 1;
            return (
              <div key={row.label} className="mini-bar-row">
                <div className="mini-bar-label" title={row.label}>{row.label}</div>
                <div className="mini-bar-track">
                  <div className="mini-bar-fill" style={{ width:`${(row.value/max)*100}%`, background: PALETTE[i%PALETTE.length] }} />
                </div>
                <div className="mini-bar-val">{row.value} sessions</div>
              </div>
            );
          })}
          {topCoops.length === 0 && (
            <div style={{ textAlign:'center', padding:20, color:'var(--text-muted)', fontSize:'0.82rem' }}>No data</div>
          )}
        </div>
      </div>
    </div>
  );
}
