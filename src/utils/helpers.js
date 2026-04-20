// src/utils/helpers.js

export const fmt = {
  kg:   v => `${(+v || 0).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`,
  kgShort: v => `${(+v || 0).toFixed(2)} kg`,
  num:  v => (+v || 0).toLocaleString('en'),
  date: iso => {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }); }
    catch { return iso; }
  },
  datetime: iso => {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }); }
    catch { return iso; }
  },
  time12: t => {
    if (!t) return '—';
    const [h, m] = t.split(':').map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'}`;
  },
  initials: email => (email || '?').slice(0, 2).toUpperCase(),
};

export function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const k = item[key] || 'Unknown';
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {});
}

export function sumField(arr, field) {
  return arr.reduce((s, item) => s + (parseFloat(item[field]) || 0), 0);
}

export function sortDesc(arr, field) {
  return [...arr].sort((a, b) => {
    const av = a[field] || '';
    const bv = b[field] || '';
    return av < bv ? 1 : av > bv ? -1 : 0;
  });
}

export const STATUS_LABELS = {
  recently_weighed: 'Recently Weighed',
  in_shed:          'In Shed',
  in_warehouse:     'In Warehouse',
  ready_to_ship:    'Ready to Ship',
  shipped:          'Shipped',
};

export const STATUS_BADGE = {
  recently_weighed: 'badge-amber',
  in_shed:          'badge-teal',
  in_warehouse:     'badge-purple',
  ready_to_ship:    'badge-green',
  shipped:          'badge-muted',
};

export function csvExport(rows, filename) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const lines = [
    keys.join(','),
    ...rows.map(r => keys.map(k => `"${(r[k] ?? '').toString().replace(/"/g, '""')}"`).join(','))
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
