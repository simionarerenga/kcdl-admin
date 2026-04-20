// src/sections/StationsManager.jsx
import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { fmt } from '../utils/helpers';

const BLANK = {
  stationName: '', stationCode: '', island: '', region: '',
  contactName: '', contactPhone: '', contactEmail: '', notes: '',
};

export default function StationsManager() {
  const [stations, setStations] = useState([]);
  const [cprs,     setCprs]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(null); // null | 'add' | station obj
  const [form,     setForm]     = useState(BLANK);
  const [saving,   setSaving]   = useState(false);
  const [msg,      setMsg]      = useState('');
  const [search,   setSearch]   = useState('');

  useEffect(() => {
    const u1 = onSnapshot(collection(db,'users'), s => {
      setStations(s.docs.map(d=>({id:d.id,...d.data()})).filter(u=>u.stationId||u.stationName));
      setLoading(false);
    });
    const u2 = onSnapshot(collection(db,'cprEntries'), s => setCprs(s.docs.map(d=>({id:d.id,...d.data()}))));
    return () => { u1(); u2(); };
  }, []);

  const flash = m => { setMsg(m); setTimeout(()=>setMsg(''), 4000); };

  function openAdd() { setForm(BLANK); setModal('add'); }
  function openEdit(st) { setForm({ stationName:st.stationName||'', stationCode:st.stationCode||'', island:st.island||'', region:st.region||'', contactName:st.contactName||'', contactPhone:st.contactPhone||'', contactEmail:st.contactEmail||'', notes:st.notes||'' }); setModal(st); }

  async function handleSave() {
    if (!form.stationName.trim()) { flash('⚠️ Station name is required.'); return; }
    setSaving(true);
    try {
      if (modal === 'add') {
        await addDoc(collection(db,'stations'), { ...form, createdAt: new Date().toISOString() });
        flash('✅ Station created.');
      } else {
        await updateDoc(doc(db,'users', modal.id), { ...form, updatedAt: new Date().toISOString() });
        flash('✅ Station updated.');
      }
      setModal(null);
    } catch(e) { flash('❌ ' + e.message); }
    finally { setSaving(false); }
  }

  const filtered = stations.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (s.stationName||'').toLowerCase().includes(q)
      || (s.stationCode||'').toLowerCase().includes(q)
      || (s.island||'').toLowerCase().includes(q)
      || (s.email||'').toLowerCase().includes(q);
  });

  if (loading) return <div className="spinner-wrap"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">🏝️ Stations</div>
          <div className="page-subtitle">Manage all outer island inspection stations</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openAdd} type="button">+ Add Station</button>
      </div>

      {msg && <div className={`flash-bar ${msg.startsWith('✅')?'flash-success':'flash-error'}`}>{msg}</div>}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:24 }}>
        {[
          { icon:'📡', val:stations.length, lbl:'Total Stations', col:'var(--teal)' },
          { icon:'👤', val: stations.filter(s=>s.email).length, lbl:'Provisioned Users', col:'var(--green)' },
          { icon:'📋', val: cprs.length, lbl:'Total CPRs Filed', col:'var(--gold)' },
        ].map(s => (
          <div key={s.lbl} className="stat-card" style={{ '--accent-color':s.col }}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-value" style={{ fontSize:'1.8rem' }}>{s.val}</div>
            <div className="stat-label">{s.lbl}</div>
          </div>
        ))}
      </div>

      <div className="toolbar" style={{ marginBottom:16 }}>
        <div className="search-bar">
          <input placeholder="Search station name, island, email…" value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        {filtered.map(st => {
          const stCprs = cprs.filter(c => c.stationId === st.stationId || c.stationId === st.id);
          const initials = (st.stationName || st.email || '?').slice(0,2).toUpperCase();
          return (
            <div key={st.id} className="card" style={{ cursor:'default' }}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:14, marginBottom:14 }}>
                <div style={{ width:46, height:46, borderRadius:12, background:'var(--teal)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1rem', fontWeight:800, color:'#fff', flexShrink:0 }}>
                  {initials}
                </div>
                <div style={{ flex:1, overflow:'hidden' }}>
                  <div style={{ fontFamily:'var(--font-head)', fontWeight:700, fontSize:'1rem', color:'var(--text-primary)' }}>
                    {st.stationName || 'Unnamed Station'}
                  </div>
                  <div style={{ fontSize:'0.75rem', color:'var(--teal-light)', fontFamily:'var(--font-mono)' }}>
                    {st.stationCode || st.stationId || st.id}
                  </div>
                  <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginTop:2 }}>
                    {st.island || '—'} {st.region ? `· ${st.region}` : ''}
                  </div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => openEdit(st)} type="button">Edit</button>
              </div>

              <div className="divider" style={{ margin:'10px 0' }} />

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {[
                  ['👤 Inspector', st.email || '—'],
                  ['📋 CPRs Filed', stCprs.length],
                  ['📞 Contact', st.contactPhone || st.phone || '—'],
                  ['🏝️ Island', st.island || '—'],
                ].map(([k,v]) => (
                  <div key={k}>
                    <div style={{ fontSize:'0.68rem', color:'var(--text-muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.4px' }}>{k}</div>
                    <div style={{ fontSize:'0.82rem', color:'var(--text-secondary)', marginTop:2, fontFamily: k.includes('CPR') ? 'var(--font-mono)':undefined }}>{v}</div>
                  </div>
                ))}
              </div>

              {st.notes && (
                <div style={{ marginTop:12, fontSize:'0.75rem', color:'var(--text-muted)', background:'var(--navy)', borderRadius:6, padding:'8px 10px', lineHeight:1.5 }}>
                  📝 {st.notes}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="empty-state"><div className="empty-state-icon">📡</div><div className="empty-state-text">No stations found</div></div>
      )}

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">{modal==='add' ? '+ New Station' : `Edit Station — ${modal.stationName || ''}`}</div>
              <button className="modal-close" onClick={() => setModal(null)} type="button">✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row form-row-2">
                <div className="form-group">
                  <label className="form-label">Station Name *</label>
                  <input className="form-input" value={form.stationName} onChange={e=>setForm(f=>({...f,stationName:e.target.value}))} placeholder="e.g. Tabiteuea Station" />
                </div>
                <div className="form-group">
                  <label className="form-label">Station Code</label>
                  <input className="form-input" value={form.stationCode} onChange={e=>setForm(f=>({...f,stationCode:e.target.value}))} placeholder="e.g. TAB" />
                </div>
                <div className="form-group">
                  <label className="form-label">Island</label>
                  <input className="form-input" value={form.island} onChange={e=>setForm(f=>({...f,island:e.target.value}))} placeholder="e.g. Tabiteuea" />
                </div>
                <div className="form-group">
                  <label className="form-label">Region</label>
                  <input className="form-input" value={form.region} onChange={e=>setForm(f=>({...f,region:e.target.value}))} placeholder="e.g. Gilbert Islands" />
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Name</label>
                  <input className="form-input" value={form.contactName} onChange={e=>setForm(f=>({...f,contactName:e.target.value}))} placeholder="Station contact" />
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Phone</label>
                  <input className="form-input" value={form.contactPhone} onChange={e=>setForm(f=>({...f,contactPhone:e.target.value}))} placeholder="+686 xxx" />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom:14 }}>
                <label className="form-label">Contact Email</label>
                <input className="form-input" type="email" value={form.contactEmail} onChange={e=>setForm(f=>({...f,contactEmail:e.target.value}))} placeholder="station@kcdl.ki" />
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-textarea" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Additional notes…" rows={3} />
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setModal(null)} type="button">Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving} type="button">
                {saving ? '…Saving' : '✓ Save Station'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
