// src/sections/UserManagement.jsx
import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { fmt } from '../utils/helpers';

const BLANK_INSPECTOR = {
  island: '', cooperativeName: '', stationCode: '', displayName: '',
  email: '', phone: '', whatsapp: '', stationId: '', role: 'inspector',
};

const BLANK_ISLAND = { name: '', region: '' };

const BLANK_COOP = { name: '', island: '', contactName: '', contactPhone: '' };

function codeFromName(name) {
  if (!name) return '';
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.slice(0, 3).map(w => w[0]).join('').toUpperCase();
}

/* ── Small reusable confirm-delete modal ── */
function ConfirmModal({ title, body, confirmLabel = 'Remove', onCancel, onConfirm, saving }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <div className="modal-head">
          <div className="modal-title">{title}</div>
          <button className="modal-close" onClick={onCancel} type="button">✕</button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{body}</p>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onCancel} type="button">Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={saving} type="button">
            {saving ? '…Removing' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UserManagement() {
  const [users,       setUsers]      = useState([]);
  const [stations,    setStations]   = useState([]);   // Firestore 'stations'
  const [islands,     setIslands]    = useState([]);   // Firestore 'islands'
  const [coops,       setCoops]      = useState([]);   // Firestore 'cooperatives'
  const [loading,     setLoading]    = useState(true);

  // Modal state: null | 'inspector' | 'island' | 'coop'
  const [modalType,   setModalType]  = useState(null);
  const [editTarget,  setEditTarget] = useState(null); // existing doc being edited
  const [inspForm,    setInspForm]   = useState(BLANK_INSPECTOR);
  const [islandForm,  setIslandForm] = useState(BLANK_ISLAND);
  const [coopForm,    setCoopForm]   = useState(BLANK_COOP);

  const [saving,      setSaving]     = useState(false);
  const [msg,         setMsg]        = useState('');
  const [search,      setSearch]     = useState('');
  const [confirmDel,  setConfirmDel] = useState(null);

  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'users'),        s => { setUsers(s.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); });
    const u2 = onSnapshot(collection(db, 'stations'),     s =>   setStations(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const u3 = onSnapshot(collection(db, 'islands'),      s =>   setIslands(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const u4 = onSnapshot(collection(db, 'cooperatives'), s =>   setCoops(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  const flash = m => { setMsg(m); setTimeout(() => setMsg(''), 5000); };

  /* derived lists */
  const islandList = useMemo(() => {
    const fromIslands = islands.map(i => i.name).filter(Boolean);
    const fromStations = stations.map(s => s.island).filter(Boolean);
    return [...new Set([...fromIslands, ...fromStations])].sort();
  }, [islands, stations]);

  const coopsForIsland = useMemo(() =>
    coops.filter(c => c.island === inspForm.island)
  , [coops, inspForm.island]);

  /* ── Inspector field helpers ── */
  const setInsp = (key, val) => setInspForm(f => ({ ...f, [key]: val }));

  function handleIslandChange(island) {
    setInspForm(f => ({ ...f, island, cooperativeName: '', stationCode: '' }));
  }

  function handleCoopChange(cooperativeName) {
    const match = coops.find(c => c.name === cooperativeName && c.island === inspForm.island);
    setInspForm(f => ({
      ...f,
      cooperativeName,
      stationCode: match?.code || codeFromName(cooperativeName),
      stationId:   f.stationId || match?.id || '',
    }));
  }

  /* ── Open modals ── */
  function openAddInspector() { setInspForm(BLANK_INSPECTOR); setEditTarget(null); setModalType('inspector'); }
  function openEditInspector(u) {
    setInspForm({
      island:          u.island          || '',
      cooperativeName: u.cooperativeName || u.stationName || '',
      stationCode:     u.stationCode     || '',
      displayName:     u.displayName     || '',
      email:           u.email           || '',
      phone:           u.phone           || '',
      whatsapp:        u.whatsapp        || '',
      stationId:       u.stationId       || '',
      role:            u.role            || 'inspector',
    });
    setEditTarget(u);
    setModalType('inspector');
  }

  function openAddIsland()  { setIslandForm(BLANK_ISLAND);  setEditTarget(null); setModalType('island');  }
  function openAddCoop()    { setCoopForm(BLANK_COOP);      setEditTarget(null); setModalType('coop');    }
  function closeModal()     { setModalType(null); setEditTarget(null); }

  /* ── Save handlers ── */
  async function saveInspector() {
    if (!inspForm.email.trim())     { flash('⚠️ Email is required.');     return; }
    if (!inspForm.stationId.trim()) { flash('⚠️ Station ID is required.'); return; }
    setSaving(true);
    try {
      const data = { ...inspForm, updatedAt: new Date().toISOString() };
      if (!editTarget) {
        const docId = inspForm.email.replace(/[^a-zA-Z0-9]/g, '_');
        await setDoc(doc(db, 'users', docId), { ...data, createdAt: new Date().toISOString(), provisioned: true });
        flash(`✅ Inspector account created for ${inspForm.email}.`);
      } else {
        const { email: _e, ...patch } = data;
        await updateDoc(doc(db, 'users', editTarget.id), patch);
        flash('✅ Inspector profile updated.');
      }
      closeModal();
    } catch (e) { flash('❌ ' + e.message); }
    finally { setSaving(false); }
  }

  async function saveIsland() {
    if (!islandForm.name.trim()) { flash('⚠️ Island name is required.'); return; }
    setSaving(true);
    try {
      await addDoc(collection(db, 'islands'), { ...islandForm, createdAt: new Date().toISOString() });
      flash(`✅ Island "${islandForm.name}" added.`);
      closeModal();
    } catch (e) { flash('❌ ' + e.message); }
    finally { setSaving(false); }
  }

  async function saveCoop() {
    if (!coopForm.name.trim())   { flash('⚠️ Cooperative name is required.'); return; }
    if (!coopForm.island.trim()) { flash('⚠️ Island is required.');           return; }
    setSaving(true);
    try {
      await addDoc(collection(db, 'cooperatives'), {
        ...coopForm,
        code: codeFromName(coopForm.name),
        createdAt: new Date().toISOString(),
      });
      flash(`✅ Cooperative "${coopForm.name}" added.`);
      closeModal();
    } catch (e) { flash('❌ ' + e.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(u) {
    setSaving(true);
    try {
      await deleteDoc(doc(db, 'users', u.id));
      flash(`✅ ${u.email || u.id} removed.`);
      setConfirmDel(null);
    } catch (e) { flash('❌ ' + e.message); }
    finally { setSaving(false); }
  }

  const filtered = users.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (u.email           || '').toLowerCase().includes(q)
        || (u.displayName     || '').toLowerCase().includes(q)
        || (u.cooperativeName || u.stationName || '').toLowerCase().includes(q)
        || (u.island          || '').toLowerCase().includes(q);
  });

  if (loading) return <div className="spinner-wrap"><div className="spinner" /></div>;

  /* ─────────────────────────────────── render ─────────────────────────────────── */
  return (
    <div>
      {/* Page header */}
      <div className="page-header" style={{ flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div className="page-title">👤 User Management</div>
          <div className="page-subtitle">Manage Copra Inspector accounts for all outer island stations</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-primary btn-sm" onClick={openAddInspector} type="button">
            + Add Inspector
          </button>
          <button className="btn btn-secondary btn-sm" onClick={openAddIsland} type="button">
            + Add Island
          </button>
          <button className="btn btn-secondary btn-sm" onClick={openAddCoop} type="button">
            + Add Cooperative
          </button>
        </div>
      </div>

      {msg && (
        <div className={`flash-bar ${msg.startsWith('✅') ? 'flash-success' : msg.startsWith('⚠️') ? 'flash-warn' : 'flash-error'}`}
          style={{ marginBottom: 16 }}>{msg}
        </div>
      )}

      <div style={{ background: 'var(--teal-dim)', border: '1px solid rgba(0,124,145,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: '0.82rem', color: 'var(--teal-light)', lineHeight: 1.6 }}>
        <strong>How it works:</strong> When you add an inspector here, their email and station details are saved to Firestore. When they sign into the <strong>KCDL Inspector</strong> app with a matching email, they are automatically granted access to their assigned station.
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 20 }}>
        {[
          { icon: '👥', val: users.length,                                                    lbl: 'Total Accounts',  col: 'var(--teal)'  },
          { icon: '✅', val: users.filter(u => u.provisioned !== false).length,               lbl: 'Active',          col: 'var(--green)' },
          { icon: '🏝️', val: [...new Set(users.map(u => u.island).filter(Boolean))].length,   lbl: 'Islands Covered', col: 'var(--gold)'  },
        ].map(s => (
          <div key={s.lbl} className="stat-card" style={{ '--accent-color': s.col }}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-value" style={{ fontSize: '1.8rem' }}>{s.val}</div>
            <div className="stat-label">{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="toolbar" style={{ marginBottom: 16 }}>
        <div className="search-bar">
          <input placeholder="Search email, name, cooperative, island…" value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ marginLeft: 'auto', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          {filtered.length} of {users.length} accounts
        </div>
      </div>

      {/* User list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map(u => {
          const initials = (u.email || u.displayName || '?').slice(0, 2).toUpperCase();
          const coopLabel = u.cooperativeName || u.stationName || '—';
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
                  {coopLabel !== '—' && <span> · {coopLabel}</span>}
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
                <button className="btn btn-ghost btn-sm" onClick={() => openEditInspector(u)} type="button">Edit</button>
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

      {/* ══════════════ ADD INSPECTOR MODAL ══════════════ */}
      {modalType === 'inspector' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">
                {!editTarget ? '+ Add Inspector Account' : `Edit Inspector — ${editTarget.email || ''}`}
              </div>
              <button className="modal-close" onClick={closeModal} type="button">✕</button>
            </div>

            <div className="modal-body">
              {/* ── Row 1: Island (wider) ── */}
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">Island</label>
                <select className="form-select" style={{ maxWidth: 320 }}
                  value={inspForm.island} onChange={e => handleIslandChange(e.target.value)}>
                  <option value="">— Select Island —</option>
                  {islandList.map(isl => <option key={isl} value={isl}>{isl}</option>)}
                </select>
              </div>

              {/* ── Row 2: Cooperative Name (full width) ── */}
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">Cooperative Name</label>
                {coopsForIsland.length > 0 ? (
                  <select className="form-select"
                    value={inspForm.cooperativeName} onChange={e => handleCoopChange(e.target.value)}>
                    <option value="">— Select Cooperative —</option>
                    {coopsForIsland.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                ) : (
                  <input className="form-input" value={inspForm.cooperativeName}
                    onChange={e => handleCoopChange(e.target.value)}
                    placeholder="e.g. Tabiteuea North Cooperative" />
                )}
              </div>

              {/* ── Row 3: Station Code (label inline) ── */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <label className="form-label" style={{ margin: 0, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  Station Code
                  <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6, fontSize: '0.7rem' }}>
                    Auto · 3 initials
                  </span>
                </label>
                <input
                  className="form-input"
                  style={{ width: 80, fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', fontWeight: 700, textAlign: 'center' }}
                  value={inspForm.stationCode}
                  onChange={e => setInsp('stationCode', e.target.value.toUpperCase().slice(0, 3))}
                  placeholder="TAB"
                  maxLength={3}
                />
              </div>

              {/* ── Row 4: Name of Inspector ── */}
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">Name of Inspector</label>
                <input className="form-input"
                  value={inspForm.displayName}
                  onChange={e => setInsp('displayName', e.target.value)}
                  placeholder="Full Name"
                  style={{ fontStyle: inspForm.displayName ? 'normal' : 'italic' }}
                />
              </div>

              {/* ── Row 5: Email (full width, locked on edit) ── */}
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">Email Address *</label>
                <input className="form-input" type="email"
                  value={inspForm.email}
                  onChange={e => setInsp('email', e.target.value)}
                  placeholder="inspector@example.com"
                  disabled={!!editTarget}
                  style={editTarget ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
                />
                {editTarget && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    Email cannot be changed — remove and re-add if needed.
                  </div>
                )}
              </div>

              {/* ── Row 6: Phone | WhatsApp (inline, side by side) ── */}
              <div style={{ display: 'flex', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 200 }}>
                  <label className="form-label" style={{ margin: 0, whiteSpace: 'nowrap', flexShrink: 0 }}>Phone</label>
                  <input className="form-input" style={{ flex: 1 }}
                    value={inspForm.phone}
                    onChange={e => setInsp('phone', e.target.value)}
                    placeholder="+686 730 xxxxx"
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 200 }}>
                  <label className="form-label" style={{ margin: 0, whiteSpace: 'nowrap', flexShrink: 0 }}>WhatsApp</label>
                  <input className="form-input" style={{ flex: 1, fontStyle: inspForm.whatsapp ? 'normal' : 'italic' }}
                    value={inspForm.whatsapp}
                    onChange={e => setInsp('whatsapp', e.target.value)}
                    placeholder="+686 730 xxxxx"
                  />
                </div>
              </div>

              {/* ── Row 7: Station ID ── */}
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">Station ID *</label>
                <input className="form-input" style={{ fontFamily: 'var(--font-mono)' }}
                  value={inspForm.stationId}
                  onChange={e => setInsp('stationId', e.target.value)}
                  placeholder="e.g. tab-north"
                />
              </div>

              {/* ── Row 8: Role checkboxes ── */}
              <div className="form-group">
                <label className="form-label">Role</label>
                <div style={{ display: 'flex', gap: 24, marginTop: 6 }}>
                  {[
                    { val: 'inspector', label: 'Copra Inspector' },
                    { val: 'admin',     label: 'Admin' },
                  ].map(opt => (
                    <label key={opt.val}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.85rem', userSelect: 'none' }}>
                      <input type="checkbox"
                        checked={inspForm.role === opt.val}
                        onChange={() => setInsp('role', opt.val)}
                        style={{ width: 16, height: 16, accentColor: 'var(--teal)', cursor: 'pointer' }}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={closeModal} type="button">Cancel</button>
              <button className="btn btn-primary" onClick={saveInspector} disabled={saving} type="button">
                {saving ? '…Saving' : !editTarget ? '✓ Add Inspector' : '✓ Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ ADD ISLAND MODAL ══════════════ */}
      {modalType === 'island' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-head">
              <div className="modal-title">🏝️ Add Island</div>
              <button className="modal-close" onClick={closeModal} type="button">✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">Island Name *</label>
                <input className="form-input"
                  value={islandForm.name}
                  onChange={e => setIslandForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Tabiteuea" autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">Region</label>
                <input className="form-input"
                  value={islandForm.region}
                  onChange={e => setIslandForm(f => ({ ...f, region: e.target.value }))}
                  placeholder="e.g. Gilbert Islands"
                />
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={closeModal} type="button">Cancel</button>
              <button className="btn btn-primary" onClick={saveIsland} disabled={saving} type="button">
                {saving ? '…Saving' : '✓ Add Island'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ ADD COOPERATIVE MODAL ══════════════ */}
      {modalType === 'coop' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-head">
              <div className="modal-title">🤝 Add Cooperative</div>
              <button className="modal-close" onClick={closeModal} type="button">✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">Island *</label>
                <select className="form-select"
                  value={coopForm.island}
                  onChange={e => setCoopForm(f => ({ ...f, island: e.target.value }))}>
                  <option value="">— Select Island —</option>
                  {islandList.map(isl => <option key={isl} value={isl}>{isl}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">Cooperative Name *</label>
                <input className="form-input"
                  value={coopForm.name}
                  onChange={e => setCoopForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Tabiteuea North Cooperative"
                />
                {coopForm.name && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    Auto code: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--teal)' }}>{codeFromName(coopForm.name)}</strong>
                  </div>
                )}
              </div>
              <div className="form-row form-row-2">
                <div className="form-group">
                  <label className="form-label">Contact Name</label>
                  <input className="form-input"
                    value={coopForm.contactName}
                    onChange={e => setCoopForm(f => ({ ...f, contactName: e.target.value }))}
                    placeholder="Full name"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Phone</label>
                  <input className="form-input"
                    value={coopForm.contactPhone}
                    onChange={e => setCoopForm(f => ({ ...f, contactPhone: e.target.value }))}
                    placeholder="+686 730 xxxxx"
                  />
                </div>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={closeModal} type="button">Cancel</button>
              <button className="btn btn-primary" onClick={saveCoop} disabled={saving} type="button">
                {saving ? '…Saving' : '✓ Add Cooperative'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ DELETE CONFIRM ══════════════ */}
      {confirmDel && (
        <ConfirmModal
          title="⚠️ Remove Inspector"
          body={`Are you sure you want to remove ${confirmDel.displayName || confirmDel.email || confirmDel.id}? This will revoke their station access.`}
          confirmLabel="Remove"
          saving={saving}
          onCancel={() => setConfirmDel(null)}
          onConfirm={() => handleDelete(confirmDel)}
        />
      )}
    </div>
  );
}
