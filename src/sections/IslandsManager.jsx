// src/sections/IslandsManager.jsx
import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

const BLANK = { name: '', region: '', notes: '' };

export default function IslandsManager() {
  const [islands,  setIslands]  = useState([]);
  const [cprs,     setCprs]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(null);   // null | 'add' | island-obj
  const [form,     setForm]     = useState(BLANK);
  const [saving,   setSaving]   = useState(false);
  const [msg,      setMsg]      = useState('');
  const [search,   setSearch]   = useState('');
  const [confirmDel, setConfirmDel] = useState(null);

  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'islands'), s => {
      setIslands(s.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    const u2 = onSnapshot(collection(db, 'cprEntries'), s =>
      setCprs(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { u1(); u2(); };
  }, []);

  const flash = m => { setMsg(m); setTimeout(() => setMsg(''), 4000); };

  function openAdd()    { setForm(BLANK); setModal('add'); }
  function openEdit(il) { setForm({ name: il.name||'', region: il.region||'', notes: il.notes||'' }); setModal(il); }

  async function handleSave() {
    if (!form.name.trim()) { flash('⚠️ Island name is required.'); return; }
    setSaving(true);
    try {
      if (modal === 'add') {
        await addDoc(collection(db, 'islands'), { ...form, createdAt: new Date().toISOString() });
        flash('✅ Island added.');
      } else {
        await updateDoc(doc(db, 'islands', modal.id), { ...form, updatedAt: new Date().toISOString() });
        flash('✅ Island updated.');
      }
      setModal(null);
    } catch (e) { flash('❌ ' + e.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(il) {
    setSaving(true);
    try {
      await deleteDoc(doc(db, 'islands', il.id));
      flash(`✅ ${il.name} removed.`);
      setConfirmDel(null);
    } catch (e) { flash('❌ ' + e.message); }
    finally { setSaving(false); }
  }

  const filtered = useMemo(() => {
    if (!search) return islands;
    const q = search.toLowerCase();
    return islands.filter(il =>
      (il.name   ||'').toLowerCase().includes(q) ||
      (il.region ||'').toLowerCase().includes(q));
  }, [islands, search]);

  if (loading) return <div className="spinner-wrap"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">🏝️ Islands</div>
          <div className="page-subtitle">Registry of all outer islands in operations</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openAdd} type="button">+ Add Island</button>
      </div>

      {msg && (
        <div className={`flash-bar ${msg.startsWith('✅') ? 'flash-success' : msg.startsWith('⚠️') ? 'flash-warn' : 'flash-error'}`}
          style={{ marginBottom: 16 }}>{msg}</div>
      )}

      {/* Stats */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 20 }}>
        {[
          { icon: '🏝️', val: islands.length, lbl: 'Total Islands', col: 'var(--teal)' },
          { icon: '📋', val: cprs.length,    lbl: 'CPRs Filed',    col: 'var(--gold)' },
          { icon: '🗺️', val: [...new Set(islands.map(i => i.region).filter(Boolean))].length, lbl: 'Regions', col: 'var(--purple)' },
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
          <input placeholder="Search island name or region…" value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ marginLeft: 'auto', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          {filtered.length} of {islands.length} islands
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {filtered.map(il => {
          const ilCprs = cprs.filter(c => c.island === il.name);
          return (
            <div key={il.id} className="card">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                <div style={{ fontSize: '2rem', flexShrink: 0 }}>🏝️</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                    {il.name}
                  </div>
                  {il.region && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{il.region}</div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(il)} type="button">Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => setConfirmDel(il)} type="button">×</button>
                </div>
              </div>
              <div className="divider" style={{ margin: '10px 0' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  ['📋 CPRs Filed', ilCprs.length],
                  ['⚖️ Total Weight', `${(ilCprs.reduce((s,c)=>s+(parseFloat(c.total_weight_cpr)||0),0)/1000).toFixed(2)} t`],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{k}</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>{v}</div>
                  </div>
                ))}
              </div>
              {il.notes && (
                <div style={{ marginTop: 10, fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--navy)', borderRadius: 6, padding: '8px 10px', lineHeight: 1.5 }}>
                  📝 {il.notes}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">🏝️</div>
          <div className="empty-state-text">No islands found</div>
        </div>
      )}

      {/* Add / Edit modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-head">
              <div className="modal-title">{modal === 'add' ? '🏝️ Add Island' : `Edit Island — ${modal.name}`}</div>
              <button className="modal-close" onClick={() => setModal(null)} type="button">✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">Island Name *</label>
                <input className="form-input" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Tabiteuea" autoFocus />
              </div>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">Region</label>
                <input className="form-input" value={form.region}
                  onChange={e => setForm(f => ({ ...f, region: e.target.value }))}
                  placeholder="e.g. Gilbert Islands" />
              </div>
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
                {saving ? '…Saving' : modal === 'add' ? '✓ Add Island' : '✓ Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDel && (
        <div className="modal-overlay" onClick={() => setConfirmDel(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 360 }}>
            <div className="modal-head">
              <div className="modal-title">⚠️ Remove Island</div>
              <button className="modal-close" onClick={() => setConfirmDel(null)} type="button">✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Are you sure you want to remove <strong style={{ color: 'var(--text-primary)' }}>{confirmDel.name}</strong>?
                Existing records referencing this island are not affected.
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
