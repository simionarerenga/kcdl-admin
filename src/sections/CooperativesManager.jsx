// src/sections/CooperativesManager.jsx
import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

function codeFromName(name) {
  if (!name) return '';
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.slice(0, 3).map(w => w[0]).join('').toUpperCase();
}

const BLANK = { name: '', code: '', island: '', contactName: '', contactPhone: '', notes: '' };

export default function CooperativesManager() {
  const [coops,    setCoops]    = useState([]);
  const [islands,  setIslands]  = useState([]);
  const [cprs,     setCprs]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(null);  // null | 'add' | coop-obj
  const [form,     setForm]     = useState(BLANK);
  const [saving,   setSaving]   = useState(false);
  const [msg,      setMsg]      = useState('');
  const [search,   setSearch]   = useState('');
  const [filterIsland, setFilterIsland] = useState('');
  const [confirmDel, setConfirmDel] = useState(null);

  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'cooperatives'), s => {
      setCoops(s.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    const u2 = onSnapshot(collection(db, 'islands'), s =>
      setIslands(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const u3 = onSnapshot(collection(db, 'cprEntries'), s =>
      setCprs(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { u1(); u2(); u3(); };
  }, []);

  const flash = m => { setMsg(m); setTimeout(() => setMsg(''), 4000); };

  const islandList = useMemo(() => {
    const fromIslands = islands.map(i => i.name).filter(Boolean);
    const fromCoops   = coops.map(c => c.island).filter(Boolean);
    return [...new Set([...fromIslands, ...fromCoops])].sort();
  }, [islands, coops]);

  function setField(key, val) { setForm(f => ({ ...f, [key]: val })); }

  function handleNameChange(name) {
    setForm(f => ({ ...f, name, code: codeFromName(name) }));
  }

  function openAdd()   { setForm(BLANK); setModal('add'); }
  function openEdit(c) {
    setForm({ name: c.name||'', code: c.code||'', island: c.island||'', contactName: c.contactName||'', contactPhone: c.contactPhone||'', notes: c.notes||'' });
    setModal(c);
  }

  async function handleSave() {
    if (!form.name.trim())   { flash('⚠️ Cooperative name is required.'); return; }
    if (!form.island.trim()) { flash('⚠️ Island is required.');           return; }
    setSaving(true);
    try {
      const data = { ...form, code: form.code || codeFromName(form.name) };
      if (modal === 'add') {
        await addDoc(collection(db, 'cooperatives'), { ...data, createdAt: new Date().toISOString() });
        flash('✅ Cooperative added.');
      } else {
        await updateDoc(doc(db, 'cooperatives', modal.id), { ...data, updatedAt: new Date().toISOString() });
        flash('✅ Cooperative updated.');
      }
      setModal(null);
    } catch (e) { flash('❌ ' + e.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(c) {
    setSaving(true);
    try {
      await deleteDoc(doc(db, 'cooperatives', c.id));
      flash(`✅ ${c.name} removed.`);
      setConfirmDel(null);
    } catch (e) { flash('❌ ' + e.message); }
    finally { setSaving(false); }
  }

  const filtered = useMemo(() => {
    return coops.filter(c => {
      if (filterIsland && c.island !== filterIsland) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (c.name   ||'').toLowerCase().includes(q) ||
             (c.island ||'').toLowerCase().includes(q) ||
             (c.code   ||'').toLowerCase().includes(q);
    });
  }, [coops, search, filterIsland]);

  if (loading) return <div className="spinner-wrap"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">🤝 Cooperatives</div>
          <div className="page-subtitle">Registry of all copra cooperatives by island</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openAdd} type="button">+ Add Cooperative</button>
      </div>

      {msg && (
        <div className={`flash-bar ${msg.startsWith('✅') ? 'flash-success' : msg.startsWith('⚠️') ? 'flash-warn' : 'flash-error'}`}
          style={{ marginBottom: 16 }}>{msg}</div>
      )}

      {/* Stats */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 20 }}>
        {[
          { icon: '🤝', val: coops.length,    lbl: 'Cooperatives',   col: 'var(--teal)'   },
          { icon: '🏝️', val: [...new Set(coops.map(c => c.island).filter(Boolean))].length, lbl: 'Islands',  col: 'var(--gold)' },
          { icon: '📋', val: cprs.length,     lbl: 'CPRs Filed',     col: 'var(--purple)' },
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
          <input placeholder="Search cooperative name, island, code…" value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-select" style={{ width: 'auto', minWidth: 140, fontSize: '0.83rem' }}
          value={filterIsland} onChange={e => setFilterIsland(e.target.value)}>
          <option value="">🏝️ All Islands</option>
          {islandList.map(isl => <option key={isl} value={isl}>{isl}</option>)}
        </select>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          {filtered.length} of {coops.length}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {filtered.map(c => {
          const coopCprs = cprs.filter(r => (r.cooperative_name || r.cooperativeName || r.stationId) === (c.name || c.id));
          return (
            <div key={c.id} className="card">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, background: 'var(--teal)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.85rem', fontWeight: 800, color: '#fff',
                  fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', flexShrink: 0,
                }}>
                  {c.code || codeFromName(c.name)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.2 }}>
                    {c.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--teal-light)', marginTop: 2 }}>{c.island || '—'}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)} type="button">Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => setConfirmDel(c)} type="button">×</button>
                </div>
              </div>
              <div className="divider" style={{ margin: '10px 0' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  ['📋 CPR Sessions', coopCprs.length],
                  ['👤 Contact', c.contactName || '—'],
                  ['📞 Phone', c.contactPhone || '—'],
                  ['🏷️ Code', c.code || codeFromName(c.name) || '—'],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{k}</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 2 }}>{v}</div>
                  </div>
                ))}
              </div>
              {c.notes && (
                <div style={{ marginTop: 10, fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--navy)', borderRadius: 6, padding: '8px 10px', lineHeight: 1.5 }}>
                  📝 {c.notes}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">🤝</div>
          <div className="empty-state-text">No cooperatives found</div>
        </div>
      )}

      {/* Add / Edit modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="modal-head">
              <div className="modal-title">{modal === 'add' ? '🤝 Add Cooperative' : `Edit Cooperative — ${modal.name}`}</div>
              <button className="modal-close" onClick={() => setModal(null)} type="button">✕</button>
            </div>
            <div className="modal-body">

              {/* Island */}
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">Island *</label>
                <select className="form-select" value={form.island}
                  onChange={e => setField('island', e.target.value)}>
                  <option value="">— Select Island —</option>
                  {islandList.map(isl => <option key={isl} value={isl}>{isl}</option>)}
                </select>
              </div>

              {/* Cooperative Name */}
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">Cooperative Name *</label>
                <input className="form-input" value={form.name}
                  onChange={e => handleNameChange(e.target.value)}
                  placeholder="e.g. Tabiteuea North Cooperative" />
                {form.name && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    Auto code: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--teal)' }}>{codeFromName(form.name)}</strong>
                  </div>
                )}
              </div>

              {/* Code — inline */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <label className="form-label" style={{ margin: 0, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  Code <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.7rem' }}>Auto · 3 initials</span>
                </label>
                <input className="form-input"
                  style={{ width: 80, fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', fontWeight: 700, textAlign: 'center' }}
                  value={form.code}
                  onChange={e => setField('code', e.target.value.toUpperCase().slice(0, 3))}
                  placeholder="TAB" maxLength={3} />
              </div>

              {/* Contact — side by side */}
              <div style={{ display: 'flex', gap: 14, marginBottom: 14, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 180 }}>
                  <label className="form-label" style={{ margin: 0, whiteSpace: 'nowrap', flexShrink: 0 }}>Contact Name</label>
                  <input className="form-input" style={{ flex: 1 }} value={form.contactName}
                    onChange={e => setField('contactName', e.target.value)}
                    placeholder="Full name" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 180 }}>
                  <label className="form-label" style={{ margin: 0, whiteSpace: 'nowrap', flexShrink: 0 }}>Phone</label>
                  <input className="form-input" style={{ flex: 1 }} value={form.contactPhone}
                    onChange={e => setField('contactPhone', e.target.value)}
                    placeholder="+686 730 xxxxx" />
                </div>
              </div>

              {/* Notes */}
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-textarea" rows={3} value={form.notes}
                  onChange={e => setField('notes', e.target.value)}
                  placeholder="Optional notes…" />
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setModal(null)} type="button">Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving} type="button">
                {saving ? '…Saving' : modal === 'add' ? '✓ Add Cooperative' : '✓ Save Changes'}
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
              <div className="modal-title">⚠️ Remove Cooperative</div>
              <button className="modal-close" onClick={() => setConfirmDel(null)} type="button">✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Are you sure you want to remove <strong style={{ color: 'var(--text-primary)' }}>{confirmDel.name}</strong>?
                Existing CPR records referencing this cooperative are not affected.
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
