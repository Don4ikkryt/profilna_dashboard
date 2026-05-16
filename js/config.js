const CONFIG = {
  SHEETS_URL: 'https://docs.google.com/spreadsheets/d/14UFh9xr6AcG8eV7PvcBFGUabijjiWLEkZCewNDqGKF0/export?format=csv&gid=1497041357',
  APPLY_URL: 'https://docs.google.com/forms',
  MAP_CENTER: [49.0, 31.0],
  MAP_ZOOM: 6,
  CLUSTER_COLORS: {
    'STEM': '#2563eb',
    'Мовно-літературний': '#16a34a',
    'Соціально-гуманітарний': '#ea580c',
    'mixed': '#7c3aed',
    'default': '#64748b'
  },
  CLUSTER_LABELS: {
    'STEM': 'STEM',
    'Мовно-літературний': 'Мовно-літературний',
    'Соціально-гуманітарний': 'Соціально-гуманітарний'
  }
};

// Normalize string for fuzzy cluster matching
function normStr(s) {
  return (s || '').toLowerCase().trim()
    .replace(/[‐-―−]/g, '-') // normalize dashes
    .replace(/\s+/g, ' ');
}

const _clusterNormMap = Object.fromEntries(
  Object.entries(CONFIG.CLUSTER_COLORS).map(([k, v]) => [normStr(k), v])
);

function getClusterColor(name) {
  if (!name) return CONFIG.CLUSTER_COLORS.default;
  const n = normStr(name);
  if (_clusterNormMap[n]) return _clusterNormMap[n];
  // fallback: partial match
  const key = Object.keys(_clusterNormMap).find(k => n.includes(k) || k.includes(n));
  return key ? _clusterNormMap[key] : CONFIG.CLUSTER_COLORS.default;
}
