// src/sections/CPRMonitor.jsx
import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { fmt, sumField, csvExport } from '../utils/helpers';

export default function CPRMonitor() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [island,  setIsland]  = useState('');
  const [dateFrom,setDateFrom]= useState('');
  const [dateTo,  setDateTo]  = useState('');
  const [detail,  setDetail]  = useState(null);

  useEffect(() => {
    return onSnapshot(collection(db, 'cprEntries'), snap => {
      setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, []);

  const islands = useMemo(() => [...new Set(entries.map(e => e.island).filter(Boolean))].sort(), [entries]);

  const filtered = useMemo(() => {
    return entries.filter(e => {
      if (island && e.island !== island) return false;
      if (dateFrom && e.date < dateFrom) return false;
      if (dateTo   && e.date > dateTo)   return false;
      if (search) {
        const q = search.toLowerCase();
        return (e.cpr_number||'').toLowerCase().includes(q)
          || (e.cooperative_name||'').toLowerCase().includes(q)
          || (e.island||'').toLowerCase().includes(q)
          || (e.copra_inspector_name||'').toLowerCase().includes(q)
          || (e.inspectorEmail||'').toLowerCase().includes(q);
      }
      return true;
    }).sort((a,b) => (b.date||'') > (a.date||'') ? 1 : -1);
  }, [entries, island, dateFrom, dateTo, search]);

  const totalWeight = sumField(filtered, 'total_weight_cpr');

  function handleExport() {
    csvExport(filtered.map(e => ({
      Date:         e.date || '',
      CPR_Number:   e.cpr_number || '',
      Island:       e.island || '',
      Cooperative:  e.cooperative_name || '',
      Inspector:    e.inspectorEmail || e.copra_inspector_name || '',
      Start_Time:   e.start_time || '',
      End_Time:     e.end_time || '',
      Weight_kg:    e.total_weight_cpr || '',
      Comments:     e.comments || '',
      Station_ID:   e.stationId || '',
    })), `KCDL_CPR_Records_${new Date().toISOString().slice(0,10)}.csv`);
  }

  if (loading) return <div className="spinner-wrap"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">📋 CPR Records</div>
          <div className="page-subtitle">Copra Purchase Receipts from all outer island stations</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={handleExport} type="button">⬇ Export CSV</button>
      </div>

      {/* Summary row */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
        {[
          { icon:'📋', val: entries.length, lbl:'Total CPRs', col:'var(--teal)' },
          { icon:'🔍', val: filtered.length, lbl:'Filtered Records', col:'var(--purple)' },
          { icon:'⚖️', val: fmt.kg(totalWeight), lbl:'Filtered Weight', col:'var(--gold)' },
          { icon:'🏝️', val: islands.length, lbl:'Islands', col:'var(--green)' },
        ].map(s => (
          <div key={s.lbl} className="stat-card" style={{ '--accent-color': s.col }}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-value" style={{ fontSize: '1.4rem' }}>{s.val}</div>
            <div className="stat-label">{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="toolbar">
        <div className="search-bar">
          <input placeholder="Search CPR#, cooperative, island…" value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-select" style={{ width: 160 }} value={island} onChange={e => setIsland(e.target.value)}>
          <option value="">All Islands</option>
          {islands.map(i => <option key={i} value={i}>{i}</option>)}
        </select>
        <input type="date" className="form-input" style={{ width: 150 }} value={dateFrom}
          onChange={e => setDateFrom(e.target.value)} />
        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>to</span>
        <input type="date" className="form-input" style={{ width: 150 }} value={dateTo}
          onChange={e => setDateTo(e.target.value)} />
        {(island||dateFrom||dateTo||search) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setIsland(''); setDateFrom(''); setDateTo(''); setSearch(''); }} type="button">
            ✕ Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>CPR No.</th>
              <th>Island</th>
              <th>Cooperative</th>
              <th>Inspector</th>
              <th>Start</th>
              <th>End</th>
              <th>Weight (kg)</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(e => (
              <tr key={e.id}>
                <td className="tbl-mono">{fmt.date(e.date)}</td>
                <td className="tbl-mono" style={{ color: 'var(--teal-light)', fontWeight: 700 }}>{e.cpr_number || '—'}</td>
                <td style={{ fontWeight: 600 }}>{e.island || '—'}</td>
                <td>{e.cooperative_name || '—'}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                  {e.inspectorEmail || e.copra_inspector_name || '—'}
                </td>
                <td className="tbl-mono">{fmt.time12(e.start_time)}</td>
                <td className="tbl-mono">{fmt.time12(e.end_time)}</td>
                <td className="tbl-mono" style={{ fontWeight: 700, color: 'var(--gold)' }}>
                  {e.total_weight_cpr ? (+e.total_weight_cpr).toLocaleString('en',{minimumFractionDigits:2}) : '—'}
                </td>
                <td>
                  <button className="btn btn-ghost btn-sm" onClick={() => setDetail(e)} type="button">View</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={9} style={{ textAlign:'center', color:'var(--text-muted)', padding:40 }}>
                No records match the current filters
              </td></tr>
            )}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={7} style={{ padding:'10px 14px', fontWeight:700, color:'var(--text-secondary)', borderTop:'1px solid var(--border)' }}>
                  TOTAL ({filtered.length} records)
                </td>
                <td className="tbl-mono" style={{ fontWeight:700, color:'var(--gold)', borderTop:'1px solid var(--border)' }}>
                  {totalWeight.toLocaleString('en',{minimumFractionDigits:2})}
                </td>
                <td style={{ borderTop:'1px solid var(--border)' }} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Detail modal */}
      {detail && (
        <div className="modal-overlay" onClick={() => setDetail(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-head">
              <div className="modal-title">📋 CPR Detail — {detail.cpr_number || 'N/A'}</div>
              <button className="modal-close" onClick={() => setDetail(null)} type="button">✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row form-row-2">
                {[
                  ['CPR Number',   detail.cpr_number],
                  ['Date',         fmt.date(detail.date)],
                  ['Island',       detail.island],
                  ['Cooperative',  detail.cooperative_name],
                  ['Inspector',    detail.inspectorEmail || detail.copra_inspector_name],
                  ['Station ID',   detail.stationId],
                  ['Start Time',   fmt.time12(detail.start_time)],
                  ['End Time',     fmt.time12(detail.end_time)],
                  ['Total Weight', detail.total_weight_cpr ? fmt.kg(detail.total_weight_cpr) : '—'],
                  ['Synced At',    fmt.datetime(detail.savedAt)],
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
              {detail.cpr_image_base64 && (
                <>
                  <div className="divider" />
                  <div className="form-label">CPR Photo</div>
                  <img src={`data:image/jpeg;base64,${detail.cpr_image_base64}`}
                    alt="CPR" style={{ width:'100%', borderRadius:8, marginTop:8, border:'1px solid var(--border)' }} />
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
