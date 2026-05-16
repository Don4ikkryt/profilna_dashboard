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

function getClusterColor(name) {
  if (!name) return CONFIG.CLUSTER_COLORS.default;
  const n = name.toLowerCase();
  if (n.includes('stem'))                               return CONFIG.CLUSTER_COLORS['STEM'];
  if (n.includes('літератур') || n.includes('мовно'))  return CONFIG.CLUSTER_COLORS['Мовно-літературний'];
  if (n.includes('соціально') || n.includes('гуманіт')) return CONFIG.CLUSTER_COLORS['Соціально-гуманітарний'];
  return CONFIG.CLUSTER_COLORS.default;
}
