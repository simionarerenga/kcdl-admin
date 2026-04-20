// src/sections/UserManagement.jsx
import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { fmt } from '../utils/helpers';

const BLANK = {
  email: '', displayName: '', stationId: '', stationName: '', stationCode: '',
  island: '', region: '', role: 'inspector', phone: '',
};

export default function UserManagement() {
  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(null);
  const [form,     setForm]     = useState(BLANK);
  const [saving,   setSaving]   = useState(false);
  const [msg,      setMsg]      = useState('');
  const [search,   setSearch]   = useState('');
  const [confirmDel, setConfirmDel] = useState(null);

  useEffect(() => {
    return onSnapshot(collection(db,'users'), s => {
      setUsers(s.docs.map(d=>({id:d.id,...d.data()})));
      setLoading(false);
    });
  }, []);

  const flash = m => { setMsg(m); setTimeout(()=>setMsg(''),5000); };

  function openProvision() { setForm(BLANK); setModal('add'); }
  function openEdit(u) {
    setForm({
      email:       u.email || '',
      displayName: u.displayName || '',
      stationId:   u.stationId || '',
      stationName: u.stationName || '',
      stationCode: u.stationCode || '',
      island:      u.island || '',
      region:      u.region || '',
      role:        u.role || 'inspector',
      phone:       u.phone || '',
    });
    setModal(u);
  }

  async function handleSave() {
    if (!form.email.trim())     { flash('⚠️ Email is required.');     return; }
    if (!form.stationId.trim()) { flash('⚠️ Station ID is required.'); return; }
    setSaving(true);
    try {
      const data = { ...form, updatedAt: new Date().toISOString() };
      if (modal === 'add') {
        // Provision: create or overwrite the Firestore user doc using email-based ID
        const docId = form.email.replace(/[^a-zA-Z0-9]/g,'_');
        await setDoc(doc(db,'users', docId), { ...data, createdAt: new Date().toISOString(), provisioned: true });
        flash(`✅ Account provisioned for ${form.email}. They can now sign in with the KCDL Inspector app.`);
      } else {
        await updateDoc(doc(db,'users', modal.id), data);
        flash('✅ User profile updated.');
      }
      setModal(null);
    } catch(e) { flash('❌ ' + e.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(u) {
    setSaving(true);
    try {
      await deleteDoc(doc(db,'users', u.id));
      flash(`✅ ${u.email || u.id} has been de-provisioned.`);
      setConfirmDel(null);
    } catch(e) { flash('❌ ' + e.message); }
    finally { setSaving(false); }
  }

  const filtered = users.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (u.email||'').toLowerCase().includes(q)
      || (u.displayName||'').toLowerCase().includes(q)
      || (u.stationName||'').toLowerCase().includes(q)
      || (u.island||'').toLowerCase().includes(q);
  });

  if (loading) return <div className="spinner-wrap"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">👤 User Management</div>
          <div className="page-subtitle">Provision and manage inspector accounts for all outer island stations</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openProvision} type="button">+ Provision Account</button>
      </div>

      {msg && (
        <div className={`flash-bar ${msg.startsWith('✅')?'flash-success':msg.startsWith('⚠️')?'flash-warn':'flash-error'}`} style={{ marginBottom:16 }}>
          {msg}
        </div>
      )}

      {/* Info box */}
      <div style={{ background:'var(--teal-dim)', border:'1px solid rgba(0,124,145,0.2)', borderRadius:10, padding:'12px 16px', marginBottom:20, fontSize:'0.82rem', color:'var(--teal-light)', lineHeight:1.6 }}>
        <strong>How provisioning works:</strong> When you add a user here, the email and station details are saved to Firestore. When that person signs into the <strong>KCDL Inspector</strong> app with a matching email, they are automatically granted access to their assigned station. They must first register their Firebase Auth account in the Inspector app.
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns:'repeat(3,1fr)', marginBottom:20 }}>
        {[
          { icon:'👥', val:users.length, lbl:'Total Accounts', col:'var(--teal)' },
          { icon:'✅', val:users.filter(u=>u.provisioned!==false).length, lbl:'Provisioned', col:'var(--green)' },
          { icon:'🏝️', val:[...new Set(users.map(u=>u.island).filter(Boolean))].length, lbl:'Islands Covered', col:'var(--gold)' },
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
          <input placeholder="Search email, name, station, island…" value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ marginLeft:'auto', fontSize:'0.82rem', color:'var(--text-muted)' }}>
          {filtered.length} of {users.length} accounts
        </div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {filtered.map(u => {
          const initials = (u.email||u.displayName||'?').slice(0,2).toUpperCase();
          return (
            <div key={u.id} className="user-card">
              <div className="user-card-avatar" style={{ background: u.role==='admin'?'var(--gold)':'var(--teal)' }}>
                {initials}
              </div>
              <div className="user-card-info">
                <div className="user-card-name">{u.displayName || u.email || u.id}</div>
                <div className="user-card-email">{u.email || '—'}</div>
                <div className="user-card-meta">
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.7rem' }}>{u.stationId || '—'}</span>
                  {u.stationName && <span> · {u.stationName}</span>}
                  {u.island && <span> · {u.island}</span>}
                </div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6 }}>
                <span className={`tbl-badge ${u.role==='admin'?'badge-gold':'badge-teal'}`} style={{ fontSize:'0.68rem' }}>
                  {u.role || 'inspector'}
                </span>
                {u.provisioned !== false && (
                  <span className="tbl-badge badge-green" style={{ fontSize:'0.65rem' }}>Provisioned</span>
                )}
                {u.createdAt && (
                  <div style={{ fontSize:'0.68rem', color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>
                    Since {fmt.date(u.createdAt)}
                  </div>
                )}
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => openEdit(u)} type="button">Edit</button>
                <button className="btn btn-danger btn-sm" onClick={() => setConfirmDel(u)} type="button">Remove</button>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="empty-state"><div className="empty-state-icon">👤</div><div className="empty-state-text">No users found</div></div>
        )}
      </div>

      {/* Provision / Edit modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">{modal==='add' ? '+ Provision Inspector Account' : `Edit Account — ${modal.email||''}`}</div>
              <button className="modal-close" onClick={() => setModal(null)} type="button">✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row form-row-2">
                <div className="form-group" style={{ gridColumn:'span 2' }}>
                  <label className="form-label">Email Address *</label>
                  <input className="form-input" type="email" value={form.email}
                    onChange={e=>setForm(f=>({...f,email:e.target.value}))}
                    placeholder="inspector@gmail.com"
                    disabled={modal!=='add'} />
                  {modal!=='add' && (
                    <div style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginTop:4 }}>Email cannot be changed — remove and re-provision if needed.</div>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Display Name</label>
                  <input className="form-input" value={form.displayName}
                    onChange={e=>setForm(f=>({...f,displayName:e.target.value}))} placeholder="Full name" />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" value={form.phone}
                    onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="+686 xxx" />
                </div>
                <div className="form-group">
                  <label className="form-label">Station ID *</label>
                  <input className="form-input" value={form.stationId}
                    onChange={e=>setForm(f=>({...f,stationId:e.target.value}))} placeholder="e.g. tab-north" />
                </div>
                <div className="form-group">
                  <label className="form-label">Station Code</label>
                  <input className="form-input" value={form.stationCode}
                    onChange={e=>setForm(f=>({...f,stationCode:e.target.value}))} placeholder="e.g. TAB" />
                </div>
                <div className="form-group">
                  <label className="form-label">Station Name</label>
                  <input className="form-input" value={form.stationName}
                    onChange={e=>setForm(f=>({...f,stationName:e.target.value}))} placeholder="e.g. Tabiteuea Station" />
                </div>
                <div className="form-group">
                  <label className="form-label">Island</label>
                  <input className="form-input" value={form.island}
                    onChange={e=>setForm(f=>({...f,island:e.target.value}))} placeholder="e.g. Tabiteuea" />
                </div>
                <div className="form-group">
                  <label className="form-label">Region</label>
                  <input className="form-input" value={form.region}
                    onChange={e=>setForm(f=>({...f,region:e.target.value}))} placeholder="e.g. Gilbert Islands" />
                </div>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select className="form-select" value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))}>
                    <option value="inspector">Inspector</option>
                    <option value="admin">HQ Admin</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setModal(null)} type="button">Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving} type="button">
                {saving ? '…Saving' : modal==='add' ? '✓ Provision Account' : '✓ Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDel && (
        <div className="modal-overlay" onClick={() => setConfirmDel(null)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()} style={{ maxWidth:400 }}>
            <div className="modal-head">
              <div className="modal-title">⚠️ Remove Account</div>
              <button className="modal-close" onClick={() => setConfirmDel(null)} type="button">✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize:'0.88rem', color:'var(--text-secondary)', lineHeight:1.6 }}>
                Are you sure you want to remove <strong style={{color:'var(--text-primary)'}}>{confirmDel.email || confirmDel.id}</strong>?<br/>
                This will de-provision their station access. Their Firebase Auth account will remain and must be deleted manually from the Firebase Console if needed.
              </p>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setConfirmDel(null)} type="button">Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(confirmDel)} disabled={saving} type="button">
                {saving ? '…Removing' : 'Remove Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
