// src/sections/TWCMonitor.jsx
import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { fmt, sumField, csvExport } from '../utils/helpers';

export default function TWCMonitor() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [island,  setIsland]  = useState('');
  const [vessel,  setVessel]  = useState('');
  const [dateFrom,setDateFrom]= useState('');
  const [dateTo,  setDateTo]  = useState('');
  const [detail,  setDetail]  = useState(null);

  useEffect(() => {
    return onSnapshot(collection(db, 'twcEntries'), snap => {
      setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, []);

  const islands = useMemo(() => [...new Set(entries.map(e => e.island).filter(Boolean))].sort(), [entries]);
  const vessels = useMemo(() => [...new Set(entries.map(e => e.vessel_name).filter(Boolean))].sort(), [entries]);

  const filtered = useMemo(() => entries.filter(e => {
    if (island && e.island !== island) return false;
    if (vessel && e.vessel_name !== vessel) return false;
    if (dateFrom && e.date < dateFrom) return false;
    if (dateTo   && e.date > dateTo)   return false;
    if (search) {
      const q = search.toLowerCase();
      return (e.twc_number||'').toLowerCase().includes(q)
        || (e.vessel_name||'').toLowerCase().includes(q)
        || (e.cooperative_name||'').toLowerCase().includes(q)
        || (e.island||'').toLowerCase().includes(q);
    }
    return true;
  }).sort((a,b) => (b.date||'') > (a.date||'') ? 1 : -1), [entries, island, vessel, dateFrom, dateTo, search]);

  const totalWeight = sumField(filtered, 'total_weight_twc');
  const totalSacks  = filtered.reduce((s,e) => s + (parseInt(e.number_of_sacks)||0), 0);

  function handleExport() {
    csvExport(filtered.map(e => ({
      Date:         e.date || '',
      TWC_Number:   e.twc_number || '',
      Vessel:       e.vessel_name || '',
      Island:       e.island || '',
      Cooperative:  e.cooperative_name || '',
      Inspector:    e.inspectorEmail || e.copra_inspector_name || '',
      Sacks:        e.number_of_sacks || '',
      Weight_kg:    e.total_weight_twc || '',
      Comments:     e.comments || '',
    })), `KCDL_TWC_Records_${new Date().toISOString().slice(0,10)}.csv`);
  }

  if (loading) return <div className="spinner-wrap"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">🚢 TWC Records</div>
          <div className="page-subtitle">Truck Weighbridge Certificates — all island stations</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={handleExport} type="button">⬇ Export CSV</button>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
        {[
          { icon:'🚢', val: entries.length, lbl:'Total TWCs', col:'var(--purple)' },
          { icon:'📦', val: totalSacks.toLocaleString(), lbl:'Total Sacks', col:'var(--teal)' },
          { icon:'⚖️', val: fmt.kg(totalWeight), lbl:'Total Weight', col:'var(--gold)' },
          { icon:'🛳️', val: vessels.length, lbl:'Vessels', col:'var(--green)' },
        ].map(s => (
          <div key={s.lbl} className="stat-card" style={{ '--accent-color': s.col }}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-value" style={{ fontSize:'1.4rem' }}>{s.val}</div>
            <div className="stat-label">{s.lbl}</div>
          </div>
        ))}
      </div>

      <div className="toolbar">
        <div className="search-bar">
          <input placeholder="Search TWC#, vessel, cooperative…" value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-select" style={{ width: 160 }} value={island} onChange={e => setIsland(e.target.value)}>
          <option value="">All Islands</option>
          {islands.map(i => <option key={i} value={i}>{i}</option>)}
        </select>
        <select className="form-select" style={{ width: 160 }} value={vessel} onChange={e => setVessel(e.target.value)}>
          <option value="">All Vessels</option>
          {vessels.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <input type="date" className="form-input" style={{ width: 145 }} value={dateFrom}
          onChange={e => setDateFrom(e.target.value)} />
        <span style={{ color:'var(--text-muted)', fontSize:'0.8rem' }}>to</span>
        <input type="date" className="form-input" style={{ width: 145 }} value={dateTo}
          onChange={e => setDateTo(e.target.value)} />
        {(island||vessel||dateFrom||dateTo||search) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setIsland(''); setVessel(''); setDateFrom(''); setDateTo(''); setSearch(''); }} type="button">✕ Clear</button>
        )}
      </div>

      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>TWC No.</th>
              <th>Vessel</th>
              <th>Island</th>
              <th>Cooperative</th>
              <th>Inspector</th>
              <th>Sacks</th>
              <th>Weight (kg)</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(e => (
              <tr key={e.id}>
                <td className="tbl-mono">{fmt.date(e.date)}</td>
                <td className="tbl-mono" style={{ color:'var(--purple)', fontWeight:700 }}>{e.twc_number || '—'}</td>
                <td style={{ fontWeight:600, color:'var(--teal-light)' }}>{e.vessel_name || '—'}</td>
                <td>{e.island || '—'}</td>
                <td>{e.cooperative_name || '—'}</td>
                <td style={{ color:'var(--text-muted)', fontSize:'0.78rem' }}>{e.inspectorEmail || e.copra_inspector_name || '—'}</td>
                <td className="tbl-mono" style={{ fontWeight:700 }}>{e.number_of_sacks || '—'}</td>
                <td className="tbl-mono" style={{ fontWeight:700, color:'var(--gold)' }}>
                  {e.total_weight_twc ? (+e.total_weight_twc).toLocaleString('en',{minimumFractionDigits:2}) : '—'}
                </td>
                <td>
                  <button className="btn btn-ghost btn-sm" onClick={() => setDetail(e)} type="button">View</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={9} style={{ textAlign:'center', color:'var(--text-muted)', padding:40 }}>No records match filters</td></tr>
            )}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={6} style={{ padding:'10px 14px', fontWeight:700, color:'var(--text-secondary)', borderTop:'1px solid var(--border)' }}>
                  TOTAL ({filtered.length} records)
                </td>
                <td className="tbl-mono" style={{ fontWeight:700, borderTop:'1px solid var(--border)' }}>{totalSacks.toLocaleString()}</td>
                <td className="tbl-mono" style={{ fontWeight:700, color:'var(--gold)', borderTop:'1px solid var(--border)' }}>
                  {totalWeight.toLocaleString('en',{minimumFractionDigits:2})}
                </td>
                <td style={{ borderTop:'1px solid var(--border)' }} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {detail && (
        <div className="modal-overlay" onClick={() => setDetail(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">🚢 TWC Detail — {detail.twc_number || 'N/A'}</div>
              <button className="modal-close" onClick={() => setDetail(null)} type="button">✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row form-row-2">
                {[
                  ['TWC Number',   detail.twc_number],
                  ['Date',         fmt.date(detail.date)],
                  ['Vessel',       detail.vessel_name],
                  ['Island',       detail.island],
                  ['Cooperative',  detail.cooperative_name],
                  ['Inspector',    detail.inspectorEmail || detail.copra_inspector_name],
                  ['Sacks',        detail.number_of_sacks],
                  ['Total Weight', detail.total_weight_twc ? fmt.kg(detail.total_weight_twc) : '—'],
                  ['Start Time',   fmt.time12(detail.start_time)],
                  ['End Time',     fmt.time12(detail.end_time)],
                ].map(([k,v]) => (
                  <div key={k} className="form-group">
                    <div className="form-label">{k}</div>
                    <div style={{ fontSize:'0.9rem', color:'var(--text-primary)', fontWeight:600, padding:'8px 0' }}>{v || '—'}</div>
                  </div>
                ))}
              </div>
              {detail.comments && (
                <>
                  <div className="divider" />
                  <div className="form-label">Comments</div>
                  <div style={{ marginTop:8, fontSize:'0.85rem', color:'var(--text-secondary)', lineHeight:1.6 }}>{detail.comments}</div>
                </>
              )}
              {detail.twc_image_base64 && (
                <>
                  <div className="divider" />
                  <div className="form-label">TWC Photo</div>
                  <img src={`data:image/jpeg;base64,${detail.twc_image_base64}`}
                    alt="TWC" style={{ width:'100%', borderRadius:8, marginTop:8, border:'1px solid var(--border)' }} />
                </>
              )}
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setDetail(null)} type="button">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
