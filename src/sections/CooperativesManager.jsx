// src/sections/CooperativesManager.jsx
import { useState, useEffect, useMemo, useRef } from 'react';
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAppData } from '../context/AppDataContext';

import { KIRIBATI_ISLANDS } from '../utils/constants';

function codeFromName(name) {
  if (!name) return '';
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.slice(0, 3).map(w => w[0]).join('').toUpperCase();
}

const BLANK = { name: '', code: '', island: '', village: '', contactName: '', contactPhone: '', notes: '' };

/* ── Searchable Cooperative Picker ─────────────────────────────────────── */
function CoopSearchSelect({ coops, value, onChange, placeholder = '— Search Cooperatives —' }) {
  const [query,  setQuery]  = useState('');
  const [open,   setOpen]   = useState(false);
  const ref = useRef(null);

  const chosen = coops.find(c => c.id === value || c.name === value);
  const display = chosen ? chosen.name : '';

  const filtered = useMemo(() => {
    if (!query) return coops;
    const q = query.toLowerCase();
    return coops.filter(c =>
      (c.name   || '').toLowerCase().includes(q) ||
      (c.island || '').toLowerCase().includes(q));
  }, [coops, query]);

  // Close on outside click
  useEffect(() => {
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  function select(coop) {
    onChange(coop.name);
    setQuery('');
    setOpen(false);
  }

  function clear() { onChange(''); setQuery(''); setOpen(false); }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          className="form-input"
          value={open ? query : display}
          placeholder={placeholder}
          onFocus={() => { setOpen(true); setQuery(''); }}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          style={{
            fontStyle: !display && !open ? 'italic' : 'normal',
            color:     !display && !open ? 'var(--text-muted)' : 'inherit',
            paddingRight: 32,
          }}
        />
        {display && !open && (
          <button type="button" onClick={clear}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1rem', lineHeight: 1 }}>
            ×
          </button>
        )}
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
          zIndex: 999, maxHeight: 220, overflowY: 'auto',
        }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '10px 14px', fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              No cooperatives found
            </div>
          ) : (
            filtered.map(c => (
              <button key={c.id} type="button" onClick={() => select(c)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '9px 14px', background: 'none',
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  borderBottom: '1px solid var(--border-dim)',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--teal-dim)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <span style={{
                  width: 28, height: 28, borderRadius: 6, background: 'var(--teal)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.65rem', fontWeight: 800, color: '#fff', flexShrink: 0,
                  fontFamily: 'var(--font-mono)',
                }}>{c.code || codeFromName(c.name)}</span>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</div>
                  {c.island && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{c.island}</div>}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────────────────────── */
export default function CooperativesManager() {
  const { villages, cprEntries: cprs } = useAppData();
  const [coops,     setCoops]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(null);
  const [viewCoop,  setViewCoop]  = useState(null);
  const [form,      setForm]      = useState(BLANK);
  const [saving,    setSaving]    = useState(false);
  const [msg,       setMsg]       = useState('');
  const [search,    setSearch]    = useState('');
  const [filterIsland, setFilterIsland] = useState('');
  const [confirmDel, setConfirmDel] = useState(null);

  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'cooperatives'), s => {
      setCoops(s.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
      setVillages(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => u1();
  }, []);

  const flash = m => { setMsg(m); setTimeout(() => setMsg(''), 4000); };

  function setField(key, val) { setForm(f => ({ ...f, [key]: val })); }
  function handleNameChange(name) { setForm(f => ({ ...f, name, code: codeFromName(name) })); }

  function openAdd()   { setForm(BLANK); setModal('add'); }
  function openEdit(c) {
    setForm({ name: c.name || '', code: c.code || '', island: c.island || '', village: c.village || '', contactName: c.contactName || '', contactPhone: c.contactPhone || '', notes: c.notes || '' });
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
      return (c.name   || '').toLowerCase().includes(q) ||
             (c.island || '').toLowerCase().includes(q) ||
             (c.code   || '').toLowerCase().includes(q);
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
          { icon: '🤝', val: coops.length,  lbl: 'Cooperatives', col: 'var(--teal)'   },
          { icon: '🏝️', val: [...new Set(coops.map(c => c.island).filter(Boolean))].length, lbl: 'Islands', col: 'var(--gold)' },
          { icon: '📋', val: cprs.length,   lbl: 'CPRs Filed',   col: 'var(--purple)' },
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
          {KIRIBATI_ISLANDS.map(isl => <option key={isl} value={isl}>{isl}</option>)}
        </select>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          {filtered.length} of {coops.length}
        </div>
      </div>

      {/* Two-column clickable name list */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 12px' }}>
        {filtered.map(c => (
          <button
            key={c.id}
            type="button"
            onClick={() => setViewCoop(c)}
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
              width: 28, height: 28, borderRadius: 6, flexShrink: 0,
              background: 'var(--teal)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.6rem', fontWeight: 800, color: '#fff',
              fontFamily: 'var(--font-mono)', letterSpacing: '0.05em',
            }}>
              {c.code || codeFromName(c.name)}
            </span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {c.name}
            </span>
            {c.island && (
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic', flexShrink: 0 }}>
                {c.island}
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">🤝</div>
          <div className="empty-state-text">No cooperatives found</div>
        </div>
      )}

      {/* ══ PROFILE VIEW MODAL ══ */}
      {viewCoop && (() => {
        const c = viewCoop;
        const coopCprs = cprs.filter(r =>
          (r.cooperative_name || r.cooperativeName || r.stationId) === (c.name || c.id));
        return (
          <div className="modal-overlay" onClick={() => setViewCoop(null)}>
            <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
              <div className="modal-head">
                <div className="modal-title">🤝 Cooperative Profile</div>
                <button className="modal-close" onClick={() => setViewCoop(null)} type="button">✕</button>
              </div>
              <div className="modal-body">
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 12, flexShrink: 0,
                    background: 'var(--teal)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.95rem', fontWeight: 800, color: '#fff',
                    fontFamily: 'var(--font-mono)', letterSpacing: '0.1em',
                  }}>
                    {c.code || codeFromName(c.name)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{c.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--teal-light)', marginTop: 2 }}>{c.island || '—'}</div>
                  </div>
                </div>
                {[
                  ['📋 CPR Sessions',   coopCprs.length],
                  ['🏝️ Island',         c.island       || '—'],
                  ['🏘️ Village',        c.village      || '—'],
                  ['🏷️ Code',           c.code || codeFromName(c.name) || '—'],
                  ['👤 Contact',        c.contactName  || '—'],
                  ['📞 Phone',          c.contactPhone || '—'],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border-dim)', fontSize: '0.83rem' }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
                    <span style={{ color: 'var(--text-primary)' }}>{value}</span>
                  </div>
                ))}
                {c.notes && (
                  <div style={{ marginTop: 14, fontSize: '0.78rem', color: 'var(--text-muted)', background: 'var(--navy)', borderRadius: 8, padding: '10px 12px', lineHeight: 1.6 }}>
                    📝 {c.notes}
                  </div>
                )}
              </div>
              <div className="modal-foot">
                <button className="btn btn-ghost" onClick={() => setViewCoop(null)} type="button">Close</button>
                <button className="btn btn-secondary" onClick={() => { setViewCoop(null); openEdit(c); }} type="button">✏️ Edit</button>
                <button className="btn btn-danger" onClick={() => { setViewCoop(null); setConfirmDel(c); }} type="button">Remove</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ══ ADD / EDIT MODAL ══ */}
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
                  onChange={e => setField('island', e.target.value)}
                  style={!form.island ? { color: 'var(--text-muted)', fontStyle: 'italic' } : {}}>
                  <option value="" style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>— Select Island —</option>
                  {KIRIBATI_ISLANDS.map(isl => <option key={isl} value={isl} style={{ color: 'inherit', fontStyle: 'normal' }}>{isl}</option>)}
                </select>
              </div>

              {/* Village */}
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">Village</label>
                <select className="form-select" value={form.village}
                  onChange={e => setField('village', e.target.value)}
                  style={!form.village ? { color: 'var(--text-muted)', fontStyle: 'italic' } : {}}>
                  <option value="" style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>— Select Village —</option>
                  {villages
                    .filter(v => !form.island || v.island === form.island)
                    .map(v => <option key={v.id} value={v.name} style={{ color: 'inherit', fontStyle: 'normal' }}>{v.name}</option>)}
                </select>
              </div>

              {/* Name */}
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

              {/* Code */}
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

              {/* Contact */}
              <div style={{ display: 'flex', gap: 14, marginBottom: 14, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 180 }}>
                  <label className="form-label" style={{ margin: 0, whiteSpace: 'nowrap', flexShrink: 0 }}>Contact Name</label>
                  <input className="form-input" style={{ flex: 1 }} value={form.contactName}
                    onChange={e => setField('contactName', e.target.value)} placeholder="Full name" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 180 }}>
                  <label className="form-label" style={{ margin: 0, whiteSpace: 'nowrap', flexShrink: 0 }}>Phone</label>
                  <input className="form-input" style={{ flex: 1 }} value={form.contactPhone}
                    onChange={e => setField('contactPhone', e.target.value)} placeholder="+686 730 xxxxx" />
                </div>
              </div>

              {/* Notes */}
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-textarea" rows={3} value={form.notes}
                  onChange={e => setField('notes', e.target.value)} placeholder="Optional notes…" />
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

      {/* ══ DELETE CONFIRM ══ */}
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

export { CoopSearchSelect };
