// src/sections/FarmersMonitor.jsx
import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { fmt, csvExport } from '../utils/helpers';

export default function FarmersMonitor() {
  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [gender,  setGender]  = useState('');
  const [station, setStation] = useState('');
  const [detail,  setDetail]  = useState(null);

  useEffect(() => {
    return onSnapshot(collection(db, 'farmers'), snap => {
      setFarmers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, []);

  const stations = useMemo(() => [...new Set(farmers.map(f => f.stationId).filter(Boolean))].sort(), [farmers]);

  const filtered = useMemo(() => farmers.filter(f => {
    if (gender  && f.gender  !== gender)  return false;
    if (station && f.stationId !== station) return false;
    if (search) {
      const q = search.toLowerCase();
      return (f.name||'').toLowerCase().includes(q)
        || (f.farmerId||'').toLowerCase().includes(q)
        || (f.idCard||'').toLowerCase().includes(q)
        || (f.village||'').toLowerCase().includes(q)
        || (f.phone||'').includes(q);
    }
    return true;
  }).sort((a,b) => (a.name||'').localeCompare(b.name||'')), [farmers, gender, station, search]);

  const genderCounts = useMemo(() => ({
    Male:   farmers.filter(f => f.gender === 'Male').length,
    Female: farmers.filter(f => f.gender === 'Female').length,
    Other:  farmers.filter(f => f.gender && f.gender !== 'Male' && f.gender !== 'Female').length,
  }), [farmers]);

  function handleExport() {
    csvExport(filtered.map(f => ({
      Farmer_ID: f.farmerId || '',
      Name:      f.name || '',
      ID_Card:   f.idCard || '',
      Village:   f.village || '',
      Gender:    f.gender || '',
      Phone:     f.phone || '',
      WhatsApp:  f.whatsapp || '',
      Email:     f.email || '',
      Station:   f.stationId || '',
    })), `KCDL_Farmers_${new Date().toISOString().slice(0,10)}.csv`);
  }

  if (loading) return <div className="spinner-wrap"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">👩‍🌾 Farmers Registry</div>
          <div className="page-subtitle">All registered copra farmers across all stations</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={handleExport} type="button">⬇ Export CSV</button>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
        {[
          { icon:'👥', val: farmers.length, lbl:'Total Farmers', col:'var(--teal)' },
          { icon:'♂',  val: genderCounts.Male, lbl:'Male Farmers', col:'var(--purple)' },
          { icon:'♀',  val: genderCounts.Female, lbl:'Female Farmers', col:'var(--gold)' },
          { icon:'🏝️', val: stations.length, lbl:'Stations', col:'var(--green)' },
        ].map(s => (
          <div key={s.lbl} className="stat-card" style={{ '--accent-color': s.col }}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-value" style={{ fontSize:'1.6rem' }}>{s.val}</div>
            <div className="stat-label">{s.lbl}</div>
          </div>
        ))}
      </div>

      <div className="toolbar">
        <div className="search-bar">
          <input placeholder="Search name, ID, village, phone…" value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-select" style={{ width: 140 }} value={gender} onChange={e => setGender(e.target.value)}>
          <option value="">All Genders</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </select>
        <select className="form-select" style={{ width: 180 }} value={station} onChange={e => setStation(e.target.value)}>
          <option value="">All Stations</option>
          {stations.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {(gender||station||search) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setGender(''); setStation(''); setSearch(''); }} type="button">✕ Clear</button>
        )}
        <div style={{ marginLeft:'auto', fontSize:'0.82rem', color:'var(--text-muted)' }}>
          {filtered.length} of {farmers.length} farmers
        </div>
      </div>

      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>Farmer ID</th>
              <th>Name</th>
              <th>ID Card</th>
              <th>Village</th>
              <th>Gender</th>
              <th>Phone</th>
              <th>WhatsApp</th>
              <th>Station</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(f => (
              <tr key={f.id}>
                <td className="tbl-mono" style={{ color:'var(--teal-light)', fontWeight:700 }}>{f.farmerId || '—'}</td>
                <td style={{ fontWeight:600 }}>{f.name || '—'}</td>
                <td className="tbl-mono">{f.idCard || '—'}</td>
                <td>{f.village || '—'}</td>
                <td>
                  {f.gender ? (
                    <span className={`tbl-badge ${f.gender==='Female'?'badge-purple':'badge-teal'}`}>{f.gender}</span>
                  ) : '—'}
                </td>
                <td className="tbl-mono">{f.phone || '—'}</td>
                <td className="tbl-mono" style={{ color:'var(--green)' }}>{f.whatsapp || '—'}</td>
                <td style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>{f.stationId || '—'}</td>
                <td>
                  <button className="btn btn-ghost btn-sm" onClick={() => setDetail(f)} type="button">View</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={9} style={{ textAlign:'center', color:'var(--text-muted)', padding:40 }}>No farmers found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {detail && (
        <div className="modal-overlay" onClick={() => setDetail(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">👩‍🌾 Farmer Profile — {detail.farmerId}</div>
              <button className="modal-close" onClick={() => setDetail(null)} type="button">✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:20 }}>
                <div style={{ width:52, height:52, borderRadius:'50%', background:'var(--teal)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.4rem', fontWeight:700, color:'#fff', flexShrink:0 }}>
                  {detail.gender === 'Female' ? '♀' : '♂'}
                </div>
                <div>
                  <div style={{ fontSize:'1.1rem', fontWeight:800, color:'var(--text-primary)' }}>{detail.name || 'N/A'}</div>
                  <div style={{ fontSize:'0.78rem', color:'var(--teal-light)', fontFamily:'var(--font-mono)' }}>{detail.farmerId}</div>
                  <div style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>Station: {detail.stationId || '—'}</div>
                </div>
              </div>
              <div className="form-row form-row-2">
                {[
                  ['ID Card',    detail.idCard],
                  ['Village',    detail.village],
                  ['Gender',     detail.gender],
                  ['Phone',      detail.phone],
                  ['WhatsApp',   detail.whatsapp],
                  ['Email',      detail.email],
                  ['Registered', fmt.datetime(detail.createdAt)],
                  ['Updated',    fmt.datetime(detail.updatedAt)],
                ].map(([k,v]) => (
                  <div key={k} className="form-group">
                    <div className="form-label">{k}</div>
                    <div style={{ fontSize:'0.88rem', color:'var(--text-primary)', fontWeight:600, padding:'6px 0' }}>{v || '—'}</div>
                  </div>
                ))}
              </div>
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
