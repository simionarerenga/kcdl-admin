// src/sections/UserManagement.jsx
import { useState, useEffect } from 'react';
import { doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../firebase';
import { useAppData } from '../context/AppDataContext';
import { fmt } from '../utils/helpers';
import { KIRIBATI_ISLANDS } from '../utils/constants';

const BLANK_INSPECTOR = {
  island: '', displayName: '', email: '', password: '', phone: '', whatsapp: '',
};


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
  const { users, cooperatives: coops, cprEntries: cprs, loading } = useAppData();

  // Modal state: null | 'inspector'
  const [modalType, setModalType] = useState(null); // null | 'inspector'
  const [editTarget,  setEditTarget] = useState(null); // existing doc being edited
  const [inspForm,    setInspForm]   = useState(BLANK_INSPECTOR);

  const [saving,      setSaving]     = useState(false);
  const [msg,         setMsg]        = useState('');
  const [search,      setSearch]     = useState('');
  const [confirmDel,  setConfirmDel] = useState(null);
  const [showPw,      setShowPw]     = useState(false);
  const [viewUser,    setViewUser]   = useState(null); // profile card modal



  const flash = m => { setMsg(m); setTimeout(() => setMsg(''), 5000); };

  /* ── Inspector field helpers ── */
  const setInsp = (key, val) => setInspForm(f => ({ ...f, [key]: val }));

  function handleIslandChange(island) {
    setInspForm(f => ({ ...f, island }));
  }

  /* ── Open modals ── */
  function openAddInspector() { setInspForm(BLANK_INSPECTOR); setEditTarget(null); setModalType('inspector'); }
  function openEditInspector(u) {
    setInspForm({
      island:      u.island      || '',
      displayName: u.displayName || '',
      email:       u.email       || '',
      password:    '',
      phone:       u.phone       || '',
      whatsapp:    u.whatsapp    || '',
    });
    setEditTarget(u);
    setModalType('inspector');
  }

  function closeModal()     { setModalType(null); setEditTarget(null); }

  /* ── Save handlers ── */
  async function saveInspector() {
    if (!inspForm.email.trim()) { flash('⚠️ Email is required.'); return; }

    if (!editTarget && !inspForm.password.trim()) {
      flash('⚠️ Password is required when creating a new inspector account.');
      return;
    }
    if (!editTarget && inspForm.password.length < 6) {
      flash('⚠️ Password must be at least 6 characters.');
      return;
    }

    setSaving(true);
    try {
      if (!editTarget) {
        const functions       = getFunctions();
        const createInspector = httpsCallable(functions, 'createInspectorUser');

        await createInspector({
          email:       inspForm.email.trim(),
          password:    inspForm.password,
          displayName: inspForm.displayName,
          island:      inspForm.island,
          phone:       inspForm.phone,
          whatsapp:    inspForm.whatsapp,
          role:        'inspector',
        });

        flash(`✅ Inspector account created for ${inspForm.email}. They can now sign in with the password you set.`);
        setShowPw(false);
      } else {
        const { email: _e, password: _p, ...patch } = inspForm;
        await updateDoc(doc(db, 'users', editTarget.id), {
          ...patch,
          updatedAt: new Date().toISOString(),
        });
        flash('✅ Inspector profile updated.');
      }
      closeModal();
    } catch (e) {
      flash('❌ ' + (e.message || 'Unexpected error.'));
    }
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

      {/* User list — two-column clickable names */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 12px' }}>
        {filtered.map(u => (
          <button
            key={u.id}
            type="button"
            onClick={() => setViewUser(u)}
            style={{
              background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer',
              padding: '9px 12px', borderRadius: 8, color: 'var(--teal-light)',
              fontSize: '0.88rem', fontWeight: 600, transition: 'background 0.15s',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--teal-dim)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <span style={{
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
              background: u.role === 'admin' ? 'var(--gold)' : 'var(--teal)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.65rem', fontWeight: 800, color: '#fff',
            }}>
              {(u.displayName || u.email || '?').slice(0, 2).toUpperCase()}
            </span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {u.displayName || u.email || u.id}
            </span>
          </button>
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">👤</div>
          <div className="empty-state-text">No users found</div>
        </div>
      )}

      {/* ══════════════ PROFILE VIEW MODAL ══════════════ */}
      {viewUser && (
        <div className="modal-overlay" onClick={() => setViewUser(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-head">
              <div className="modal-title">👤 Inspector Profile</div>
              <button className="modal-close" onClick={() => setViewUser(null)} type="button">✕</button>
            </div>
            <div className="modal-body">
              {/* Avatar + name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
                  background: viewUser.role === 'admin' ? 'var(--gold)' : 'var(--teal)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.1rem', fontWeight: 800, color: '#fff',
                }}>
                  {(viewUser.displayName || viewUser.email || '?').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                    {viewUser.displayName || '—'}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    {viewUser.email || '—'}
                  </div>
                  <div style={{ marginTop: 5, display: 'flex', gap: 6 }}>
                    <span className={`tbl-badge ${viewUser.role === 'admin' ? 'badge-gold' : 'badge-teal'}`} style={{ fontSize: '0.68rem' }}>
                      {viewUser.role === 'admin' ? 'Admin' : 'Copra Inspector'}
                    </span>
                    {viewUser.provisioned !== false && (
                      <span className="tbl-badge badge-green" style={{ fontSize: '0.68rem' }}>Active</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Detail rows */}
              {[
                ['🏝️ Island',    viewUser.island          || '—'],
                ['📞 Phone',     viewUser.phone           || '—'],
                ['💬 WhatsApp',  viewUser.whatsapp        || '—'],
                ['🗓️ Since',     viewUser.createdAt ? fmt.date(viewUser.createdAt) : '—'],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border-dim)', fontSize: '0.83rem' }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
                  <span style={{ color: 'var(--text-primary)', textAlign: 'right' }}>{value}</span>
                </div>
              ))}
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setViewUser(null)} type="button">Close</button>
              <button className="btn btn-secondary" onClick={() => { setViewUser(null); openEditInspector(viewUser); }} type="button">✏️ Edit</button>
              <button className="btn btn-danger" onClick={() => { setViewUser(null); setConfirmDel(viewUser); }} type="button">Remove</button>
            </div>
          </div>
        </div>
      )}

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
              {/* ── Row 1: Island ── */}
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">Island</label>
                <select className="form-select" style={{ maxWidth: 320, ...(!inspForm.island ? { color: 'var(--text-muted)', fontStyle: 'italic' } : {}) }}
                  value={inspForm.island} onChange={e => handleIslandChange(e.target.value)}>
                  <option value="" style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>— Select Island —</option>
                  {KIRIBATI_ISLANDS.map(isl => <option key={isl} value={isl} style={{ color: 'inherit', fontStyle: 'normal' }}>{isl}</option>)}
                </select>
              </div>

              {/* ── Row 2: Name of Inspector ── */}
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">Name of Inspector</label>
                <input className="form-input"
                  value={inspForm.displayName}
                  onChange={e => setInsp('displayName', e.target.value)}
                  placeholder="Full Name"
                  style={{ fontStyle: inspForm.displayName ? 'normal' : 'italic' }}
                />
              </div>

              {/* ── Row 3: Email (locked on edit) ── */}
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

              {/* ── Row 4: Password (create only) ── */}
              {!editTarget && (
                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label className="form-label">
                    Password *
                    <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6, fontSize: '0.7rem' }}>
                      Min 6 characters · Inspector uses this to sign in
                    </span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="form-input"
                      type={showPw ? 'text' : 'password'}
                      value={inspForm.password}
                      onChange={e => setInsp('password', e.target.value)}
                      placeholder="Set a secure password"
                      style={{ paddingRight: 44 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(v => !v)}
                      style={{
                        position: 'absolute', right: 12, top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: '0.85rem', color: 'var(--text-muted)',
                      }}
                    >{showPw ? '🙈' : '👁️'}</button>
                  </div>
                </div>
              )}

              {/* ── Row 5: Phone | WhatsApp ── */}
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