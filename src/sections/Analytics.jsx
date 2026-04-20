// src/sections/Analytics.jsx
import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { fmt, sumField, groupBy } from '../utils/helpers';

const PALETTE = ['#007c91','#e8a000','#8b5cf6','#22c55e','#ef4444','#f59e0b','#00a5bf','#6366f1'];

function BarChart({ data, height = 160, valueKey = 'value', labelKey = 'label', color = '#007c91', valueFormatter = v => v }) {
  const max = Math.max(...data.map(d => d[valueKey]), 1);
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:6, height, paddingBottom:24, position:'relative', overflowX:'auto' }}>
      {data.map((d, i) => {
        const pct = (d[valueKey] / max) * 100;
        return (
          <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', flex:1, minWidth:40, position:'relative' }} title={`${d[labelKey]}: ${valueFormatter(d[valueKey])}`}>
            <div style={{
              fontSize:'0.62rem', color:'var(--text-muted)', marginBottom:4, fontFamily:'var(--font-mono)',
              whiteSpace:'nowrap', maxWidth:60, overflow:'hidden', textOverflow:'ellipsis',
            }}>
              {valueFormatter(d[valueKey])}
            </div>
            <div style={{
              width:'100%', background: typeof color === 'string' ? color : PALETTE[i % PALETTE.length],
              borderRadius:'4px 4px 0 0', transition:'height 0.6s ease',
              height: `${pct}%`, minHeight: d[valueKey] > 0 ? 4 : 0,
            }} />
            <div style={{
              position:'absolute', bottom:0, left:'50%', transform:'translateX(-50%)',
              fontSize:'0.62rem', color:'var(--text-muted)', whiteSpace:'nowrap',
              maxWidth:60, overflow:'hidden', textOverflow:'ellipsis',
            }}>
              {d[labelKey]}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DonutChart({ data, size = 160 }) {
  const total = data.reduce((s,d) => s + d.value, 0);
  if (total === 0) return <div style={{ textAlign:'center', color:'var(--text-muted)', padding:30 }}>No data</div>;

  let cumulative = 0;
  const segments = data.map((d, i) => {
    const pct   = d.value / total;
    const start = cumulative;
    cumulative += pct;
    const startAngle = start * 2 * Math.PI - Math.PI / 2;
    const endAngle   = cumulative * 2 * Math.PI - Math.PI / 2;
    const r   = size / 2 - 14;
    const cx  = size / 2;
    const cy  = size / 2;
    const x1  = cx + r * Math.cos(startAngle);
    const y1  = cy + r * Math.sin(startAngle);
    const x2  = cx + r * Math.cos(endAngle);
    const y2  = cy + r * Math.sin(endAngle);
    const large = pct > 0.5 ? 1 : 0;

    return {
      ...d,
      color: PALETTE[i % PALETTE.length],
      d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`,
    };
  });

  return (
    <div style={{ display:'flex', gap:20, alignItems:'center' }}>
      <svg width={size} height={size} style={{ flexShrink:0 }}>
        {segments.map((s, i) => (
          <path key={i} d={s.d} fill={s.color} stroke="var(--navy-card)" strokeWidth={2} />
        ))}
        <circle cx={size/2} cy={size/2} r={size/2-34} fill="var(--navy-card)" />
      </svg>
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {segments.map((s, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:8, fontSize:'0.78rem' }}>
            <div style={{ width:10, height:10, borderRadius:3, background:s.color, flexShrink:0 }} />
            <span style={{ color:'var(--text-secondary)' }}>{s.label}</span>
            <span style={{ fontFamily:'var(--font-mono)', color:'var(--text-primary)', fontWeight:700 }}>
              {((s.value/total)*100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Analytics() {
  const [cprs,   setCprs]   = useState([]);
  const [twcs,   setTwcs]   = useState([]);
  const [stock,  setStock]  = useState([]);
  const [loading,setLoading]= useState(true);

  useEffect(() => {
    const u1 = onSnapshot(collection(db,'cprEntries'),  s => setCprs(s.docs.map(d=>({id:d.id,...d.data()}))));
    const u2 = onSnapshot(collection(db,'twcEntries'),  s => setTwcs(s.docs.map(d=>({id:d.id,...d.data()}))));
    const u3 = onSnapshot(collection(db,'shedStock'),   s => { setStock(s.docs.map(d=>({id:d.id,...d.data()}))); setLoading(false); });
    return () => { u1(); u2(); u3(); };
  }, []);

  // Weight by island
  const islandData = useMemo(() => {
    const g = groupBy(cprs, 'island');
    return Object.entries(g)
      .map(([label, items]) => ({ label: label || 'Unknown', value: sumField(items,'total_weight_cpr') }))
      .sort((a,b) => b.value - a.value)
      .slice(0, 10);
  }, [cprs]);

  // Monthly CPR weight trend (last 12 months)
  const monthlyData = useMemo(() => {
    const months = {};
    const now = new Date();
    for (let i=11; i>=0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      const label = d.toLocaleDateString('en-GB', { month:'short', year:'2-digit' });
      months[key] = { label, value: 0 };
    }
    cprs.forEach(c => {
      const m = (c.date||'').slice(0,7);
      if (months[m]) months[m].value += parseFloat(c.total_weight_cpr)||0;
    });
    return Object.values(months);
  }, [cprs]);

  // Stock status donut
  const stockStatusData = useMemo(() => [
    { label:'Recently Weighed', value: stock.filter(s=>s.status==='recently_weighed').length },
    { label:'In Shed',          value: stock.filter(s=>s.status==='in_shed').length },
    { label:'In Warehouse',     value: stock.filter(s=>s.status==='in_warehouse').length },
    { label:'Ready to Ship',    value: stock.filter(s=>s.status==='ready_to_ship').length },
    { label:'Shipped',          value: stock.filter(s=>s.status==='shipped').length },
  ].filter(d => d.value > 0), [stock]);

  // Gender breakdown farmers (from stock farmer info)
  const topCoops = useMemo(() => {
    const g = groupBy(cprs, 'cooperative_name');
    return Object.entries(g)
      .map(([label, items]) => ({ label: label || 'Unknown', value: items.length }))
      .sort((a,b) => b.value - a.value)
      .slice(0, 8);
  }, [cprs]);

  // Weekly CPR count (last 8 weeks)
  const weeklyData = useMemo(() => {
    const weeks = [];
    const now = new Date();
    for (let i=7; i>=0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i*7);
      const weekStart = new Date(d); weekStart.setDate(d.getDate() - d.getDay());
      const weekEnd   = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6);
      const s = weekStart.toISOString().slice(0,10);
      const e = weekEnd.toISOString().slice(0,10);
      const cnt = cprs.filter(c => c.date >= s && c.date <= e).length;
      weeks.push({ label:`W${8-i}`, value: cnt });
    }
    return weeks;
  }, [cprs]);

  if (loading) return <div className="spinner-wrap"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">📈 Analytics</div>
          <div className="page-subtitle">Production trends, island performance and stock intelligence</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.78rem', color:'var(--text-muted)', alignSelf:'center' }}>
            Based on {cprs.length} CPRs · {twcs.length} TWCs · {stock.length} bags
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="stat-grid" style={{ gridTemplateColumns:'repeat(4,1fr)', marginBottom:20 }}>
        {[
          { icon:'⚖️', val: fmt.kg(sumField(cprs,'total_weight_cpr')), lbl:'All-Time CPR Weight', col:'var(--gold)' },
          { icon:'🚢', val: fmt.kg(sumField(twcs,'total_weight_twc')), lbl:'All-Time TWC Weight', col:'var(--purple)' },
          { icon:'📦', val: stock.length, lbl:'Total Bags Processed', col:'var(--teal)' },
          { icon:'✅', val: fmt.kg(sumField(stock.filter(s=>s.status==='ready_to_ship'),'stationWeight')), lbl:'Pending Shipment', col:'var(--green)' },
        ].map(s => (
          <div key={s.lbl} className="stat-card" style={{ '--accent-color':s.col }}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-value" style={{ fontSize: s.val.toString().length > 8 ? '1rem':'1.4rem' }}>{s.val}</div>
            <div className="stat-label">{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* Charts grid */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        {/* Monthly trend */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">📅 Monthly CPR Weight Trend</div>
              <div className="card-subtitle">Last 12 months (kg)</div>
            </div>
          </div>
          <BarChart data={monthlyData} height={180} color="var(--teal)" valueFormatter={v => (v/1000).toFixed(1)+'t'} />
        </div>

        {/* Weight by island */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">🏝️ CPR Weight by Island</div>
              <div className="card-subtitle">Cumulative (kg) — top 10</div>
            </div>
          </div>
          <BarChart data={islandData} height={180} color="var(--gold)" valueFormatter={v => (v/1000).toFixed(1)+'t'} />
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        {/* Stock status donut */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">📦 Bag Stock Distribution</div>
              <div className="card-subtitle">Current status breakdown</div>
            </div>
          </div>
          <DonutChart data={stockStatusData} size={160} />
        </div>

        {/* Weekly CPR count */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">📋 Weekly CPR Sessions</div>
              <div className="card-subtitle">Last 8 weeks</div>
            </div>
          </div>
          <BarChart data={weeklyData} height={160} color="var(--purple)" valueFormatter={v => v.toString()} />
        </div>
      </div>

      {/* Top cooperatives */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">🤝 Top Cooperatives by Sessions</div>
            <div className="card-subtitle">Number of CPR sessions recorded</div>
          </div>
        </div>
        <div className="mini-bar-wrap">
          {topCoops.map((row, i) => {
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
          {topCoops.length === 0 && <div className="empty-state" style={{padding:20}}><div className="empty-state-text">No data</div></div>}
        </div>
      </div>
    </div>
  );
}
