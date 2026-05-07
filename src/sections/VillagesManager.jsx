// src/sections/VillagesManager.jsx
import { useState, useMemo } from 'react';
import { collection, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAppData } from '../context/AppDataContext';

import { KIRIBATI_ISLANDS } from '../utils/constants';

const BLANK = { name: '', island: '', notes: '' };

export default function VillagesManager() {
  const { villages, loading } = useAppData();
  const [modal,      setModal]      = useState(null);   // null | 'add' | village-obj
  const [viewVillage,setViewVillage]= useState(null);
  const [form,       setForm]       = useState(BLANK);
  const [saving,     setSaving]     = useState(false);
  const [msg,        setMsg]        = useState('');
  const [search,     setSearch]     = useState('');
  const [filterIsland, setFilterIsland] = useState('');
  const [confirmDel, setConfirmDel] = useState(null);

  const flash = m => { setMsg(m); setTimeout(() => setMsg(''), 4000); };

  function openAdd()     { setForm(BLANK); setModal('add'); }
  function openEdit(v)   {
    setForm({ name: v.name || '', island: v.island || '', notes: v.notes || '' });
    setModal(v);
  }

  async function handleSave() {
    if (!form.name.trim())   { flash('⚠️ Village name is required.'); return; }
    if (!form.island.trim()) { flash('⚠️ Island is required.');        return; }
    setSaving(true);
    try {
      if (modal === 'add') {
        await addDoc(collection(db, 'villages'), { ...form, createdAt: new Date().toISOString() });
        flash('✅ Village added.');
      } else {
        await updateDoc(doc(db, 'villages', modal.id), { ...form, updatedAt: new Date().toISOString() });
        flash('✅ Village updated.');
      }
      setModal(null);
    } catch (e) { flash('❌ ' + e.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(v) {
    setSaving(true);
    try {
      await deleteDoc(doc(db, 'villages', v.id));
      flash(`✅ ${v.name} removed.`);
      setConfirmDel(null);
    } catch (e) { flash('❌ ' + e.message); }
    finally { setSaving(false); }
  }

  const filtered = useMemo(() => {
    return villages.filter(v => {
      if (filterIsland && v.island !== filterIsland) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (v.name   || '').toLowerCase().includes(q) ||
             (v.island || '').toLowerCase().includes(q);
    });
  }, [villages, search, filterIsland]);

  if (loading) return <div className="spinner-wrap"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">🏘️ Villages</div>
          <div className="page-subtitle">Registry of all villages belonging to outer islands</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openAdd} type="button">+ Add Village</button>
      </div>

      {msg && (
        <div className={`flash-bar ${msg.startsWith('✅') ? 'flash-success' : msg.startsWith('⚠️') ? 'flash-warn' : 'flash-error'}`}
          style={{ marginBottom: 16 }}>{msg}</div>
      )}

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 20 }}>
        {[
          { icon: '🏘️', val: villages.length, lbl: 'Total Villages', col: 'var(--teal)'   },
          { icon: '🏝️', val: [...new Set(villages.map(v => v.island).filter(Boolean))].length, lbl: 'Islands', col: 'var(--gold)'   },
          { icon: '🗺️', val: [...new Set(villages.map(v => v.island).filter(Boolean))].length > 0 ? (villages.length / [...new Set(villages.map(v => v.island).filter(Boolean))].length).toFixed(1) : 0, lbl: 'Avg per Island', col: 'var(--purple)' },
        ].map(s => (
          <div key={s.lbl} className="stat-card" style={{ '--accent-color': s.col }}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-value" style={{ fontSize: '1.8rem' }}>{s.val}</div>
            <div className="stat-label">{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="toolbar" style={{ marginBottom: 16, gap: 10 }}>
        <div className="search-bar" style={{ flex: 1 }}>
          <input placeholder="Search village name or island…" value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-select" style={{ width: 'auto', minWidth: 140, fontSize: '0.83rem' }}
          value={filterIsland} onChange={e => setFilterIsland(e.target.value)}>
          <option value="">🏝️ All Islands</option>
          {KIRIBATI_ISLANDS.map(isl => <option key={isl} value={isl}>{isl}</option>)}
        </select>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          {filtered.length} of {villages.length}
        </div>
      </div>

      {/* Two-column clickable name list */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 12px' }}>
        {filtered.map(v => (
          <button
            key={v.id}
            type="button"
            onClick={() => setViewVillage(v)}
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
              background: 'var(--teal)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.75rem',
            }}>🏘️</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {v.name}
            </span>
            {v.island && (
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic', flexShrink: 0 }}>
                {v.island}
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">🏘️</div>
          <div className="empty-state-text">No villages found</div>
        </div>
      )}

      {/* ══ PROFILE VIEW MODAL ══ */}
      {viewVillage && (
        <div className="modal-overlay" onClick={() => setViewVillage(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-head">
              <div className="modal-title">🏘️ Village Profile</div>
              <button className="modal-close" onClick={() => setViewVillage(null)} type="button">✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--teal)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.4rem',
                }}>🏘️</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{viewVillage.name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--teal-light)', marginTop: 2 }}>{viewVillage.island || '—'}</div>
                </div>
              </div>
              {[
                ['🏝️ Island', viewVillage.island || '—'],
                ['📝 Notes',  viewVillage.notes  || '—'],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border-dim)', fontSize: '0.83rem', gap: 12 }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600, flexShrink: 0 }}>{label}</span>
                  <span style={{ color: 'var(--text-primary)', textAlign: 'right' }}>{value}</span>
                </div>
              ))}
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setViewVillage(null)} type="button">Close</button>
              <button className="btn btn-secondary" onClick={() => { setViewVillage(null); openEdit(viewVillage); }} type="button">✏️ Edit</button>
              <button className="btn btn-danger" onClick={() => { setViewVillage(null); setConfirmDel(viewVillage); }} type="button">Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ ADD / EDIT MODAL ══ */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-head">
              <div className="modal-title">{modal === 'add' ? '🏘️ Add Village' : `Edit Village — ${modal.name}`}</div>
              <button className="modal-close" onClick={() => setModal(null)} type="button">✕</button>
            </div>
            <div className="modal-body">
              {/* Island */}
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">Island *</label>
                <select className="form-select" value={form.island}
                  onChange={e => setForm(f => ({ ...f, island: e.target.value }))}
                  style={!form.island ? { color: 'var(--text-muted)', fontStyle: 'italic' } : {}}>
                  <option value="" style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>— Select Island —</option>
                  {KIRIBATI_ISLANDS.map(isl => <option key={isl} value={isl} style={{ color: 'inherit', fontStyle: 'normal' }}>{isl}</option>)}
                </select>
              </div>
              {/* Name */}
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">Village Name *</label>
                <input className="form-input" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Buariki" autoFocus />
              </div>
              {/* Notes */}
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-textarea" rows={3} value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional notes…" />
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setModal(null)} type="button">Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving} type="button">
                {saving ? '…Saving' : modal === 'add' ? '✓ Add Village' : '✓ Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ DELETE CONFIRM ══ */}
      {confirmDel && (
        <div className="modal-overlay" onClick={() => setConfirmDel(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 360 }}>
            <div className="modal-head">
              <div className="modal-title">⚠️ Remove Village</div>
              <button className="modal-close" onClick={() => setConfirmDel(null)} type="button">✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Are you sure you want to remove <strong style={{ color: 'var(--text-primary)' }}>{confirmDel.name}</strong>?
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
