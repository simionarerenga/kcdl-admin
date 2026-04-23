// src/sections/UserManagement.jsx
import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { fmt } from '../utils/helpers';

const BLANK = {
  island: '', stationName: '', stationCode: '', displayName: '',
  email: '', phone: '', whatsapp: '', stationId: '', role: 'inspector',
};

// Derive 3-letter code from station name
function codeFromName(name) {
  if (!name) return '';
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.slice(0, 3).map(w => w[0]).join('').toUpperCase();
}

export default function UserManagement() {
  const [users,      setUsers]      = useState([]);
  const [stations,   setStations]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState(null);   // null | 'add' | user-object
  const [form,       setForm]       = useState(BLANK);
  const [saving,     setSaving]     = useState(false);
  const [msg,        setMsg]        = useState('');
  const [search,     setSearch]     = useState('');
  const [confirmDel, setConfirmDel] = useState(null);

  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'users'), s => {
      setUsers(s.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    const u2 = onSnapshot(collection(db, 'stations'), s => {
      setStations(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { u1(); u2(); };
  }, []);

  const flash = m => { setMsg(m); setTimeout(() => setMsg(''), 5000); };

  // Islands derived from stations collection
  const islandList = useMemo(() =>
    [...new Set(stations.map(s => s.island).filter(Boolean))].sort()
  , [stations]);

  // Stations for selected island
  const stationsForIsland = useMemo(() =>
    stations.filter(s => s.island === form.island)
  , [stations, form.island]);

  function setField(key, val) {
    setForm(f => ({ ...f, [key]: val }));
  }

  function handleIslandChange(island) {
    setForm(f => ({ ...f, island, stationName: '', stationCode: '' }));
  }

  function handleStationChange(stationName) {
    const match = stations.find(s => s.stationName === stationName && s.island === form.island);
    setForm(f => ({
      ...f,
      stationName,
      stationCode: match?.stationCode || codeFromName(stationName),
      stationId:   f.stationId || match?.id || '',
    }));
  }

  function openAdd() { setForm(BLANK); setModal('add'); }

  function openEdit(u) {
    setForm({
      island:      u.island      || '',
      stationName: u.stationName || '',
      stationCode: u.stationCode || '',
      displayName: u.displayName || '',
      email:       u.email       || '',
      phone:       u.phone       || '',
      whatsapp:    u.whatsapp    || '',
      stationId:   u.stationId   || '',
      role:        u.role        || 'inspector',
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
        const docId = form.email.replace(/[^a-zA-Z0-9]/g, '_');
        await setDoc(doc(db, 'users', docId), {
          ...data, createdAt: new Date().toISOString(), provisioned: true,
        });
        flash(`✅ Inspector account created for ${form.email}.`);
      } else {
        // Email cannot be updated — strip it from the patch
        const { email: _ignored, ...patch } = data;
        await updateDoc(doc(db, 'users', modal.id), patch);
        flash('✅ Inspector profile updated.');
      }
      setModal(null);
    } catch (e) { flash('❌ ' + e.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(u) {
    setSaving(true);
    try {
      await deleteDoc(doc(db, 'users', u.id));
      flash(`✅ ${u.email || u.id} has been removed.`);
      setConfirmDel(null);
    } catch (e) { flash('❌ ' + e.message); }
    finally { setSaving(false); }
  }

  const filtered = users.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (u.email      || '').toLowerCase().includes(q)
        || (u.displayName|| '').toLowerCase().includes(q)
        || (u.stationName|| '').toLowerCase().includes(q)
        || (u.island     || '').toLowerCase().includes(q);
  });

  if (loading) return <div className="spinner-wrap"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">👤 User Management</div>
          <div className="page-subtitle">Manage Copra Inspector accounts for all outer island stations</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openAdd} type="button">
          + Add Inspector
        </button>
      </div>

      {msg && (
        <div className={`flash-bar ${msg.startsWith('✅') ? 'flash-success' : msg.startsWith('⚠️') ? 'flash-warn' : 'flash-error'}`}
          style={{ marginBottom: 16 }}>
          {msg}
        </div>
      )}

      <div style={{ background: 'var(--teal-dim)', border: '1px solid rgba(0,124,145,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: '0.82rem', color: 'var(--teal-light)', lineHeight: 1.6 }}>
        <strong>How it works:</strong> When you add an inspector here, their email and station details are saved to Firestore. When they sign into the <strong>KCDL Inspector</strong> app with a matching email, they are automatically granted access to their assigned station.
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 20 }}>
        {[
          { icon: '👥', val: users.length,                                                              lbl: 'Total Accounts',  col: 'var(--teal)'  },
          { icon: '✅', val: users.filter(u => u.provisioned !== false).length,                         lbl: 'Active',          col: 'var(--green)' },
          { icon: '🏝️', val: [...new Set(users.map(u => u.island).filter(Boolean))].length,             lbl: 'Islands Covered', col: 'var(--gold)'  },
        ].map(s => (
          <div key={s.lbl} className="stat-card" style={{ '--accent-color': s.col }}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-value" style={{ fontSize: '1.8rem' }}>{s.val}</div>
            <div className="stat-label">{s.lbl}</div>
          </div>
        ))}
      </div>

      <div className="toolbar" style={{ marginBottom: 16 }}>
        <div className="search-bar">
          <input placeholder="Search email, name, station, island…" value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ marginLeft: 'auto', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          {filtered.length} of {users.length} accounts
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map(u => {
          const initials = (u.email || u.displayName || '?').slice(0, 2).toUpperCase();
          return (
            <div key={u.id} className="user-card">
              <div className="user-card-avatar" style={{ background: u.role === 'admin' ? 'var(--gold)' : 'var(--teal)' }}>
                {initials}
              </div>
              <div className="user-card-info">
                <div className="user-card-name">{u.displayName || u.email || u.id}</div>
                <div className="user-card-email">{u.email || '—'}</div>
                <div className="user-card-meta">
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>{u.stationId || '—'}</span>
                  {u.stationName && <span> · {u.stationName}</span>}
                  {u.island && <span> · {u.island}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                <span className={`tbl-badge ${u.role === 'admin' ? 'badge-gold' : 'badge-teal'}`} style={{ fontSize: '0.68rem' }}>
                  {u.role === 'admin' ? 'Admin' : 'Copra Inspector'}
                </span>
                {u.provisioned !== false && (
                  <span className="tbl-badge badge-green" style={{ fontSize: '0.65rem' }}>Active</span>
                )}
                {u.createdAt && (
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    Since {fmt.date(u.createdAt)}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => openEdit(u)} type="button">Edit</button>
                <button className="btn btn-danger btn-sm" onClick={() => setConfirmDel(u)} type="button">Remove</button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">👤</div>
            <div className="empty-state-text">No users found</div>
          </div>
        )}
      </div>

      {/* ── Add / Edit modal ── */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">
                {modal === 'add' ? '+ Add Inspector Account' : `Edit Inspector — ${modal.email || ''}`}
              </div>
              <button className="modal-close" onClick={() => setModal(null)} type="button">✕</button>
            </div>

            <div className="modal-body">
              <div className="form-row form-row-2">

                {/* 1. Island */}
                <div className="form-group">
                  <label className="form-label">Island</label>
                  <select className="form-select" value={form.island}
                    onChange={e => handleIslandChange(e.target.value)}>
                    <option value="">— Select Island —</option>
                    {islandList.map(isl => <option key={isl} value={isl}>{isl}</option>)}
                  </select>
                </div>

                {/* 2. Station Name */}
                <div className="form-group">
                  <label className="form-label">Station Name</label>
                  {stationsForIsland.length > 0 ? (
                    <select className="form-select" value={form.stationName}
                      onChange={e => handleStationChange(e.target.value)}>
                      <option value="">— Select Station —</option>
                      {stationsForIsland.map(s => (
                        <option key={s.id} value={s.stationName}>{s.stationName}</option>
                      ))}
                    </select>
                  ) : (
                    <input className="form-input" value={form.stationName}
                      onChange={e => handleStationChange(e.target.value)}
                      placeholder="e.g. Tabiteuea North Station" />
                  )}
                </div>

                {/* 3. Station Code — auto-generated */}
                <div className="form-group">
                  <label className="form-label">
                    Station Code
                    <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6, fontSize: '0.72rem' }}>
                      Auto-generated · 3 initials
                    </span>
                  </label>
                  <input
                    className="form-input"
                    value={form.stationCode}
                    onChange={e => setField('stationCode', e.target.value.toUpperCase().slice(0, 3))}
                    placeholder="e.g. TAB"
                    maxLength={3}
                    style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', fontWeight: 700 }}
                  />
                </div>

                {/* 4. Name of Inspector */}
                <div className="form-group">
                  <label className="form-label">Name of Inspector</label>
                  <input
                    className="form-input"
                    value={form.displayName}
                    onChange={e => setField('displayName', e.target.value)}
                    placeholder="Full Name"
                    style={{
                      fontStyle: form.displayName ? 'normal' : 'italic',
                      color: form.displayName ? 'var(--text-primary)' : 'var(--text-muted)',
                    }}
                  />
                </div>

                {/* 5. Email — full width, locked on edit */}
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Email Address *</label>
                  <input
                    className="form-input"
                    type="email"
                    value={form.email}
                    onChange={e => setField('email', e.target.value)}
                    placeholder="inspector@example.com"
                    disabled={modal !== 'add'}
                    style={modal !== 'add' ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
                  />
                  {modal !== 'add' && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      Email cannot be changed or removed — remove and re-add the account if needed.
                    </div>
                  )}
                </div>

                {/* 6. Phone */}
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" value={form.phone}
                    onChange={e => setField('phone', e.target.value)}
                    placeholder="+686 730 xxxxx" />
                </div>

                {/* 7. WhatsApp */}
                <div className="form-group">
                  <label className="form-label">WhatsApp</label>
                  <input
                    className="form-input"
                    value={form.whatsapp}
                    onChange={e => setField('whatsapp', e.target.value)}
                    placeholder="+686 730 xxxxx"
                    style={{
                      fontStyle: form.whatsapp ? 'normal' : 'italic',
                      color: form.whatsapp ? 'var(--text-primary)' : 'var(--text-muted)',
                    }}
                  />
                </div>

                {/* 8. Station ID */}
                <div className="form-group">
                  <label className="form-label">Station ID *</label>
                  <input
                    className="form-input"
                    value={form.stationId}
                    onChange={e => setField('stationId', e.target.value)}
                    placeholder="e.g. tab-north"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  />
                </div>

                {/* 9. Role — checkboxes */}
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <div style={{ display: 'flex', gap: 20, marginTop: 8 }}>
                    {[
                      { val: 'inspector', label: 'Copra Inspector' },
                      { val: 'admin',     label: 'Admin' },
                    ].map(opt => (
                      <label
                        key={opt.val}
                        style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: '0.85rem', userSelect: 'none' }}
                      >
                        <input
                          type="checkbox"
                          checked={form.role === opt.val}
                          onChange={() => setField('role', opt.val)}
                          style={{ width: 16, height: 16, accentColor: 'var(--teal)', cursor: 'pointer' }}
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>

              </div>
            </div>

            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setModal(null)} type="button">Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving} type="button">
                {saving ? '…Saving' : modal === 'add' ? '✓ Add Inspector' : '✓ Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm ── */}
      {confirmDel && (
        <div className="modal-overlay" onClick={() => setConfirmDel(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-head">
              <div className="modal-title">⚠️ Remove Inspector</div>
              <button className="modal-close" onClick={() => setConfirmDel(null)} type="button">✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Are you sure you want to remove{' '}
                <strong style={{ color: 'var(--text-primary)' }}>
                  {confirmDel.displayName || confirmDel.email || confirmDel.id}
                </strong>?<br />
                This will revoke their station access. Their Firebase Auth account remains and can be deleted from the Firebase Console if needed.
              </p>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setConfirmDel(null)} type="button">Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(confirmDel)} disabled={saving} type="button">
                {saving ? '…Removing' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
