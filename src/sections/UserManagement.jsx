// src/sections/UserManagement.jsx
import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { db } from '../firebase';
import { fmt } from '../utils/helpers';
import { KIRIBATI_ISLANDS } from '../utils/constants';
import { logAudit } from '../utils/auditLog';

const BLANK_INSPECTOR = {
  island: '', displayName: '', email: '', password: '', phone: '', whatsapp: '',
};

const BLANK_COOP = { name: '', island: '', contactName: '', contactPhone: '' };

function codeFromName(name) {
  if (!name) return '';
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.slice(0, 3).map(w => w[0]).join('').toUpperCase();
}

function fmtLastOnline(iso) {
  if (!iso) return null;
  const d   = new Date(iso);
  const now = new Date();
  const diffMs  = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  const diffH   = Math.floor(diffMin / 60);
  const diffD   = Math.floor(diffH / 24);
  if (diffMin < 2)  return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffH   < 24) return `${diffH}h ago`;
  if (diffD   < 7)  return `${diffD}d ago`;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    + ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

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

export default function UserManagement({ currentUser }) {
  const [users,       setUsers]      = useState([]);
  const [coops,       setCoops]      = useState([]);
  const [cprs,        setCprs]       = useState([]);   // #6 — for CPR activity in profile
  const [loading,     setLoading]    = useState(true);
  const [modalType,   setModalType]  = useState(null);
  const [editTarget,  setEditTarget] = useState(null);
  const [inspForm,    setInspForm]   = useState(BLANK_INSPECTOR);
  const [coopForm,    setCoopForm]   = useState(BLANK_COOP);
  const [saving,      setSaving]     = useState(false);
  const [msg,         setMsg]        = useState('');
  const [search,      setSearch]     = useState('');
  const [confirmDel,  setConfirmDel] = useState(null);
  const [showPw,      setShowPw]     = useState(false);
  const [viewUser,    setViewUser]   = useState(null);
  const [resetSent,   setResetSent]  = useState(false); // #1 — password reset state

  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'users'),        s => { setUsers(s.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); });
    const u2 = onSnapshot(collection(db, 'cooperatives'), s => setCoops(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const u3 = onSnapshot(collection(db, 'cprEntries'),   s => setCprs(s.docs.map(d => ({ id: d.id, ...d.data() })))); // #6
    return () => { u1(); u2(); u3(); };
  }, []);

  const flash = m => { setMsg(m); setTimeout(() => setMsg(''), 5000); };
  const adminEmail = currentUser?.email || 'unknown';

  const setInsp = (key, val) => setInspForm(f => ({ ...f, [key]: val }));
  function handleIslandChange(island) { setInspForm(f => ({ ...f, island })); }

  function openAddInspector() { setInspForm(BLANK_INSPECTOR); setEditTarget(null); setShowPw(false); setModalType('inspector'); }
  function openEditInspector(u) {
    setInspForm({ island: u.island || '', displayName: u.displayName || '', email: u.email || '', password: '', phone: u.phone || '', whatsapp: u.whatsapp || '' });
    setEditTarget(u);
    setModalType('inspector');
  }
  function openAddCoop() { setCoopForm(BLANK_COOP); setEditTarget(null); setModalType('coop'); }
  function closeModal()  { setModalType(null); setEditTarget(null); setResetSent(false); }

  // #1 — Password reset
  async function handlePasswordReset(email) {
    try {
      await sendPasswordResetEmail(getAuth(), email);
      setResetSent(true);
      flash(`✅ Password reset email sent to ${email}.`);
    } catch (e) {
      flash('❌ ' + (e.message || 'Failed to send reset email.'));
    }
  }

  async function saveInspector() {
    if (!inspForm.email.trim()) { flash('⚠️ Email is required.'); return; }
    if (!editTarget && !inspForm.password.trim()) { flash('⚠️ Password is required for new accounts.'); return; }
    if (!editTarget && inspForm.password.length < 6) { flash('⚠️ Password must be at least 6 characters.'); return; }

    setSaving(true);
    try {
      if (!editTarget) {
        const fn = getFunctions();
        await httpsCallable(fn, 'createInspectorUser')({
          email: inspForm.email.trim(), password: inspForm.password,
          displayName: inspForm.displayName, island: inspForm.island,
          phone: inspForm.phone, whatsapp: inspForm.whatsapp, role: 'inspector',
        });
        // #2 audit log
        await logAudit('create', 'user', inspForm.displayName || inspForm.email, { island: inspForm.island }, adminEmail);
        flash(`✅ Inspector account created for ${inspForm.email}.`);
        setShowPw(false);
      } else {
        const { email: _e, password: _p, ...patch } = inspForm;
        await updateDoc(doc(db, 'users', editTarget.id), { ...patch, updatedAt: new Date().toISOString() });
        await logAudit('update', 'user', inspForm.displayName || inspForm.email, {}, adminEmail); // #2
        flash('✅ Inspector profile updated.');
      }
      closeModal();
    } catch (e) {
      flash('❌ ' + (e.message || 'Unexpected error.'));
    } finally { setSaving(false); }
  }

  async function saveCoop() {
    if (!coopForm.name.trim())   { flash('⚠️ Cooperative name is required.'); return; }
    if (!coopForm.island.trim()) { flash('⚠️ Island is required.'); return; }
    setSaving(true);
    try {
      await addDoc(collection(db, 'cooperatives'), { ...coopForm, code: codeFromName(coopForm.name), createdAt: new Date().toISOString() });
      await logAudit('create', 'cooperative', coopForm.name, { island: coopForm.island }, adminEmail); // #2
      flash(`✅ Cooperative "${coopForm.name}" added.`);
      closeModal();
    } catch (e) { flash('❌ ' + e.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(u) {
    setSaving(true);
    try {
      await deleteDoc(doc(db, 'users', u.id));
      await logAudit('delete', 'user', u.displayName || u.email || u.id, {}, adminEmail); // #2
      flash(`✅ ${u.email || u.id} removed.`);
      setConfirmDel(null);
    } catch (e) { flash('❌ ' + e.message); }
    finally { setSaving(false); }
  }

  // #9 — consistent case-insensitive search
  const filtered = useMemo(() => users.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (u.email       || '').toLowerCase().includes(q)
        || (u.displayName || '').toLowerCase().includes(q)
        || (u.island      || '').toLowerCase().includes(q);
  }), [users, search]);

  if (loading) return <div className="spinner-wrap"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header" style={{ flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div className="page-title">👤 User Management</div>
          <div className="page-subtitle">Manage Copra Inspector accounts for all outer islands</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openAddInspector} type="button">+ Add Inspector</button>
      </div>

      {msg && (
        <div className={`flash-bar ${msg.startsWith('✅') ? 'flash-success' : msg.startsWith('⚠️') ? 'flash-warn' : 'flash-error'}`}
          style={{ marginBottom: 16 }}>{msg}</div>
      )}

      <div style={{ background: 'var(--teal-dim)', border: '1px solid rgba(0,124,145,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: '0.82rem', color: 'var(--teal-light)', lineHeight: 1.6 }}>
        <strong>How it works:</strong> When you add an inspector here, a Firebase Auth account is created with the password you set. They can immediately sign into the <strong>KCDL Inspector</strong> app.
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 20 }}>
        {[
          { icon: '👥', val: users.length,                                                   lbl: 'Total Accounts',  col: 'var(--teal)'  },
          { icon: '✅', val: users.filter(u => u.provisioned !== false).length,              lbl: 'Active',          col: 'var(--green)' },
          { icon: '🏝️', val: [...new Set(users.map(u => u.island).filter(Boolean))].length,  lbl: 'Islands Covered', col: 'var(--gold)'  },
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
          <input placeholder="Search name, email, island…" value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ marginLeft: 'auto', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          {filtered.length} of {users.length} accounts
        </div>
      </div>

      {/* #7 — Empty state with CTA */}
      {users.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👤</div>
          <div className="empty-state-text">No inspector accounts yet</div>
          <div style={{ marginTop: 8, fontSize: '0.82rem', color: 'var(--text-muted)' }}>Add your first inspector to get started</div>
          <button className="btn btn-primary btn-sm" onClick={openAddInspector} type="button" style={{ marginTop: 14 }}>+ Add Inspector</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <div className="empty-state-text">No results for "{search}"</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 12px' }}>
          {filtered.map(u => (
            <button key={u.id} type="button" onClick={() => setViewUser(u)}
              style={{ background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', padding: '9px 12px', borderRadius: 8, color: 'var(--teal-light)', fontSize: '0.88rem', fontWeight: 600, transition: 'background 0.15s', display: 'flex', alignItems: 'center', gap: 8 }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--teal-dim)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              <span style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: u.role === 'admin' ? 'var(--gold)' : 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800, color: '#fff' }}>
                {(u.displayName || u.email || '?').slice(0, 2).toUpperCase()}
              </span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {u.displayName || u.email || u.id}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ══ PROFILE VIEW MODAL ══ */}
      {viewUser && (() => {
        // #6 — CPR activity for this inspector
        const userCprs    = cprs.filter(c => c.inspectorEmail === viewUser.email || c.userId === viewUser.id);
        const lastCpr     = userCprs.sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
        const lastOnlineFmt = fmtLastOnline(viewUser.lastOnline);
        return (
          <div className="modal-overlay" onClick={() => { setViewUser(null); setResetSent(false); }}>
            <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
              <div className="modal-head">
                <div className="modal-title">👤 Inspector Profile</div>
                <button className="modal-close" onClick={() => { setViewUser(null); setResetSent(false); }} type="button">✕</button>
              </div>
              <div className="modal-body">
                {/* Avatar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', flexShrink: 0, background: viewUser.role === 'admin' ? 'var(--gold)' : 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>
                    {(viewUser.displayName || viewUser.email || '?').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{viewUser.displayName || '—'}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{viewUser.email || '—'}</div>
                    <div style={{ marginTop: 5, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span className={`tbl-badge ${viewUser.role === 'admin' ? 'badge-gold' : 'badge-teal'}`} style={{ fontSize: '0.68rem' }}>
                        {viewUser.role === 'admin' ? 'Admin' : 'Copra Inspector'}
                      </span>
                      {viewUser.provisioned !== false && <span className="tbl-badge badge-green" style={{ fontSize: '0.68rem' }}>Active</span>}
                    </div>
                  </div>
                </div>

                {/* Detail rows */}
                {[
                  ['🏝️ Island',       viewUser.island || '—'],
                  ['📞 Phone',        viewUser.phone   || '—'],
                  ['💬 WhatsApp',     viewUser.whatsapp || '—'],
                  ['🗓️ Member since', viewUser.createdAt ? fmt.date(viewUser.createdAt) : '—'],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border-dim)', fontSize: '0.83rem', gap: 10 }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 600, flexShrink: 0 }}>{label}</span>
                    <span style={{ color: 'var(--text-primary)', textAlign: 'right' }}>{value}</span>
                  </div>
                ))}

                {/* Last online */}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border-dim)', fontSize: '0.83rem', gap: 10 }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600, flexShrink: 0 }}>🟢 Last online</span>
                  <span style={{ color: lastOnlineFmt ? 'var(--green)' : 'var(--text-muted)', textAlign: 'right', fontWeight: lastOnlineFmt ? 600 : 400 }}>
                    {lastOnlineFmt || 'Never recorded'}
                  </span>
                </div>

                {/* #6 — CPR activity */}
                <div style={{ marginTop: 14, background: 'var(--navy)', borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Activity</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 6 }}>
                    <span style={{ color: 'var(--text-muted)' }}>📋 CPR Sessions filed</span>
                    <strong style={{ color: 'var(--teal)' }}>{userCprs.length}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>📅 Last CPR filed</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{lastCpr ? fmt.date(lastCpr.date) : '—'}</strong>
                  </div>
                </div>

                {/* #1 — Password reset */}
                <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--navy)', borderRadius: 8 }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Account Access</div>
                  {resetSent ? (
                    <div style={{ fontSize: '0.82rem', color: 'var(--green)' }}>✅ Password reset email sent to {viewUser.email}</div>
                  ) : (
                    <button className="btn btn-secondary btn-sm" type="button"
                      onClick={() => handlePasswordReset(viewUser.email)}
                      style={{ width: '100%' }}>
                      🔑 Send Password Reset Email
                    </button>
                  )}
                </div>
              </div>
              <div className="modal-foot">
                <button className="btn btn-ghost" onClick={() => { setViewUser(null); setResetSent(false); }} type="button">Close</button>
                <button className="btn btn-secondary" onClick={() => { setViewUser(null); openEditInspector(viewUser); }} type="button">✏️ Edit</button>
                <button className="btn btn-danger" onClick={() => { setViewUser(null); setConfirmDel(viewUser); }} type="button">Remove</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ══ ADD / EDIT INSPECTOR MODAL ══ */}
      {modalType === 'inspector' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">{!editTarget ? '+ Add Inspector Account' : `Edit Inspector — ${editTarget.email || ''}`}</div>
              <button className="modal-close" onClick={closeModal} type="button">✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">Island</label>
                <select className="form-select" style={{ maxWidth: 320, ...(!inspForm.island ? { color: 'var(--text-muted)', fontStyle: 'italic' } : {}) }}
                  value={inspForm.island} onChange={e => handleIslandChange(e.target.value)}>
                  <option value="" style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>— Select Island —</option>
                  {KIRIBATI_ISLANDS.map(isl => <option key={isl} value={isl} style={{ color: 'inherit', fontStyle: 'normal' }}>{isl}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">Name of Inspector</label>
                <input className="form-input" value={inspForm.displayName}
                  onChange={e => setInsp('displayName', e.target.value)} placeholder="Full Name" />
              </div>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">Email Address *</label>
                <input className="form-input" type="email" value={inspForm.email}
                  onChange={e => setInsp('email', e.target.value)}
                  placeholder="inspector@example.com"
                  disabled={!!editTarget}
                  style={editTarget ? { opacity: 0.6, cursor: 'not-allowed' } : {}} />
                {editTarget && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>Email cannot be changed — remove and re-add if needed.</div>}
              </div>
              {!editTarget && (
                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label className="form-label">Password *
                    <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6, fontSize: '0.7rem' }}>Min 6 characters</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input className="form-input" type={showPw ? 'text' : 'password'}
                      value={inspForm.password} onChange={e => setInsp('password', e.target.value)}
                      placeholder="Set a secure password" style={{ paddingRight: 44 }} />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {showPw ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 200 }}>
                  <label className="form-label" style={{ margin: 0, whiteSpace: 'nowrap', flexShrink: 0 }}>Phone</label>
                  <input className="form-input" style={{ flex: 1 }} value={inspForm.phone}
                    onChange={e => setInsp('phone', e.target.value)} placeholder="+686 730 xxxxx" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 200 }}>
                  <label className="form-label" style={{ margin: 0, whiteSpace: 'nowrap', flexShrink: 0 }}>WhatsApp</label>
                  <input className="form-input" style={{ flex: 1 }} value={inspForm.whatsapp}
                    onChange={e => setInsp('whatsapp', e.target.value)} placeholder="+686 730 xxxxx" />
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

      {/* ══ ADD COOPERATIVE MODAL ══ */}
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
                <select className="form-select" value={coopForm.island}
                  onChange={e => setCoopForm(f => ({ ...f, island: e.target.value }))}>
                  <option value="">— Select Island —</option>
                  {KIRIBATI_ISLANDS.map(isl => <option key={isl} value={isl}>{isl}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">Cooperative Name *</label>
                <input className="form-input" value={coopForm.name}
                  onChange={e => setCoopForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Tabiteuea North Cooperative" />
                {coopForm.name && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    Auto code: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--teal)' }}>{codeFromName(coopForm.name)}</strong>
                  </div>
                )}
              </div>
              <div className="form-row form-row-2">
                <div className="form-group">
                  <label className="form-label">Contact Name</label>
                  <input className="form-input" value={coopForm.contactName}
                    onChange={e => setCoopForm(f => ({ ...f, contactName: e.target.value }))} placeholder="Full name" />
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Phone</label>
                  <input className="form-input" value={coopForm.contactPhone}
                    onChange={e => setCoopForm(f => ({ ...f, contactPhone: e.target.value }))} placeholder="+686 730 xxxxx" />
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

      {/* ══ DELETE CONFIRM ══ */}
      {confirmDel && (
        <ConfirmModal
          title="⚠️ Remove Inspector"
          body={`Are you sure you want to remove ${confirmDel.displayName || confirmDel.email || confirmDel.id}? This will revoke their access.`}
          confirmLabel="Remove" saving={saving}
          onCancel={() => setConfirmDel(null)}
          onConfirm={() => handleDelete(confirmDel)}
        />
      )}
    </div>
  );
}
